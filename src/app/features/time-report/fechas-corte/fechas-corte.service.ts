import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export type TipoCorte = 'Quincena' | 'FinDeMes';

/** EnProceso = la fecha ya llegó y el backend lo está ejecutando (es el único estado que no se puede editar). */
export type EstadoCorte = 'Programado' | 'EnProceso' | 'Ejecutado' | 'NoEjecutado';

export interface CorteProgramado {
  id: number;
  anio: number;
  mes: number;
  tipo: TipoCorte;
  /** yyyy-MM-dd */
  inicioPeriodo: string;
  finPeriodo: string;
  /** Hora de Ecuador con su zona, p. ej. "2026-10-15T18:00:00-05:00" */
  fechaCorte: string;
  fechaPorDefecto: string;
  modificada: boolean;
  estado: EstadoCorte;
  /** También true para cortes ya ejecutados: se pueden reprogramar y se vuelven a ejecutar. */
  editable: boolean;
  puedeRestablecer: boolean;
  /** Rango de días (yyyy-MM-dd) que acepta el backend para mover el corte */
  fechaMinima: string;
  fechaMaxima: string;
  fechaEjecucion: string | null;
  fechaModificacion: string | null;
  modificadoPor: string | null;
}

export interface CortesProgramadosResponse {
  /** NotificacionHoras:Habilitado del backend: si es false no se ejecuta ningún corte */
  habilitado: boolean;
  cortes: CorteProgramado[];
}

/**
 * Fechas de corte de la notificación automática de horas faltantes (flujo 3).
 * El backend exige el permiso NOTIFICACIONES_CONFIGURAR (módulo "Fechas de Corte").
 */
@Injectable({ providedIn: 'root' })
export class FechasCorteService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/notificaciones/cortes/programados`;

  listar(): Observable<CortesProgramadosResponse> {
    return this.http.get<CortesProgramadosResponse>(this.base);
  }

  /** fechaCorte con la zona de Ecuador, p. ej. "2026-10-30T18:00:00-05:00" */
  cambiarFecha(id: number, fechaCorte: string): Observable<CortesProgramadosResponse> {
    return this.http.put<CortesProgramadosResponse>(`${this.base}/${id}`, { fechaCorte });
  }

  restablecer(id: number): Observable<CortesProgramadosResponse> {
    return this.http.post<CortesProgramadosResponse>(`${this.base}/${id}/restablecer`, {});
  }
}
