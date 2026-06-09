import { Injectable, inject } from '@angular/core';
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
            // Extraer y retornar solo el data
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
