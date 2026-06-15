import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
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
   * Actualiza los tokens en localStorage después de un login o refresh exitoso
   */
  updateTokens(response: AuthResponse): void {
    const debeCambiar = this.resolveDebeCambiarPassword(response);
    const user = response.user
      ? { ...response.user, debeCambiarPassword: debeCambiar }
      : response.user;

    this.tokenService.setToken(response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);
    localStorage.setItem('tokenExpiresAt', new Date(response.expiresAt).getTime().toString());
    this.tokenService.setUser(JSON.stringify(user));
  }

  /**
   * Obtiene el perfil completo del usuario desde /configuracion/usuarios/{id}
   * para leer debeCambiarPassword, que el endpoint de login no devuelve.
   */
  getUserProfileById(userId: number): Observable<{ debeCambiarPassword: boolean }> {
    return this.http
      .get<any>(`${environment.apiUrl}/configuracion/usuarios/${userId}`)
      .pipe(
        map((data) => ({
          debeCambiarPassword: Boolean(
            data?.debeCambiarPassword ?? data?.debecambiarpassword ?? false
          ),
        })),
        catchError(() => of({ debeCambiarPassword: false }))
      );
  }

  /**
   * Actualiza únicamente el flag debeCambiarPassword en el currentUser de localStorage.
   * No toca ni tokens ni ningún otro campo.
   */
  actualizarDebeCambiarPassword(valor: boolean): void {
    const user = this.getCurrentUser();
    if (!user) return;
    this.tokenService.setUser(JSON.stringify({ ...user, debeCambiarPassword: valor }));
    console.log('🔐 debeCambiarPassword actualizado en localStorage:', valor);
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
    const userJson = localStorage.getItem('currentUser');
    return userJson ? JSON.parse(userJson) : null;
  }

  debeCambiarPassword(): boolean {
    return Boolean(this.getCurrentUser()?.debeCambiarPassword);
  }

  marcarPasswordActualizado(): void {
    const user = this.getCurrentUser();
    if (!user) return;

    this.tokenService.setUser(JSON.stringify({
      ...user,
      debeCambiarPassword: false,
    }));
  }

  private resolveDebeCambiarPassword(response: AuthResponse): boolean {
    const responseRecord = response as AuthResponse & Record<string, unknown>;
    const userRecord = response.user as (User & Record<string, unknown>) | null;
    const value =
      userRecord?.['debeCambiarPassword'] ??
      userRecord?.['debecambiarpassword'] ??
      userRecord?.['debeCambiarContrasena'] ??
      responseRecord['debeCambiarPassword'] ??
      responseRecord['debecambiarpassword'] ??
      responseRecord['debeCambiarContrasena'];

    return value === true || value === 'true' || value === 1 || value === '1';
  }
}
