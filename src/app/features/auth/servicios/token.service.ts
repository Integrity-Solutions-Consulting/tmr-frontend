import { Injectable } from '@angular/core';
import { UserModulesService } from './user-modules.service';

@Injectable({
  providedIn: 'root',
})
export class TokenService {
  private readonly TOKEN_KEY = 'accessToken';
  private readonly USER_KEY = 'currentUser';

  constructor(private userModulesService: UserModulesService) {}

  setToken(token: string): void {
    sessionStorage.setItem(this.TOKEN_KEY, token);
  }

  getToken(): string | null {
    return sessionStorage.getItem(this.TOKEN_KEY);
  }

  removeToken(): void {
    sessionStorage.removeItem(this.TOKEN_KEY);
  }

  setUser(userJson: string): void {
    sessionStorage.setItem(this.USER_KEY, userJson);
  }

  getUser(): string | null {
    return sessionStorage.getItem(this.USER_KEY);
  }

  removeUser(): void {
    sessionStorage.removeItem(this.USER_KEY);
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
    this.removeModules();
  }

  decodeToken(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window
          .atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join(''),
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  }

  getUserRoles(): string[] {
    const token = this.getToken();
    if (!token) return [];

    const decoded = this.decodeToken(token);
    if (!decoded) return [];
    const roles =
      decoded.role || decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || [];
    return Array.isArray(roles) ? roles : [roles];
  }

  hasRole(roleName: string): boolean {
    const roles = this.getUserRoles().map((r) => r.toUpperCase());
    return roles.includes(roleName.toUpperCase());
  }

  isAdminStrict(): boolean {
    return this.hasRole('ADMINISTRADOR') || this.hasRole('ADMIN');
  }

  isRrhh(): boolean {
    return this.hasRole('RECURSOS HUMANOS') || this.hasRole('RECURSOS_HUMANOS');
  }

  isAdmin(): boolean {
    return this.isAdminStrict() || this.isRrhh();
  }

  isLider(): boolean {
    return this.hasRole('LIDER') || this.hasRole('LÍDER');
  }

  isGerente(): boolean {
    return this.hasRole('GERENTE') || this.hasRole('GERENCIA');
  }

  isAdministrativo(): boolean {
    return this.hasRole('ADMINISTRATIVO');
  }

  // La matriz inicial de Proveedores solo concede CREATE/UPDATE/DELETE a Administrador.
  // Gerente y Lider conservan consulta mediante PROVEEDORES_READ.
  canManageProveedores(): boolean {
    return this.hasRole('ADMINISTRADOR');
  }

  canAccessProveedores(): boolean {
    return (
      this.hasRole('ADMINISTRADOR') ||
      this.hasRole('GERENTE') ||
      this.hasRole('GERENCIA') ||
      this.hasRole('LIDER') ||
      this.hasRole('LÍDER')
    );
  }

  // Visibilidad por roles para las 4 pantallas de Permisos
  canAccessMisPermisos(): boolean {
    return this.isTokenValid();
  }

  canAccessPermisosLider(): boolean {
    return (
      this.isAdminStrict() ||
      this.isLider() ||
      this.userModulesService.hasModule('Aprobacion Lider')
    );
  }

  canAccessPermisosRrhh(): boolean {
    return (
      this.isAdminStrict() ||
      this.isRrhh() ||
      this.userModulesService.hasModule('Validacion RRHH')
    );
  }

  canAccessPermisosGerencia(): boolean {
    return (
      this.isAdminStrict() ||
      this.isGerente() ||
      this.isRrhh() ||
      this.userModulesService.hasModule('Historial Gerencia')
    );
  }

  isColaborador(): boolean {
    if (this.isAdmin() || this.isLider() || this.isGerente() || this.isAdministrativo()) {
      return false;
    }
    return true; // Default fallback si no es ninguno de los roles superiores
  }

  // Módulos
  getUserModules(): string[] {
    return this.userModulesService.getModules();
  }

  setUserModules(modules: string[]): void {
    this.userModulesService.setModules(Array.isArray(modules) ? modules : []);
  }

  hasModule(moduleName: string): boolean {
    if (this.isAdmin()) return true;
    return this.userModulesService.hasModule(moduleName);
  }

  removeModules(): void {
    this.userModulesService.clearModules();
  }
}
