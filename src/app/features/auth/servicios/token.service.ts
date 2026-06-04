import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class TokenService {
  private readonly TOKEN_KEY = 'accessToken';
  private readonly USER_KEY = 'currentUser';

  setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  setUser(userJson: string): void {
    localStorage.setItem(this.USER_KEY, userJson);
  }

  getUser(): string | null {
    return localStorage.getItem(this.USER_KEY);
  }

  removeUser(): void {
    localStorage.removeItem(this.USER_KEY);
  }

  isTokenValid(): boolean {
    return !!this.getToken();
  }

  clear(): void {
    this.removeToken();
    this.removeUser();
  }
}
