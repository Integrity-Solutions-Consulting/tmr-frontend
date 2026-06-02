import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AUTH_CONFIG } from '../config/auth.config';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = AUTH_CONFIG.TOKEN_KEY;
  private readonly TOKEN_VALUE = AUTH_CONFIG.TOKEN_VALUE;
  private readonly DEBUG = AUTH_CONFIG.DEBUG;
  private readonly API_URL = AUTH_CONFIG.API_URL;

  constructor(private http: HttpClient) {
    this.initializeToken();
  }

  /**
   * Inicializa el token en localStorage si no existe
   */
  private initializeToken(): void {
    if (!this.getToken() && this.TOKEN_VALUE) {
      this.setToken(this.TOKEN_VALUE);
      if (this.DEBUG) {
        console.log('✅ AuthService: Token inicializado desde configuración');
      }
    }
  }

  /**
   * Realiza login y obtiene un token válido del servidor
   * NOTA: No se usa en desarrollo. El token se setea directamente desde auth.config.ts
   */
  async login(email: string = 'josedexD122ador@gmail.com', password: string = 'password'): Promise<string> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ token: string }>(`${this.API_URL}/auth/login`, { email, password })
      );
      
      if (response.token) {
        this.setToken(response.token);
        if (this.DEBUG) {
          console.log('✅ AuthService: Token obtenido del servidor');
        }
        return response.token;
      }
      throw new Error('No se recibió token');
    } catch (error) {
      console.error('❌ AuthService: Error en login:', error);
      throw error;
    }
  }

  /**
   * Obtiene el token del localStorage
   */
  getToken(): string | null {
    const token = localStorage.getItem(this.TOKEN_KEY);
    if (this.DEBUG && token) {
      console.log('🔑 AuthService: Token obtenido del localStorage');
    }
    return token;
  }

  /**
   * Guarda el token en localStorage
   */
  setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    if (this.DEBUG) {
      console.log('💾 AuthService: Token guardado en localStorage');
    }
  }

  /**
   * Elimina el token del localStorage
   */
  clearToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    if (this.DEBUG) {
      console.log('🗑️  AuthService: Token eliminado del localStorage');
    }
  }

  /**
   * Verifica si existe un token válido
   */
  hasToken(): boolean {
    return this.getToken() !== null;
  }

  /**
   * Obtiene el token con el formato Bearer
   */
  getAuthorizationHeader(): string {
    const token = this.getToken();
    return token ? `Bearer ${token}` : '';
  }
}
