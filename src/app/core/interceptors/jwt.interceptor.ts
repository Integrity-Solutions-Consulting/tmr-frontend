import { Injectable, inject } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TokenService } from '../../features/auth/servicios/token.service';
import { Router } from '@angular/router';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  private readonly tokenService = inject(TokenService);
  private readonly router = inject(Router);

  // Endpoints públicos que NO deben incluir el token JWT
  private readonly publicEndpoints = [
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/refresh-token',
  ];

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.tokenService.getToken() ?? localStorage.getItem('accessToken');
    const isPublicEndpoint = this.publicEndpoints.some((endpoint) =>
      req.url.includes(endpoint)
    );

    let clonedReq = req;
    // Solo añadir token si:
    // 1. Existe un token válido
    // 2. No es un endpoint público
    // 3. El header Authorization no existe
    if (token && !isPublicEndpoint && !req.headers.has('Authorization')) {
      clonedReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

    return next.handle(clonedReq).pipe(
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          if (!req.url.includes('/auth/login')) {
            console.warn('Sesión expirada o no autorizada (401). Redirigiendo a login...');
            this.tokenService.clear();
            this.router.navigate(['/auth/login']);
          }
        }
        return throwError(() => error);
      })
    );
  }
}
