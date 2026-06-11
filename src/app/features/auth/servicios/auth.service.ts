import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { AuthResponse, User, ForgotPasswordResponse, ChangePasswordRequest } from '../modelos/auth.models';
import { LoginRequest } from '../modelos/login-request.interface';
import { ForgotPasswordRequest } from '../modelos/forgot-password-request.interface';
import { TokenService } from './token.service';

import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly API_URL = `${environment.apiUrl}/auth`;

  constructor(
    private http: HttpClient,
    private tokenService: TokenService
  ) {}

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/login`, {
      user: credentials.email,
      password: credentials.password,
    });
  }

  logout(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.API_URL}/logout`, {});
  }

  /**
   * Realiza una solicitud de refresh token al backend
   * Retorna los nuevos AT, RT y expiración
   */
  refreshTokenRequest(): Observable<AuthResponse> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token found'));
    }

    return this.http.post<AuthResponse>(
      `${this.API_URL}/refresh-token`,
      { refreshToken }
    );
  }

  /**
   * Actualiza los tokens en localStorage después de un refresh exitoso
   */
  updateTokens(response: AuthResponse): void {
    console.log('💾 Guardando tokens en localStorage...', {
      accessToken: response.accessToken ? response.accessToken.substring(0, 20) + '...' : 'N/A',
      refreshToken: response.refreshToken ? response.refreshToken.substring(0, 20) + '...' : 'N/A',
      expiresAt: response.expiresAt
    });
    
    this.tokenService.setToken(response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);
    localStorage.setItem('tokenExpiresAt', new Date(response.expiresAt).getTime().toString());
    this.tokenService.setUser(JSON.stringify(response.user));
    
    console.log('✅ Tokens guardados');
  }

  /**
   * @deprecated Usar refreshTokenRequest() en su lugar
   */
  refreshToken(): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(
      `${this.API_URL}/refresh-token`,
      { RefreshToken: localStorage.getItem('refreshToken') }
    );
  }

  forgotPassword(email: string): Observable<ForgotPasswordResponse> {
    const request: ForgotPasswordRequest = { email };
    return this.http.post<ForgotPasswordResponse>(
      `${this.API_URL}/forgot-password`,
      request
    );
  }

  /**
   * Obtiene los módulos asignados al usuario autenticado
   * NOTA: ApiResponseInterceptor transforma ApiResponse<string[]> -> string[]
   */
  getUserModules(): Observable<string[]> {
    return this.http.get<string[]>(`${this.API_URL}/modules`);
  }

  changePassword(payload: ChangePasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/change-password`, payload);
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
