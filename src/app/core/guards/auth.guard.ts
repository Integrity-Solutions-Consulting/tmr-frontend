import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenService } from '../../features/auth/servicios/token.service';

/** Guard que protege rutas autenticadas.
 *  En modo mock: verifica si existe un token en localStorage.
 *  El botón "Acceso Demo" del Login guarda el token antes de redirigir.
 */
export const authGuard: CanActivateFn = () => {
  const tokenService = inject(TokenService);
  const router = inject(Router);

  if (tokenService.isTokenValid()) {
    return true;
  }

  router.navigate(['/auth/login']);
  return false;
};
