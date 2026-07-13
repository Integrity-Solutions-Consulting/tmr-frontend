import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpHandler, HttpRequest, HttpEvent, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Interceptor que extrae automáticamente el campo 'data' de todas las respuestas ApiResponse
 * Transforma ApiResponse<T> -> T para simplificar el manejo en servicios y componentes
 */
@Injectable()
export class ApiResponseInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(req).pipe(
      map((event: HttpEvent<unknown>) => {
        if (event instanceof HttpResponse && event.body && typeof event.body === 'object') {
          const body = event.body as any;

          // Si la respuesta tiene la estructura de ApiResponse<T>
          if ('success' in body && 'data' in body && 'statusCode' in body && 'message' in body) {

            // ── Fix puntual para /auth/login ──────────────────────────────────
            // El backend puede devolver debeCambiarPassword en el wrapper raíz
            // (fuera de data). El interceptor descartaría ese campo al extraer
            // solo body.data. Este bloque lo rescata SOLO para el login, sin
            // afectar ningún otro endpoint del sistema.
            if (req.url.includes('/auth/login')) {
              const data = body.data || {};

              // Solo fusionar si viene en el wrapper pero NO dentro de data
              if (
                body.debeCambiarPassword !== undefined &&
                data.debeCambiarPassword === undefined
              ) {
                return event.clone({
                  body: {
                    ...data,
                    debeCambiarPassword: body.debeCambiarPassword,
                  },
                });
              }

              // Si ya viene dentro de data, extraer normalmente
              return event.clone({ body: data });
            }
            // ── Fin fix /auth/login ───────────────────────────────────────────

            // Comportamiento original para TODOS los demás endpoints (sin cambios)
            return event.clone({
              body: body.data || body,
            });
          }
        }
        return event;
      })
    );
  }
}
