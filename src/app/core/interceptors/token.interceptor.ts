import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable()
export class TokenInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    // Token temporal para pruebas (genéralo en Scalar con el register).
    // OJO: esto es SOLO para desarrollo. Cuando exista login real,
    // el token saldrá del usuario logueado.
    const token = environment.tokenPruebas;

    // Solo agregamos el token a las llamadas que van a nuestro backend.
    if (token && req.url.startsWith(environment.apiUrl)) {
      const reqConToken = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
      return next.handle(reqConToken);
    }

    // Las demás llamadas pasan sin cambios.
    return next.handle(req);
  }
}