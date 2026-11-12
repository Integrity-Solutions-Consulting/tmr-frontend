import { Injectable, inject } from '@angular/core';
import { HttpInterceptor, HttpHandler, HttpRequest, HttpEvent, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CambiosDatosService } from '../../shared/services/cambios-datos.service';

// sm - Rutas cuyos guardados cambian las horas de Seguimiento/Dashboard: asignaciones (proyectos), colaboradores
// (ingreso, salida, tipo de contrato), actividades (incluida la carga por Excel) y feriados.
const RUTAS_QUE_AFECTAN_HORAS =
  /\/(proyectos|colaboradores|time-report\/actividades|carga-actividades|configuracion\/dias-festivos)(\/|\?|$)/;

/**
 * sm - Avisa a las demás pestañas (CambiosDatosService) cuando un POST/PUT/PATCH/DELETE a esas rutas termina bien.
 * Se hace aquí para no tener que acordarse de avisar en cada servicio que guarda.
 */
@Injectable()
export class CambiosDatosInterceptor implements HttpInterceptor {
  private cambiosDatos = inject(CambiosDatosService);

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (req.method === 'GET' || !RUTAS_QUE_AFECTAN_HORAS.test(req.url)) return next.handle(req);

    return next.handle(req).pipe(
      tap(event => {
        if (event instanceof HttpResponse && event.ok) this.cambiosDatos.notificar();
      })
    );
  }
}
