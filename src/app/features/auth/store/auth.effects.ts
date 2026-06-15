import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import * as AuthActions from './auth.actions';
import { AuthService } from '../servicios/auth.service';
import { TokenService } from '../servicios/token.service';
import { UserModulesService } from '../servicios/user-modules.service';
import { TokenMonitorService } from '../../../core/services/token-monitor.service';

/** Extrae el mensaje legible del error HTTP del backend */
function extractLoginError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error;
    if (body) {
      // Intenta leer errors[0].message
      if (Array.isArray(body.errors) && body.errors.length > 0 && body.errors[0].message) {
        return body.errors[0].message;
      }
      // Intenta leer message directo
      if (typeof body.message === 'string' && body.message) {
        return body.message;
      }
    }
    // Fallback segun status
    if (error.status === 401) return 'Credenciales inválidas. Verifique su usuario y contraseña.';
    if (error.status === 0) return 'No se pudo conectar al servidor. Verifique su conexión.';
  }
  return (error as any)?.message || 'Error al iniciar sesión.';
}

@Injectable()
export class AuthEffects {
  private actions$ = inject(Actions);
  private authService = inject(AuthService);
  private tokenService = inject(TokenService);
  private userModulesService = inject(UserModulesService);
  private tokenMonitor = inject(TokenMonitorService);
  private router = inject(Router);

  login$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.login),
      switchMap(({ credentials }) =>
        this.authService.login(credentials).pipe(
          switchMap((response) => {
            // Guardar tokens en localStorage (incluye accessToken, refreshToken y expiresAt)
            this.authService.updateTokens(response);

            return this.authService.getUserModules().pipe(
              tap((modules) => {
                console.log("Módulos recibidos desde backend:", modules);
                this.userModulesService.setModules(Array.isArray(modules) ? modules : []);
              }),
              tap(() => {
                console.log('🔄 Iniciando monitoreo de token...');
                this.tokenMonitor.startMonitoring();
              }),
              switchMap(() => {
                // El endpoint de login NO devuelve debeCambiarPassword.
                // Lo obtenemos de /configuracion/usuarios/{id} que sí lo incluye.
                const userId = (response.user as any)?.id as number | undefined;
                if (!userId) {
                  return of(AuthActions.loginSuccess({ response }));
                }
                return this.authService.getUserProfileById(userId).pipe(
                  tap((profile) => {
                    this.authService.actualizarDebeCambiarPassword(profile.debeCambiarPassword);
                  }),
                  map(() => AuthActions.loginSuccess({ response })),
                  catchError(() => of(AuthActions.loginSuccess({ response })))
                );
              }),
              catchError((error) => {
                console.error("Error fetching modules", error);
                this.tokenService.clear();
                return of(AuthActions.loginFailure({ error: "Error al cargar módulos del usuario" }));
              })
            );
          }),
          catchError((error) =>
            of(AuthActions.loginFailure({ error: extractLoginError(error) }))
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
          tap(() => {
            this.tokenService.clear();
            // ✅ CAMBIO: Limpiar módulos del servicio en memoria
            this.userModulesService.clearModules();
          }),
          map(() => AuthActions.logoutSuccess()),
          catchError((error) => {
            console.warn('Backend logout request failed or expired, clearing local session anyway.', error);
            this.tokenService.clear();
            this.userModulesService.clearModules();
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
          // Detener monitoreo del token
          this.tokenMonitor.stopMonitoring();
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
