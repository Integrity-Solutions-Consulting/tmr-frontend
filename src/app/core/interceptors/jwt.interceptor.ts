import { Injectable, inject } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TokenService } from '../../features/auth/servicios/token.service';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  private readonly tokenService = inject(TokenService);

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.tokenService.getToken() ?? localStorage.getItem('accessToken');

    if (!token || req.headers.has('Authorization')) {
      return next.handle(req);
    }

    return next.handle(
      req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      })
    );
  }
}
