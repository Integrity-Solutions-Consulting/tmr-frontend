import { Injectable, computed, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

  constructor() {
    this.cargarActividades();
  }

  cargarActividades() {
    this.http.get<any[]>(`${environment.apiUrl}/carga-actividades`).subscribe({
      next: (data) => {
        const mapeadas = data.map(dto => ({
          id: dto.id?.toString() || Math.random().toString(),
          tipoActividad: 'Desarrollo' as any,
          proyectoId: dto.idproyecto?.toString() || '',
          proyectoNombre: 'Proyecto ' + dto.idproyecto,
          codigoRequerimiento: dto.codigorequerimiento || '',
          descripcion: dto.descripcionactividad || '',
          fechaActividad: new Date(dto.fechaactividad),
          numeroHoras: dto.cantidadhoras || 0,
          esRecurrente: false
        }));
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
        IdEmpleado: 1, // mock user id for now
        IdProyecto: 1, // backend requires int
        IdTipoActividad: 1, // backend requires int
        CodigoRequerimiento: data.codigoRequerimiento || "REQ-001",
        CantidadHoras: data.horasPorDia || data.numeroHoras || 0,
        FechaActividad: data.fechaActividad ? new Date(data.fechaActividad).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        DescripcionActividad: data.descripcion || "Sin descripcion",
        Notas: "",
        EsBillable: true
    };

    if (data.esRecurrente && data.fechaInicio && data.fechaFin) {
      const inicio = new Date(data.fechaInicio);
      const fin = new Date(data.fechaFin);
      const cur = new Date(inicio);
      while (cur <= fin) {
        const esFDS = cur.getDay() === 0 || cur.getDay() === 6;
        if (!esFDS || data.incluirFinesDeSemana) {
          const recPayload = { ...payload, FechaActividad: new Date(cur).toISOString().split('T')[0] };
          this.http.post(url, recPayload).subscribe({
            next: () => this.cargarActividades(),
            error: (err) => console.error('Error creating recurrente', err)
          });
        }
        cur.setDate(cur.getDate() + 1);
      }
    } else {
      this.http.post(url, payload).subscribe({
        next: () => this.cargarActividades(),
        error: (err) => console.error('Error creating activity', err)
      });
    }
  }

  private nombreProyecto(id: string): string {
    const map: Record<string, string> = {
      p1: 'Proyecto bolsa de empleo',
      p2: 'Middleware Fábrica de software',
      p3: 'Accesos Fábrica de software',
      p4: 'Arquitectura Fábrica de software',
      p5: 'DESARROLLO DE APLICACIONES NAOS'
    };
    return map[id] || id;
  }

  private mismaFecha(a: Date, b: Date): boolean {
    return (
      a.getDate() === b.getDate() &&
      a.getMonth() === b.getMonth() &&
      a.getFullYear() === b.getFullYear()
    );
  }
}
