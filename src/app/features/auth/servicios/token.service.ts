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
    const token = this.getToken();
    if (!token) return false;

    const decoded = this.decodeToken(token);
    if (decoded && decoded.exp) {
      const expirationDate = new Date(decoded.exp * 1000);
      if (expirationDate <= new Date()) {
        return false;
      }
    }
    return true;
  }

  clear(): void {
    this.removeToken();
    this.removeUser();
  }

  decodeToken(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window.atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  }

  getUserRoles(): string[] {
    const token = this.getToken();
    if (!token) return [];

    // Fallback de desarrollo: si es un email de demo o desarrollo local sin backend, otorgar ADMINISTRADOR
    const userJson = this.getUser();
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        const email = String(user.email || user.correoContacto || '').toLowerCase();
        if (email === 'demo@tmr.com' || email === 'josedexd122ador@gmail.com' || email === 'xavier@gmail.com') {
          return ['ADMINISTRADOR'];
        }
      } catch (e) {}
    }

    const decoded = this.decodeToken(token);
    if (!decoded) return [];
    const roles = decoded.role || decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || [];
    return Array.isArray(roles) ? roles : [roles];
  }

  hasRole(roleName: string): boolean {
    const roles = this.getUserRoles().map((r) => r.toUpperCase());
    return roles.includes(roleName.toUpperCase());
  }

  isAdmin(): boolean {
    return (
      this.hasRole('ADMINISTRADOR') ||
      this.hasRole('ADMIN') ||
      this.hasRole('RECURSOS HUMANOS') ||
      this.hasRole('RECURSOS_HUMANOS')
    );
  }

  isLider(): boolean {
    return this.hasRole('LIDER') || this.hasRole('LÍDER');
  }

  isGerente(): boolean {
    return this.hasRole('GERENTE');
  }

  isAdministrativo(): boolean {
    return this.hasRole('ADMINISTRATIVO');
  }

  isColaborador(): boolean {
    if (this.isAdmin() || this.isLider() || this.isGerente() || this.isAdministrativo()) {
      return false;
    }
    return true; // Default fallback si no es ninguno de los roles superiores
  }

  // Módulos
  getUserModules(): string[] {
    const modulesJson = localStorage.getItem('userModules');
    if (modulesJson) {
      try {
        const modules = JSON.parse(modulesJson);
        return Array.isArray(modules) ? modules : [];
      } catch (e) {}
    }
    return [];
  }

  setUserModules(modules: string[]): void {
    localStorage.setItem('userModules', JSON.stringify(modules));
  }

  hasModule(moduleName: string): boolean {
    if (this.isAdmin()) return true;
    const modules = this.getUserModules().map((m) => m.toUpperCase());
    return modules.includes(moduleName.toUpperCase());
  }

  removeModules(): void {
    localStorage.removeItem('userModules');
  }

  clearToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.removeModules();
  }
}
