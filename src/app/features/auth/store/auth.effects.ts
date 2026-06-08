import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import * as AuthActions from './auth.actions';
import { AuthService } from '../servicios/auth.service';
import { TokenService } from '../servicios/token.service';

@Injectable()
export class AuthEffects {
  private actions$ = inject(Actions);
  private authService = inject(AuthService);
  private tokenService = inject(TokenService);
  private router = inject(Router);

  login$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.login),
      switchMap(({ credentials }) =>
        this.authService.login(credentials).pipe(
          switchMap((response) => {
            const token = response.data?.accessToken ?? response.data?.token ?? response.token ?? '';
            const user = response.data?.user ?? response.data?.usuario ?? response.user ?? null;

            this.tokenService.setToken(token);
            if (user) {
              this.tokenService.setUser(JSON.stringify(user));
            }

            return this.authService.getUserModules().pipe(
              tap((modResp) => {
                console.log("Módulos recibidos desde backend:", modResp);
                this.tokenService.setUserModules(modResp.data || []);
              }),
              map(() => AuthActions.loginSuccess({ response: { token, user } })),
              catchError((error) => {
                console.error("Error fetching modules", error);
                this.tokenService.clear();
                return of(AuthActions.loginFailure({ error: "Error al cargar módulos del usuario" }));
              })
            );
          }),
          catchError((error) =>
            of(AuthActions.loginFailure({ error: error.message }))
          )
        )
      )
    )
  );

  logout$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.logout),
      switchMap(() =>
        this.authService.logout().pipe(
          tap(() => this.tokenService.clear()),
          map(() => AuthActions.logoutSuccess()),
          catchError((error) => {
            console.warn('Backend logout request failed or expired, clearing local session anyway.', error);
            this.tokenService.clear();
            return of(AuthActions.logoutSuccess());
          })
        )
      )
    )
  );

  logoutSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.logoutSuccess, AuthActions.logoutFailure),
        tap(() => {
          this.router.navigate(['/auth/login']);
        })
      ),
    { dispatch: false }
  );

  refreshToken$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.refreshToken),
      switchMap(() =>
        this.authService.refreshToken().pipe(
          tap(({ token }) => this.tokenService.setToken(token)),
          map(({ token }) => AuthActions.refreshTokenSuccess({ token })),
          catchError((error) =>
            of(AuthActions.refreshTokenFailure({ error: error.message }))
          )
        )
      )
    )
  );

  forgotPassword$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.forgotPassword),
      switchMap(({ email }) =>
        this.authService.forgotPassword(email).pipe(
          map((response) =>
            AuthActions.forgotPasswordSuccess({ response })
          ),
          catchError((error) =>
            of(AuthActions.forgotPasswordFailure({ error: error.message }))
          )
        )
      )
    )
  );
}
