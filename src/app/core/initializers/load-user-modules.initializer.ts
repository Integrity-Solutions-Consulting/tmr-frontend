import { inject } from '@angular/core';
import { TokenService } from '../../features/auth/servicios/token.service';
import { UserModulesService } from '../../features/auth/servicios/user-modules.service';
import { AuthService } from '../../features/auth/servicios/auth.service';
import { firstValueFrom } from 'rxjs';

/**
 * Inicializador que precarga los módulos del usuario autenticado al iniciar la aplicación.
 * 
 * Este initializer:
 * 1. Verifica si hay un token válido en localStorage
 * 2. Si existe, obtiene los módulos del backend (/auth/modules)
 * 3. Guarda los módulos en memoria (UserModulesService)
 * 
 * Si no hay token válido o falla la obtención de módulos, simplemente continúa
 * (no impide que la app arranque).
 */
export async function loadUserModulesInitializer(): Promise<void> {
  const tokenService = inject(TokenService);
  const userModulesService = inject(UserModulesService);
  const authService = inject(AuthService);

  try {
    // Si no hay token válido, no hay nada que precargar
    if (!tokenService.isTokenValid()) {
      console.log('📍 loadUserModulesInitializer: No hay token válido, omitiendo precarga');
      return;
    }

    console.log('📍 loadUserModulesInitializer: Token válido encontrado, precargando módulos...');

    // Obtener módulos del backend
    const modules = await firstValueFrom(authService.getUserModules());
    
    // Guardar en memoria
    userModulesService.setModules(Array.isArray(modules) ? modules : []);
    
    console.log('✅ loadUserModulesInitializer: Módulos precargados exitosamente');
  } catch (error) {
    // Si falla la precarga, solo loguear el error pero NO impedir que la app arranque
    console.warn('⚠️  loadUserModulesInitializer: Error al precargar módulos', error);
    // La app continúa normalmente; los módulos se cargarán después del login
  }
}
