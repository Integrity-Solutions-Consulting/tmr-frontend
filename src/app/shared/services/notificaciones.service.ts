import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface EmpleadoPendiente {
  idEmpleado: number;
  nombre: string;
  email: string | null;
  horasEsperadas: number;
  horasRegistradas: number;
  horasFaltantes: number;
  ultimoAvisoManual: string | null;
}

export interface PendientesResponse {
  inicioPeriodo: string;
  finPeriodo: string;
  empleados: EmpleadoPendiente[];
}

export interface NotificarRequest {
  empleadoIds: number[];
}

/** Respuesta 202: la solicitud quedó en cola, el resultado real se consulta con getEstado. */
export interface NotificarResponse {
  mensaje: string;
  solicitados: number;
  solicitadoEnMs: number;
}

export type EstadoEnvio = 'Pendiente' | 'Enviado' | 'Fallido' | 'Omitido';

export interface EstadoEmpleado {
  idEmpleado: number;
  estado: EstadoEnvio;
  detalle: string | null;
}

export interface EstadoNotificacionResponse {
  completo: boolean;
  empleados: EstadoEmpleado[];
}

@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private http = inject(HttpClient);
  
  // Apunta a la ruta base de tu controlador / group map
  private apiUrl = `${environment.apiUrl}/notificaciones`;

  /**
   * Obtiene la lista de empleados que deben horas en el período en curso
   */
  getPendientes(): Observable<PendientesResponse> {
    return this.http.get<PendientesResponse>(`${this.apiUrl}/pendientes`);
  }

  /**
   * El Líder Técnico fuerza el envío del correo de notificación a los empleados indicados
   * @param request Contiene los IDs de los empleados
   */
  notificar(request: NotificarRequest): Observable<NotificarResponse> {
    return this.http.post<NotificarResponse>(`${this.apiUrl}/notificar`, request);
  }

  /**
   * Resultado de los avisos pedidos por el usuario actual desde `desdeMs`
   * (el `solicitadoEnMs` que devolvió notificar).
   */
  getEstado(empleadoIds: number[], desdeMs: number): Observable<EstadoNotificacionResponse> {
    let params = new HttpParams().set('desdeMs', desdeMs);
    for (const id of empleadoIds) {
      params = params.append('empleadoIds', id);
    }
    return this.http.get<EstadoNotificacionResponse>(`${this.apiUrl}/estado`, { params });
  }
}
