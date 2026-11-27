import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenService } from '../../features/auth/servicios/token.service';

/** Guard que protege rutas autenticadas: valida que exista un token JWT vigente. */
export const authGuard: CanActivateFn = () => {
  const tokenService = inject(TokenService);
  const router = inject(Router);

  if (tokenService.isTokenValid()) {
    return true;
  }

  router.navigate(['/auth/login']);
  return false;
};
