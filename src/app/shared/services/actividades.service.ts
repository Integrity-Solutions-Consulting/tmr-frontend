import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Actividad } from '../models/actividad.model';
import { AuthService } from '../../features/auth/servicios/auth.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ActividadesService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
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

    this.http.get<any>(`${this.apiUrl}/resumen?idEmpleado=${user.id}`).subscribe({
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

    this.http.get<any[]>(`${this.apiUrl}/calendario?idEmpleado=${user.id}&anio=${anio}&mes=${mes}`).subscribe({
      next: (data) => {
        const mapped = (data || []).map(item => ({
          id: '',
          tipoActividad: 'Otro',
          proyectoId: '',
          proyectoNombre: '',
          codigoRequerimiento: '',
          fechaActividad: new Date(item.fecha + 'T00:00:00'),
          numeroHoras: item.totalHoras,
          esRecurrente: false
        } as any));
        this._actividades.set(mapped);
      },
      error: (err) => console.error('Error al cargar calendario', err)
    });
  }

  getActividadesPorFecha(fecha: Date): any[] {
    return this._actividades().filter((a: any) => this.mismaFecha(new Date(a.fechaActividad || a.fechaactividad), fecha));
  }

  agregarActividad(data: any, callback?: () => void): void {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    const payload = {
      idEmpleado: user.id,
      idProyecto: data.proyectoId,
      idTipoActividad: data.tipoActividad, // Suponiendo que es el ID en realidad
      codigoRequerimiento: data.codigoRequerimiento,
      cantidadHoras: data.horasPorDia || data.numeroHoras,
      fechaActividad: new Date(data.fechaActividad).toISOString().split('T')[0],
      descripcionActividad: data.descripcion,
      notas: '',
      esBillable: true
    };

    this.http.post(this.apiUrl, payload).subscribe({
      next: (res) => {
        this.cargarResumen();
        // Recargar el calendario del mes de la actividad agregada
        const actDate = new Date(data.fechaActividad);
        this.cargarCalendario(actDate.getFullYear(), actDate.getMonth() + 1);

        if (callback) callback();
      },
      error: (err) => console.error('Error al crear actividad', err)
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
