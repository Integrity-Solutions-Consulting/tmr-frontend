import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable()
export class TokenInterceptor implements HttpInterceptor {

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {


    if (req.url.startsWith(environment.apiUrl)) {
      const reqConCookies = req.clone({
        withCredentials: true
      });

      return next.handle(reqConCookies);
    }

    return next.handle(req);
  }
}
