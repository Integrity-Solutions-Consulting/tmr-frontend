import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Actividad } from '../models/actividad.model';
import { AuthService } from '../../features/auth/servicios/auth.service';
import { environment } from '../../../environments/environment';
import { FeriadosService } from './feriados.service';
import { ResumenHorasDto } from '../../core/models/actividades.interface';

@Injectable({ providedIn: 'root' })
export class ActividadesService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private feriadosService = inject(FeriadosService);
  private apiUrl = `${environment.apiUrl}/time-report/actividades`;

  private _actividades = signal<Actividad[]>([]);
  public readonly actividades = this._actividades.asReadonly();

  // Variables de estado del mes activo en el calendario
  private currentAnio = signal<number>(new Date().getFullYear());
  private currentMes = signal<number>(new Date().getMonth() + 1);

  // Signals para métricas
  // sm - Se comentan las métricas anteriores (horas de hoy, semana y mes): Actividades ahora muestra las mismas
  // métricas que Seguimiento, calculadas por el backend para el mes que muestra el calendario.
  // private _horasRegistradasHoy = signal<number>(0);
  // public readonly horasRegistradasHoy = this._horasRegistradasHoy.asReadonly();
  //
  // private _horasMesActual = signal<number>(0);
  // public readonly horasMesActual = this._horasMesActual.asReadonly();
  //
  // private _horasSemanaActual = signal<number>(0);
  // public readonly horasSemanaActual = this._horasSemanaActual.asReadonly();

  private _horasPorRegistrar = signal<number>(0);
  public readonly horasPorRegistrar = this._horasPorRegistrar.asReadonly();

  private _horasRegistradas = signal<number>(0);
  public readonly horasRegistradas = this._horasRegistradas.asReadonly();

  private _promedioPorDia = signal<number>(0);
  public readonly promedioPorDia = this._promedioPorDia.asReadonly();

  // sm - idEmpleadoOverride permite pedir el resumen de OTRO colaborador (usado por el modal de solo-lectura de Seguimiento),
  // en vez de siempre usar al usuario logueado.
  cargarResumen(anio?: number, mes?: number, idEmpleadoOverride?: number): void {
    const empId = this.empleadoObjetivo(idEmpleadoOverride);
    if (!empId) {
      // sm - Sin empleado no hay horas que mostrar: las métricas quedan en 0.
      this._horasPorRegistrar.set(0);
      this._horasRegistradas.set(0);
      this._promedioPorDia.set(0);
      return;
    }
    let url = `${this.apiUrl}/resumen?idEmpleado=${empId}`;
    if (anio && mes) {
      url += `&anio=${anio}&mes=${mes}`;
    }
    this.http.get<ResumenHorasDto>(url).subscribe({
      next: (res) => {
        // sm - Si no hay registros, las métricas quedan en 0 (no en guion).
        this._horasPorRegistrar.set(Number(res?.horasPorRegistrar ?? 0));
        this._horasRegistradas.set(Number(res?.horasRegistradas ?? 0));
        this._promedioPorDia.set(Number(res?.promedioPorDia ?? 0));
      },
      error: (err) => console.error('Error al cargar resumen', err)
    });
  }

  // sm - idEmpleadoOverride permite pedir el calendario de OTRO colaborador (usado por el modal de solo-lectura de Seguimiento),
  // en vez de siempre usar al usuario logueado.
  cargarCalendario(anio: number, mes: number, idEmpleadoOverride?: number): void {
    this.currentAnio.set(anio);
    this.currentMes.set(mes);
    const empId = this.empleadoObjetivo(idEmpleadoOverride);
    if (!empId) {
      this._actividades.set([]);
      return;
    }
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

  // sm - Empleado a consultar: el indicado (modal de Seguimiento) o el empleado del usuario de la sesión.
  // Se quitó el respaldo "user.id": es el id de USUARIO, no de empleado, y podía mostrar los datos de otra persona.
  private empleadoObjetivo(idEmpleadoOverride?: number): number | undefined {
    return idEmpleadoOverride ?? this.authService.getCurrentUser()?.idEmpleado ?? undefined;
  }

  getActividadesPorFecha(fecha: Date): any[] {
    return this._actividades().filter((a: any) => this.mismaFecha(a.fechaactividad, fecha));
  }

  // sm - Mensaje del backend para mostrarlo en pantalla (ej. "No está asignado a este proyecto...").
  private mensajeError(err: any, porDefecto: string): string {
    const e = err?.error;
    if (typeof e === 'string' && e.trim()) return e;
    return e?.mensaje ?? e?.Mensaje ?? e?.detail ?? e?.message ?? e?.title ?? porDefecto;
  }

  // sm - errorCallback: se llama con el mensaje si el backend rechaza el registro, para que la ventana lo muestre.
  agregarActividad(data: any, callback?: () => void, errorCallback?: (mensaje: string, guardadas: number) => void): void {
    // sm - Solo se registran actividades a nombre del empleado de la sesión (el backend también lo valida).
    const idEmpleado = this.empleadoObjetivo();
    if (!idEmpleado) {
      console.error('El usuario de la sesión no tiene un colaborador asociado; no puede registrar actividades.');
      return;
    }

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
            idEmpleado,
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
        // sm - Se espera a que terminen todos los días: si alguno falla se informa cuántos sí se guardaron y por qué
        // fallaron los demás (antes el error solo quedaba en la consola).
        let completed = 0;
        let guardadas = 0;
        let primerError: string | null = null;
        const alTerminar = () => {
          if (completed < requests.length) return;
          this.cargarResumen(this.currentAnio(), this.currentMes());
          const actDate = parseLocal(data.fechaInicio);
          this.cargarCalendario(actDate.getFullYear(), actDate.getMonth() + 1);
          if (primerError === null) {
            if (callback) callback();
          } else if (errorCallback) {
            const fallidas = requests.length - guardadas;
            errorCallback(
              guardadas > 0
                ? `Se guardaron ${guardadas} de ${requests.length} días. ${fallidas} no se guardaron: ${primerError}`
                : primerError,
              guardadas,
            );
          }
        };
        requests.forEach(req => {
          req.subscribe({
            next: () => {
              completed++;
              guardadas++;
              alTerminar();
            },
            error: (err: any) => {
              console.error('Error al crear actividad recurrente', err);
              completed++;
              primerError ??= this.mensajeError(err, 'No se pudo guardar la actividad.');
              alTerminar();
            }
          });
        });
      } else {
        if (callback) callback();
      }
    } else {
      const payload = {
        idEmpleado,
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
          this.cargarResumen(this.currentAnio(), this.currentMes());
          const actDate = new Date(data.fechaActividad);
          this.cargarCalendario(actDate.getFullYear(), actDate.getMonth() + 1);
          if (callback) callback();
        },
        error: (err) => {
          console.error('Error al crear actividad', err);
          if (errorCallback) errorCallback(this.mensajeError(err, 'No se pudo guardar la actividad. Intente de nuevo.'), 0);
        }
      });
    }
  }

  actualizarActividad(id: number | string, data: any, callback?: () => void, errorCallback?: (mensaje: string) => void): void {
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
        this.cargarResumen(this.currentAnio(), this.currentMes());
        const actDate = new Date(data.fechaActividad);
        this.cargarCalendario(actDate.getFullYear(), actDate.getMonth() + 1);

        if (callback) callback();
      },
      error: (err) => {
        console.error('Error al actualizar actividad', err);
        if (errorCallback) errorCallback(this.mensajeError(err, 'No se pudo actualizar la actividad. Intente de nuevo.'));
      }
    });
  }

  eliminarActividad(id: number | string, callback?: () => void, errorCallback?: (err: any) => void): void {
    this.http.delete(`${this.apiUrl}/${id}`).subscribe({
      next: () => {
        this.cargarResumen(this.currentAnio(), this.currentMes());
        // Recargar el calendario actual
        const hoy = new Date();
        this.cargarCalendario(hoy.getFullYear(), hoy.getMonth() + 1);

        if (callback) callback();
      },
      error: (err) => {
        console.error('Error al eliminar actividad', err);
        if (errorCallback) errorCallback(err);
      }
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
