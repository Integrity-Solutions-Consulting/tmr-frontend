import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenService } from '../../features/auth/servicios/token.service';

/** Guard que protege rutas según el Rol del usuario.
 *  - Configuración: Solo accesible por Administradores.
 *  - Proyectos, Líderes, Colaboradores, Clientes y Reportes: No accesibles por Colaboradores.
 */
export const roleGuard: CanActivateFn = (route) => {
  const tokenService = inject(TokenService);
  const router = inject(Router);

  if (!tokenService.isTokenValid()) {
    router.navigate(['/auth/login']);
    return false;
  }

  // Si es administrador, tiene acceso a todo de forma predeterminada
  if (tokenService.isAdmin()) {
    return true;
  }

  const path = route.routeConfig?.path;

  // Mapa de rutas de Angular a nombres de módulos en la Base de Datos
  const pathModuleMap: Record<string, string> = {
    'dashboard': 'Dashboard',
    'proyectos': 'Proyectos',
    'colaboradores': 'Colaboradores',
    'clientes': 'Clientes',
    'lideres': 'Lideres',
    'reportes': 'Reportes',
    'configuracion': 'Configuracion'
  };

  if (path && pathModuleMap[path]) {
    const requiredModule = pathModuleMap[path];
    if (!tokenService.hasModule(requiredModule)) {
      console.warn(`Acceso denegado a la ruta ${path}. Se requiere el módulo ${requiredModule}`);
      
      // Si intentó entrar al dashboard y no tiene acceso, lo mandamos a time-report (Actividades)
      if (path === 'dashboard') {
        router.navigate(['/time-report/actividades']);
      } else {
        router.navigate(['/dashboard']);
      }
      return false;
    }
  }

  return true;
};
