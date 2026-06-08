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

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.tokenService.getToken() ?? localStorage.getItem('accessToken');

    let clonedReq = req;
    if (token && !req.headers.has('Authorization')) {
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
