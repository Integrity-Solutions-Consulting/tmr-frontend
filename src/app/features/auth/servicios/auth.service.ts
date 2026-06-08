import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthResponse, User, ForgotPasswordResponse } from '../modelos/auth.models';
import { LoginRequest } from '../modelos/login-request.interface';
import { ForgotPasswordRequest } from '../modelos/forgot-password-request.interface';

import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly API_URL = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient) {}

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/login`, {
      user: credentials.email,
      password: credentials.password,
    });
  }

  logout(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.API_URL}/logout`, {});
  }

  refreshToken(): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(
      `${this.API_URL}/refresh-token`,
      {}
    );
  }

  forgotPassword(email: string): Observable<ForgotPasswordResponse> {
    const request: ForgotPasswordRequest = { email };
    return this.http.post<ForgotPasswordResponse>(
      `${this.API_URL}/forgot-password`,
      request
    );
  }

  getUserModules(): Observable<{ data: string[] }> {
    return this.http.get<{ data: string[] }>(`${this.API_URL}/modules`);
  }

  getCurrentUser(): User | null {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      return null;
    }
    // In a real app, you'd decode the JWT here
    const userJson = localStorage.getItem('currentUser');
    return userJson ? JSON.parse(userJson) : null;
  }
}
