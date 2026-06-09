import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Actividad } from '../models/actividad.model';
import { AuthService } from '../../features/auth/servicios/auth.service';
import { environment } from '../../../environments/environment';
import { FeriadosService } from './feriados.service';

@Injectable({ providedIn: 'root' })
export class ActividadesService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private feriadosService = inject(FeriadosService);
  private apiUrl = `${environment.apiUrl}/time-report/actividades`;

  private _actividades = signal<Actividad[]>([]);
  public readonly actividades = this._actividades.asReadonly();

  // Signals para métricas
  private _horasRegistradasHoy = signal<number>(0);
  public readonly horasRegistradasHoy = this._horasRegistradasHoy.asReadonly();

  private _horasMesActual = signal<number>(0);
  public readonly horasMesActual = this._horasMesActual.asReadonly();

  private _horasSemanaActual = signal<number>(0);
  public readonly horasSemanaActual = this._horasSemanaActual.asReadonly();

  private _horasPorRegistrar = signal<number>(0);
  public readonly horasPorRegistrar = this._horasPorRegistrar.asReadonly();

  cargarResumen(): void {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    const empId = user.idEmpleado ?? user.id;
    this.http.get<any>(`${this.apiUrl}/resumen?idEmpleado=${empId}`).subscribe({
      next: (res) => {
        this._horasPorRegistrar.set(res.horasPorRegistrar);
        this._horasRegistradasHoy.set(res.horasRegistradas); // Simplificación
        this._horasSemanaActual.set(res.horasSemana);
        this._horasMesActual.set(res.horasMes);
      },
      error: (err) => console.error('Error al cargar resumen', err)
    });
  }

  cargarCalendario(anio: number, mes: number): void {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    const empId = user.idEmpleado ?? user.id;
    this.http.get<any[]>(`${this.apiUrl}/calendario?idEmpleado=${empId}&anio=${anio}&mes=${mes}`).subscribe({
      next: (data) => {
        const mapped = (data || []).map(item => ({
          id: String(item.id),
          idempleado: item.idEmpleado,
          idproyecto: item.idProyecto,
          proyectoNombre: item.proyectoNombre || 'Sin Proyecto',
          idtipoactividad: item.idTipoActividad,
          tipoActividadNombre: item.tipoActividadNombre || 'Otro',
          codigorequerimiento: item.codigoRequerimiento || '',
          fechaactividad: new Date(item.fechaActividad + 'T00:00:00'),
          cantidadhoras: item.cantidadHoras,
          descripcionactividad: item.descripcionActividad || '',
          notas: item.notas || '',
          esbillable: item.esBillable ?? true
        } as Actividad));
        this._actividades.set(mapped);
      },
      error: (err) => console.error('Error al cargar calendario', err)
    });
  }

  getActividadesPorFecha(fecha: Date): any[] {
    return this._actividades().filter((a: any) => this.mismaFecha(a.fechaactividad, fecha));
  }

  agregarActividad(data: any, callback?: () => void): void {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    if (data.esRecurrente && data.fechaInicio && data.fechaFin) {
      const parseLocal = (d: any) => {
        if (d instanceof Date) return new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const parts = String(d).split('T')[0].split('-');
        if (parts.length === 3) {
          return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        }
        return new Date(d);
      };

      const inicio = parseLocal(data.fechaInicio);
      const fin = parseLocal(data.fechaFin);
      const cur = new Date(inicio);

      const requests: any[] = [];
      while (cur <= fin) {
        const esFDS = cur.getDay() === 0 || cur.getDay() === 6;
        const esFeriado = data.incluirFeriados ? false : this.feriadosService.esFeriado(cur);

        if ((data.incluirFinesDeSemana || !esFDS) && !esFeriado) {
          const payload = {
            idEmpleado: user.idEmpleado ?? Number(user.id),
            idProyecto: data.proyectoId,
            idTipoActividad: Number(data.tipoActividad),
            codigoRequerimiento: data.codigoRequerimiento,
            cantidadHoras: data.horasPorDia,
            fechaActividad: `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`,
            descripcionActividad: data.descripcion,
            notas: data.notas || '',
            esBillable: data.esbillable ?? true
          };
          requests.push(this.http.post(this.apiUrl, payload));
        }
        cur.setDate(cur.getDate() + 1);
      }

      if (requests.length > 0) {
        let completed = 0;
        requests.forEach(req => {
          req.subscribe({
            next: () => {
              completed++;
              if (completed === requests.length) {
                this.cargarResumen();
                const actDate = parseLocal(data.fechaInicio);
                this.cargarCalendario(actDate.getFullYear(), actDate.getMonth() + 1);
                if (callback) callback();
              }
            },
            error: (err: any) => console.error('Error al crear actividad recurrente', err)
          });
        });
      } else {
        if (callback) callback();
      }
    } else {
      const payload = {
        idEmpleado: user.idEmpleado ?? Number(user.id),
        idProyecto: data.proyectoId,
        idTipoActividad: Number(data.tipoActividad),
        codigoRequerimiento: data.codigoRequerimiento,
        cantidadHoras: data.numeroHoras,
        fechaActividad: new Date(data.fechaActividad).toISOString().split('T')[0],
        descripcionActividad: data.descripcion,
        notas: data.notas || '',
        esBillable: data.esbillable ?? true
      };

      this.http.post(this.apiUrl, payload).subscribe({
        next: (res) => {
          this.cargarResumen();
          const actDate = new Date(data.fechaActividad);
          this.cargarCalendario(actDate.getFullYear(), actDate.getMonth() + 1);
          if (callback) callback();
        },
        error: (err) => console.error('Error al crear actividad', err)
      });
    }
  }

  actualizarActividad(id: number | string, data: any, callback?: () => void): void {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    const payload = {
      idProyecto: data.proyectoId,
      idTipoActividad: Number(data.tipoActividad),
      codigoRequerimiento: data.codigoRequerimiento,
      cantidadHoras: data.numeroHoras,
      fechaActividad: new Date(data.fechaActividad).toISOString().split('T')[0],
      descripcionActividad: data.descripcion,
      notas: data.notas || '',
      esBillable: data.esbillable ?? true
    };

    this.http.put(`${this.apiUrl}/${id}`, payload).subscribe({
      next: () => {
        this.cargarResumen();
        const actDate = new Date(data.fechaActividad);
        this.cargarCalendario(actDate.getFullYear(), actDate.getMonth() + 1);

        if (callback) callback();
      },
      error: (err) => console.error('Error al actualizar actividad', err)
    });
  }

  eliminarActividad(id: number | string, callback?: () => void): void {
    this.http.delete(`${this.apiUrl}/${id}`).subscribe({
      next: () => {
        this.cargarResumen();
        // Recargar el calendario actual
        const hoy = new Date();
        this.cargarCalendario(hoy.getFullYear(), hoy.getMonth() + 1);

        if (callback) callback();
      },
      error: (err) => console.error('Error al eliminar actividad', err)
    });
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
