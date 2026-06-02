import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpResponse } from '@angular/common/http';
import { Observable, of, delay } from 'rxjs';

@Injectable()
export class AuthMockInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Comentado: Dejar que el login vaya al servidor real
    // if (req.url.includes('/api/auth/login') && req.method === 'POST') {
    //   const mockResponse = {
    //     token: 'mock-jwt-token-' + Date.now(),
    //     user: {
    //       id: '1',
    //       email: req.body.email,
    //       name: 'Test User'
    //     }
    //   };
    //   return of(new HttpResponse({ status: 200, body: mockResponse })).pipe(delay(500));
    // }
    
    // Mock logout endpoint
    if (req.url.includes('/api/auth/logout') && req.method === 'POST') {
      return of(new HttpResponse({ status: 200, body: { message: 'Logged out' } })).pipe(delay(300));
    }

    // Mock refresh token endpoint
    if (req.url.includes('/api/auth/refresh-token') && req.method === 'POST') {
      const mockResponse = {
        token: 'mock-jwt-token-' + Date.now()
      };
      return of(new HttpResponse({ status: 200, body: mockResponse })).pipe(delay(300));
    }

    // Mock forgot password endpoint
    if (req.url.includes('/api/auth/forgot-password') && req.method === 'POST') {
      const mockResponse = {
        message: 'Se ha enviado un enlace de recuperación a tu correo electrónico'
      };
      return of(new HttpResponse({ status: 200, body: mockResponse })).pipe(delay(500));
    }

    return next.handle(req);
  }
}