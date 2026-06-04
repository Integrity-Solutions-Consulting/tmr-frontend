import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  // Endpoints que NO requieren token
  private readonly excludedUrls = ['/auth/login', '/auth/register', '/auth/forgot-password'];

  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // No agregar token a endpoints de autenticación
    const isExcluded = this.excludedUrls.some(url => req.url.includes(url));
    if (isExcluded) {
      console.log('⏭️  Interceptor: URL excluida, sin agregar token');
      return next.handle(req);
    }

    const token = this.authService.getToken();

    if (token) {
      console.log('🔐 Interceptor: Agregando token al header Authorization');
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    } else {
      console.warn('⚠️ Interceptor: No hay token disponible');
    }

    return next.handle(req);
  }
}
