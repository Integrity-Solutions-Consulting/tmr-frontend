import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * UserModulesService gestiona los módulos del usuario autenticado.
 * Los módulos se almacenan en MEMORIA (BehaviorSubject), NO en localStorage.
 * Esto previene que usuarios malintencionados manipulen los módulos editando localStorage.
 * 
 * Los módulos se pierden al recargar la página, pero se pueden recuperar mediante:
 * - APP_INITIALIZER al iniciar la app (si el usuario está autenticado)
 * - Login (obtenidos del backend)
 * - Refresh manual si es necesario
 */
@Injectable({
  providedIn: 'root',
})
export class UserModulesService {
  private readonly modules$ = new BehaviorSubject<string[]>([]);

  constructor() {}

  /**
   * Obtiene los módulos actuales del usuario como Observable
   */
  getModules$(): Observable<string[]> {
    return this.modules$.asObservable();
  }

  /**
   * Obtiene los módulos actuales del usuario de forma síncrona
   */
  getModules(): string[] {
    return this.modules$.value;
  }

  /**
   * Establece los módulos del usuario
   * Se llama después del login o al precargar la app
   */
  setModules(modules: string[]): void {
    const validModules = Array.isArray(modules) ? modules : [];
    console.log('🔐 UserModulesService: Módulos cargados en memoria:', validModules);
    this.modules$.next(validModules);
  }

  /**
   * Verifica si el usuario tiene un módulo específico
   * Siempre retorna true para ADMINISTRADOR
   */
  hasModule(moduleName: string): boolean {
    const modules = this.modules$.value.map((m) => m.toUpperCase());
    return modules.includes(moduleName.toUpperCase());
  }

  /**
   * Limpia los módulos del usuario (se llama al logout)
   */
  clearModules(): void {
    console.log('🧹 UserModulesService: Módulos limpiados');
    this.modules$.next([]);
  }
}
