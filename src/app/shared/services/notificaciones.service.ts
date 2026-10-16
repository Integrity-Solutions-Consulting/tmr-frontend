import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TokenService } from '../../features/auth/servicios/token.service';

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
  /** Rango del filtro de Seguimiento (yyyy-MM-dd). Sin rango, el backend usa la quincena en curso hasta ayer. */
  fechaDesde?: string;
  fechaHasta?: string;
}

/** Respuesta 202: la solicitud quedó en cola, el resultado real llega por streamEstado (o getEstado). */
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

/** Eventos de GET /notificaciones/estado/stream: un "estado" por empleado y "fin" cuando ya no queda nada pendiente. */
export type EventoEstadoStream =
  | { tipo: 'estado'; estado: EstadoEmpleado }
  | { tipo: 'fin' };

export type EstadoEnvioCorte = 'Enviado' | 'Fallido' | 'Omitido' | 'Pendiente';

export interface EmpleadoCorte {
  idEmpleado: number;
  nombre: string;
  estado: EstadoEnvioCorte;
  horasFaltantes: number;
  detalle: string | null;
  fecha: string | null;
}

/** Resumen del último corte automático (flujo 1), tal como lo arma el backend. */
export interface ResumenCorte {
  fechaCorte: string;
  inicioPeriodo: string;
  finPeriodo: string;
  enProceso: boolean;
  enviados: number;
  fallidos: number;
  omitidos: number;
  pendientes: number;
  empleados: EmpleadoCorte[];
}

/** Un evento leído de un stream SSE: nombre del evento y su data (texto crudo). */
interface EventoSse {
  evento: string;
  data: string;
}

@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private http = inject(HttpClient);
  private tokenService = inject(TokenService);

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
   * (el `solicitadoEnMs` que devolvió notificar). Se usa como respaldo si el stream SSE no está disponible.
   */
  getEstado(empleadoIds: number[], desdeMs: number): Observable<EstadoNotificacionResponse> {
    let params = new HttpParams().set('desdeMs', desdeMs);
    for (const id of empleadoIds) {
      params = params.append('empleadoIds', id);
    }
    return this.http.get<EstadoNotificacionResponse>(`${this.apiUrl}/estado`, { params });
  }

  /**
   * Server-Sent Events con el resultado de los avisos: el backend empuja cada estado en cuanto lo registra.
   * El Observable termina al recibir "fin" o al cerrarse la conexión, y falla si la respuesta no es 2xx.
   */
  streamEstado(empleadoIds: number[], desdeMs: number): Observable<EventoEstadoStream> {
    const params = new URLSearchParams({ desdeMs: String(desdeMs) });
    for (const id of empleadoIds) params.append('empleadoIds', String(id));

    return new Observable<EventoEstadoStream>(subscriber => {
      const sub = this.leerSse(`${this.apiUrl}/estado/stream?${params}`).subscribe({
        next: ({ evento, data }) => {
          if (evento === 'fin') {
            subscriber.next({ tipo: 'fin' });
            subscriber.complete();
            return;
          }
          const estado = evento === 'estado' ? this.parsearJson<EstadoEmpleado>(data) : null;
          if (estado) subscriber.next({ tipo: 'estado', estado });
        },
        error: err => subscriber.error(err),
        complete: () => subscriber.complete(),
      });
      return () => sub.unsubscribe();
    });
  }

  /**
   * Server-Sent Events con el resumen del último corte automático: al conectarse llega el corte más reciente
   * (aunque haya pasado mientras el usuario no estaba) y luego cada cambio mientras se procesa.
   * Emite null si no hubo cortes recientes. La conexión queda abierta hasta cancelar la suscripción.
   */
  streamCortes(): Observable<ResumenCorte | null> {
    return new Observable<ResumenCorte | null>(subscriber => {
      const sub = this.leerSse(`${this.apiUrl}/cortes/stream`).subscribe({
        next: ({ evento, data }) => {
          if (evento === 'corte') subscriber.next(this.parsearJson<ResumenCorte>(data));
        },
        error: err => subscriber.error(err),
        complete: () => subscriber.complete(),
      });
      return () => sub.unsubscribe();
    });
  }

  /**
   * Lee un endpoint SSE con fetch: EventSource no permite enviar el header Authorization.
   * Usa el mismo token que JwtInterceptor (sessionStorage, con respaldo en localStorage).
   */
  private leerSse(url: string): Observable<EventoSse> {
    return new Observable<EventoSse>(subscriber => {
      const controller = new AbortController();
      const headers: Record<string, string> = { Accept: 'text/event-stream' };
      const token = this.tokenService.getToken() ?? localStorage.getItem('accessToken');
      if (token) headers['Authorization'] = `Bearer ${token}`;

      fetch(url, { headers, signal: controller.signal, cache: 'no-store' })
        .then(async respuesta => {
          if (!respuesta.ok || !respuesta.body) {
            throw new Error(`El stream ${url} respondió ${respuesta.status}`);
          }
          const lector = respuesta.body.pipeThrough(new TextDecoderStream()).getReader();
          let buffer = '';
          while (!subscriber.closed) {
            const { value, done } = await lector.read();
            if (done) break;
            buffer += value.replace(/\r/g, '');
            let corte: number;
            while ((corte = buffer.indexOf('\n\n')) >= 0) {
              const evento = this.parsearBloque(buffer.slice(0, corte));
              buffer = buffer.slice(corte + 2);
              if (evento) subscriber.next(evento);
            }
          }
          subscriber.complete();
        })
        .catch(err => {
          if (!controller.signal.aborted) subscriber.error(err);
        });

      return () => controller.abort();
    });
  }

  private parsearBloque(bloque: string): EventoSse | null {
    let evento = 'message';
    const datos: string[] = [];
    for (const linea of bloque.split('\n')) {
      if (linea.startsWith('event:')) evento = linea.slice(6).trim();
      else if (linea.startsWith('data:')) datos.push(linea.slice(5).trimStart());
    }
    return datos.length === 0 && evento === 'message' ? null : { evento, data: datos.join('\n') };
  }

  private parsearJson<T>(data: string): T | null {
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }
}
