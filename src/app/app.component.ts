import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { RouterOutlet } from '@angular/router';
import { TokenMonitorService } from './core/services/token-monitor.service';
import { AuthService } from './features/auth/servicios/auth.service';
import { TokenService } from './features/auth/servicios/token.service';
import { AuthResponse } from './features/auth/modelos/auth.models';
import { SessionExpirationModalComponent } from './core/components/session-expiration-modal/session-expiration-modal.component';
import { CambiarPasswordModalComponent } from './features/auth/componentes/cambiar-password-modal/cambiar-password-modal.component';
import { Subject } from 'rxjs';
import { filter, takeUntil, switchMap } from 'rxjs/operators';
import { NavigationEnd } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private tokenMonitor = inject(TokenMonitorService);
  private authService = inject(AuthService);
  private tokenService = inject(TokenService);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private currentDialogRef: any; // Referencia al modal abierto
  private passwordDialogRef: any;

  ngOnInit(): void {
    // Iniciar monitoreo si hay token válido
    if (this.tokenService.isTokenValid()) {
      this.tokenMonitor.startMonitoring();
      this.enforcePasswordChange();
    }

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntil(this.destroy$),
      )
      .subscribe(() => this.enforcePasswordChange());

    // Escuchar advertencia de expiración (1 minuto antes)
    this.tokenMonitor
      .onExpirationWarning()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.showExpirationModal();
      });

    // Escuchar cuando el token expira
    this.tokenMonitor
      .onTokenExpired()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        console.log('⏰ Token expirado detectado');
        // Si el modal está abierto, cerrarlo y redirigir
        if (this.currentDialogRef) {
          this.currentDialogRef.close();
        }
        this.handleTokenExpired();
      });
  }

  /**
   * Muestra modal 1 minuto antes de expiración del token
   */
  private showExpirationModal(): void {
    console.log('🔔 Mostrando modal de expiración de sesión...');
    this.currentDialogRef = this.dialog.open(SessionExpirationModalComponent, {
      disableClose: true,
      width: '400px',
      panelClass: 'session-expiration-dialog'
    });

    this.currentDialogRef
      .afterClosed()
      .pipe(
        switchMap(result => {
          console.log('🔄 Resultado del modal:', result);
          if (result === true) {
            // Usuario aceptó extender sesión - realizar refresh
            console.log('✅ Usuario aceptó extender sesión, refrescando token...');
            return this.authService.refreshTokenRequest();
          } else {
            // Usuario rechazó - logout
            console.log('❌ Usuario rechazó extender sesión, cerrando...');
            throw new Error('User rejected session extension');
          }
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response: AuthResponse) => {
          // Actualizar tokens y reiniciar monitoreo
          console.log('✅ Token refrescado, reiniciando monitoreo...');
          this.authService.updateTokens(response);
          this.tokenMonitor.stopMonitoring();
          this.tokenMonitor.startMonitoring();
          console.log('✅ Sesión extendida exitosamente');
          this.currentDialogRef = null;
        },
        error: (err: any) => {
          // Si hay error o usuario rechaza, logout
          console.warn('❌ No se pudo extender la sesión:', err.message);
          this.currentDialogRef = null;
          this.handleTokenExpired();
        }
      });
  }

  /**
   * Redirige a login cuando token expira
   */
  private handleTokenExpired(): void {
    // Cerrar el modal si está abierto
    if (this.currentDialogRef) {
      console.log('🔐 Cerrando modal de sesión expirada...');
      this.currentDialogRef.close();
      this.currentDialogRef = null;
    }

    this.tokenService.clear();
    this.tokenMonitor.stopMonitoring();
    this.router.navigate(['/auth/login'], {
      queryParams: { reason: 'session-expired' }
    });
  }

  private enforcePasswordChange(): void {
    if (!this.tokenService.isTokenValid() || !this.authService.debeCambiarPassword()) {
      return;
    }

    if (this.router.url.startsWith('/auth/login') || this.passwordDialogRef) {
      return;
    }

    this.passwordDialogRef = this.dialog.open(CambiarPasswordModalComponent, {
      panelClass: 'tmr-dialog-panel',
      disableClose: true,
      data: { obligatorio: true },
    });

    this.passwordDialogRef
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((actualizado: boolean) => {
        this.passwordDialogRef = null;
        if (!actualizado && this.authService.debeCambiarPassword()) {
          this.enforcePasswordChange();
        }
      });
  }

  ngOnDestroy(): void {
    this.tokenMonitor.stopMonitoring();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
