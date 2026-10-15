import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PendientesResponse {
  mensaje: string;
  datos: number[]; // Cambia 'number' por la interfaz real si el backend retorna objetos
}

export interface NotificarRequest {
  empleadoIds: number[];
}

export interface NotificarResponse {
  mensaje: string;
  enviados: number;
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
}