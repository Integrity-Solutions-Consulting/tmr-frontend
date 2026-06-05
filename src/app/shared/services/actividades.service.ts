import { Injectable, computed, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Actividad } from '../models/actividad.model';

const HOY = new Date();
const MES = HOY.getMonth();
const ANIO = HOY.getFullYear();

@Injectable({ providedIn: 'root' })
export class ActividadesService {
  private http = inject(HttpClient);
  private _actividades = signal<Actividad[]>([]);
  public readonly actividades = this._actividades.asReadonly();

  private idEmpleadoActual: number = 13; // Fallback to 13 (Mario Salgado)
  private listadoProyectos: any[] = [];

  constructor() {
    this.inicializarDatos();
    this.cargarActividades();
  }

  private inicializarDatos() {
    // 1. Resolve employee ID based on current logged in user's email
    const userJson = localStorage.getItem('currentUser');
    const user = userJson ? JSON.parse(userJson) : null;
    const userEmail = user?.email || 'dev@tmr.com';

    this.http.get<any[]>(`${environment.apiUrl}/colaboradores`).subscribe({
      next: (colabs) => {
        const match = colabs.find(c => c.email && c.email.toLowerCase() === userEmail.toLowerCase());
        if (match) {
          this.idEmpleadoActual = match.id;
        } else if (colabs.length > 0) {
          this.idEmpleadoActual = colabs[0].id;
        }
      },
      error: (err) => console.error('Error loading colaboradores for activities:', err)
    });

    // 2. Fetch projects to map names in the calendar/list
    this.http.get<any[]>(`${environment.apiUrl}/proyectos`).subscribe({
      next: (projs) => {
        this.listadoProyectos = projs || [];
        this.cargarActividades();
      },
      error: (err) => console.error('Error loading projects for activities:', err)
    });
  }

  cargarActividades() {
    this.http.get<any[]>(`${environment.apiUrl}/carga-actividades`).subscribe({
      next: (data) => {
        const mapeadas = data
          .filter(dto => dto.idempleado === this.idEmpleadoActual)
          .map(dto => {
            const proj = this.listadoProyectos.find(p => p.id === dto.idproyecto);
            return {
              id: dto.id?.toString() || Math.random().toString(),
              tipoActividad: 'Desarrollo' as any,
              proyectoId: dto.idproyecto?.toString() || '',
              proyectoNombre: proj ? proj.nombre : ('Proyecto ' + dto.idproyecto),
              codigoRequerimiento: dto.codigorequerimiento || '',
              descripcion: dto.descripcionactividad || '',
              fechaActividad: (() => {
                const parts = (dto.fechaactividad || '').split('-');
                if (parts.length === 3) {
                  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                }
                return new Date(dto.fechaactividad);
              })(),
              numeroHoras: dto.cantidadhoras || 0,
              esRecurrente: false
            };
          });
        this._actividades.set(mapeadas);
      },
      error: (err) => console.error('Error cargando actividades', err)
    });
  }

  // === Computed signals ===
  public readonly horasRegistradasHoy = computed(() => {
    const hoy = new Date();
    return this._actividades()
      .filter(a => this.mismaFecha(a.fechaActividad, hoy))
      .reduce((acc, curr) => acc + curr.numeroHoras, 0);
  });

  public readonly horasMesActual = computed(() => {
    const hoy = new Date();
    return this._actividades()
      .filter(a =>
        a.fechaActividad.getMonth() === hoy.getMonth() &&
        a.fechaActividad.getFullYear() === hoy.getFullYear()
      )
      .reduce((acc, curr) => acc + curr.numeroHoras, 0);
  });

  public readonly horasSemanaActual = computed(() => {
    const hoy = new Date();
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - hoy.getDay());
    inicioSemana.setHours(0, 0, 0, 0);
    const finSemana = new Date(inicioSemana);
    finSemana.setDate(inicioSemana.getDate() + 6);
    finSemana.setHours(23, 59, 59, 999);
    return this._actividades()
      .filter(a => a.fechaActividad >= inicioSemana && a.fechaActividad <= finSemana)
      .reduce((acc, curr) => acc + curr.numeroHoras, 0);
  });

  public readonly horasPorRegistrar = computed(() => {
    const objetivo = 8;
    return Math.max(0, objetivo - this.horasRegistradasHoy());
  });

  // === Methods ===
  getActividadesPorFecha(fecha: Date): Actividad[] {
    return this._actividades().filter(a => this.mismaFecha(a.fechaActividad, fecha));
  }

  agregarActividad(data: any): void {
    const url = `${environment.apiUrl}/time-report/actividades`;
    const payload = {
        IdEmpleado: this.idEmpleadoActual,
        IdProyecto: Number(data.proyectoId) || (this.listadoProyectos.length > 0 ? this.listadoProyectos[0].id : 2),
        IdTipoActividad: 1, // Default activity type ID (Desarrollo)
        CodigoRequerimiento: data.codigoRequerimiento || "REQ-001",
        CantidadHoras: data.esRecurrente ? (data.horasPorDia || 0) : (data.numeroHoras || 0),
        FechaActividad: this.formatFechaLocal(data.fechaActividad ? new Date(data.fechaActividad) : new Date()),
        DescripcionActividad: data.descripcion || "Sin descripcion",
        Notas: "",
        EsBillable: true
    };

    if (data.esRecurrente && data.fechaInicio && data.fechaFin) {
      const inicio = new Date(data.fechaInicio);
      const fin = new Date(data.fechaFin);
      const cur = new Date(inicio);
      const requests = [];
      while (cur <= fin) {
        const esFDS = cur.getDay() === 0 || cur.getDay() === 6;
        if (!esFDS || data.incluirFinesDeSemana) {
          const recPayload = { ...payload, FechaActividad: this.formatFechaLocal(cur) };
          requests.push(this.http.post(url, recPayload));
        }
        cur.setDate(cur.getDate() + 1);
      }
      if (requests.length > 0) {
        forkJoin(requests).subscribe({
          next: () => this.cargarActividades(),
          error: (err) => console.error('Error creating recurrent activities', err)
        });
      }
    } else {
      this.http.post(url, payload).subscribe({
        next: () => this.cargarActividades(),
        error: (err) => console.error('Error creating activity', err)
      });
    }
  }

  private nombreProyecto(id: string): string {
    const proj = this.listadoProyectos.find(p => p.id?.toString() === id || p.codigo === id);
    return proj ? proj.nombre : id;
  }

  private mismaFecha(a: Date, b: Date): boolean {
    return (
      a.getDate() === b.getDate() &&
      a.getMonth() === b.getMonth() &&
      a.getFullYear() === b.getFullYear()
    );
  }

  private formatFechaLocal(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
