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
  private idEmpleadoActual = 1; // TODO: obtener del auth service

  public readonly actividades = this._actividades.asReadonly();

  constructor() {
    this.cargarActividades();
  }

  cargarActividades() {
    this.http.get<any[]>(`${environment.apiUrl}/time-report/actividades`).subscribe({
      next: (data) => {
        const mapeadas = data.map(dto => ({
          id: dto.id?.toString() || Math.random().toString(),
          idempleado: dto.idempleado,
          idproyecto: dto.idproyecto,
          idtipoactividad: dto.idtipoactividad,
          codigorequerimiento: dto.codigorequerimiento || '',
          cantidadhoras: dto.cantidadhoras || 0,
          fechaactividad: new Date(dto.fechaactividad),
          descripcionactividad: dto.descripcionactividad || '',
          notas: dto.notas,
          esbillable: dto.esbillable ?? true,
          activo: dto.activo ?? true,
          // Propiedades derivadas para visualización
          nroHoras: dto.cantidadhoras || 0,
          colaborador: dto.colaborador || 'Empleado',
          proyecto: dto.proyecto || 'Proyecto',
          cliente: dto.cliente
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
      .filter(a => this.mismaFecha(a.fechaactividad, hoy) && a.activo)
      .reduce((acc, curr) => acc + curr.cantidadhoras, 0);
  });

  public readonly horasMesActual = computed(() => {
    const hoy = new Date();
    return this._actividades()
      .filter(a => {
        const fecha = a.fechaactividad instanceof Date ? a.fechaactividad : new Date(a.fechaactividad);
        return fecha.getMonth() === hoy.getMonth() &&
          fecha.getFullYear() === hoy.getFullYear() &&
          a.activo;
      })
      .reduce((acc, curr) => acc + curr.cantidadhoras, 0);
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
      .filter(a => {
        const fecha = a.fechaactividad instanceof Date ? a.fechaactividad : new Date(a.fechaactividad);
        return fecha >= inicioSemana && fecha <= finSemana && a.activo;
      })
      .reduce((acc, curr) => acc + curr.cantidadhoras, 0);
  });

  public readonly horasPorRegistrar = computed(() => {
    const objetivo = 8;
    return Math.max(0, objetivo - this.horasRegistradasHoy());
  });

  // === Methods ===
  getActividadesPorFecha(fecha: Date): Actividad[] {
    return this._actividades().filter(a => this.mismaFecha(a.fechaactividad, fecha) && a.activo);
  }

  agregarActividad(data: any): void {
    const url = `${environment.apiUrl}/time-report/actividades`;
    
    const crearPayload = (fecha: Date | string) => ({
      idempleado: this.idEmpleadoActual,
      idproyecto: data.idproyecto || data.proyectoId,
      idtipoactividad: data.idtipoactividad || data.tipoActividadId,
      codigorequerimiento: data.codigoRequerimiento || data.codigorequerimiento || 'REQ-001',
      cantidadhoras: data.numeroHoras || data.cantidadhoras || 0,
      fechaactividad: typeof fecha === 'string' ? fecha : new Date(fecha).toISOString().split('T')[0],
      descripcionactividad: data.descripcion || data.descripcionactividad || 'Sin descripción',
      notas: data.notas || '',
      esbillable: data.esbillable ?? true,
      usuariocreacion: 'frontend_user',
      ipcreacion: 'unknown'
    });

    if (data.esRecurrente && data.fechaInicio && data.fechaFin) {
      const inicio = new Date(data.fechaInicio);
      const fin = new Date(data.fechaFin);
      const cur = new Date(inicio);
      while (cur <= fin) {
        const esFDS = cur.getDay() === 0 || cur.getDay() === 6;
        const esFeriado = data.incluirFeriados ? false : this.esFeriado(cur);
        
        if ((data.incluirFinesDeSemana || !esFDS) && !esFeriado) {
          const payload = crearPayload(cur);
          this.http.post(url, payload).subscribe({
            next: () => this.cargarActividades(),
            error: (err) => console.error('Error creating recurrent activity', err)
          });
        }
        cur.setDate(cur.getDate() + 1);
      }
    } else {
      const payload = crearPayload(data.fechaActividad || new Date());
      this.http.post(url, payload).subscribe({
        next: () => {
          this.cargarActividades();
        },
        error: (err) => console.error('Error creating activity', err)
      });
    }
  }

  private esFeriado(fecha: Date): boolean {
    // TODO: integrar con servicio de feriados
    return false;
  }

  private mismaFecha(a: Date | string, b: Date): boolean {
    const dateA = a instanceof Date ? a : new Date(a);
    return (
      dateA.getDate() === b.getDate() &&
      dateA.getMonth() === b.getMonth() &&
      dateA.getFullYear() === b.getFullYear()
    );
  }
}
