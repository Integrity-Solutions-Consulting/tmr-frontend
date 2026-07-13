import { Injectable, inject } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, switchMap, filter, take } from 'rxjs/operators';
import { AuthService } from '../../features/auth/servicios/auth.service';
import { TokenService } from '../../features/auth/servicios/token.service';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

@Injectable()
export class TokenInterceptor implements HttpInterceptor {
  private authService = inject(AuthService);
  private tokenService = inject(TokenService);
  private router = inject(Router);
  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    // Agregar credenciales y token
    const token = this.tokenService.getToken();

    let reqToSend = req.clone({
      withCredentials: true
    });

    // Agregar Authorization header si hay token y no es un endpoint de auth
    if (token && req.url.startsWith(environment.apiUrl) && !this.isAuthEndpoint(req.url)) {
      reqToSend = reqToSend.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(reqToSend).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && !this.isAuthEndpoint(error.url)) {
          return this.handle401Error(reqToSend, next);
        }
        return throwError(() => error);
      })
    );
  }

  /**
   * Maneja errores 401 intentando refrescar el token
   */
  private handle401Error(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return this.authService.refreshTokenRequest().pipe(
        switchMap((response) => {
          this.isRefreshing = false;
          this.authService.updateTokens(response);
          this.refreshTokenSubject.next(response.accessToken);

          // Reintentar request original con nuevo token
          const newToken = this.tokenService.getToken();
          return next.handle(
            request.clone({
              setHeaders: {
                Authorization: `Bearer ${newToken}`
              }
            })
          );
        }),
        catchError((err) => {
          this.isRefreshing = false;
          this.tokenService.clear();
          this.router.navigate(['/auth/login'], {
            queryParams: { reason: 'token-refresh-failed' }
          });
          return throwError(() => err);
        })
      );
    } else {
      // Si ya está refrescando, esperar a que termine
      return this.refreshTokenSubject.pipe(
        filter(token => token != null),
        take(1),
        switchMap((token) => {
          return next.handle(
            request.clone({
              setHeaders: {
                Authorization: `Bearer ${token}`
              }
            })
          );
        }),
        catchError((err) => {
          this.tokenService.clear();
          this.router.navigate(['/auth/login']);
          return throwError(() => err);
        })
      );
    }
  }

  /**
   * Verifica si la URL es un endpoint de autenticación
   */
  private isAuthEndpoint(url: string | null): boolean {
    if (!url) return false;
    return url.includes('/auth/login') ||
           url.includes('/auth/register') ||
           url.includes('/auth/forgot-password') ||
           url.includes('/auth/refresh-token');
  }
}
