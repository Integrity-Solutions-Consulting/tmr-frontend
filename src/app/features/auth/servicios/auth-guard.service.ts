import { Injectable } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenService } from './token.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuardService {
  constructor(
    private tokenService: TokenService,
    private router: Router
  ) {}

  canActivate: CanActivateFn = (route, state) => {
    if (this.tokenService.isTokenValid()) {
      return true;
    }

    this.router.navigate(['/auth/login'], {
      queryParams: { returnUrl: state.url },
    });
    return false;
  };
}
