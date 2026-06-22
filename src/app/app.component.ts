import { Component, HostListener, inject, OnInit, OnDestroy } from '@angular/core';
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
  private activeErrors = new Map<HTMLElement, { errorEl: HTMLElement; timeoutId: number }>();

  private destroy$ = new Subject<void>();
  private tokenMonitor = inject(TokenMonitorService);
  private authService = inject(AuthService);
  private tokenService = inject(TokenService);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private currentDialogRef: any; // Referencia al modal abierto
  private passwordDialogRef: any;

  @HostListener('document:beforeinput', ['$event'])
  onBeforeInput(event: InputEvent): void {
    if (!this.isEditableElement(event.target) || !event.data || !this.hasEmoji(event.data)) {
      return;
    }

    event.preventDefault();
    this.showInvalidCharacterMessage(event.target as HTMLElement);
  }

  @HostListener('document:input', ['$event'])
  onInput(event: Event): void {
    const target = event.target;

    if (!this.isEditableElement(target)) {
      return;
    }

    const currentValue = this.getEditableValue(target);

    if (!this.hasEmoji(currentValue)) {
      return;
    }

    this.setEditableValue(target, this.removeEmojis(currentValue));
    target.dispatchEvent(new Event('input', { bubbles: true }));
    this.showInvalidCharacterMessage(target as HTMLElement);
  }

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
    this.activeErrors.forEach((val) => {
      window.clearTimeout(val.timeoutId);
      val.errorEl.remove();
    });
    this.activeErrors.clear();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private hasEmoji(value: string): boolean {
    return /[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{Regional_Indicator}\uFE0F]/u.test(value);
  }

  private removeEmojis(value: string): string {
    return value.replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{Regional_Indicator}\uFE0F]/gu, '');
  }

  private isEditableElement(target: EventTarget | null): target is HTMLInputElement | HTMLTextAreaElement | HTMLElement {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    if (target instanceof HTMLTextAreaElement) {
      return true;
    }

    if (target instanceof HTMLInputElement) {
      return !this.ignoredInputTypes.has(target.type);
    }

    return target.isContentEditable;
  }

  private getEditableValue(target: HTMLInputElement | HTMLTextAreaElement | HTMLElement): string {
    return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
      ? target.value
      : target.textContent ?? '';
  }

  private setEditableValue(target: HTMLInputElement | HTMLTextAreaElement | HTMLElement, value: string): void {
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      target.value = value;
      return;
    }

    target.textContent = value;
  }

  private showInvalidCharacterMessage(target: HTMLElement): void {
    let container: HTMLElement | null = target.closest('.form-field, .float-field, .float-select, .email-compose');
    if (!container) {
      container = target.parentElement;
    }
    if (!container) {
      return;
    }

    const existing = this.activeErrors.get(container);
    if (existing) {
      window.clearTimeout(existing.timeoutId);
      const timeoutId = window.setTimeout(() => {
        existing.errorEl.remove();
        this.activeErrors.delete(container!);
      }, 2500);
      existing.timeoutId = timeoutId;
    } else {
      const errorEl = document.createElement('span');
      errorEl.className = 'form-field__error app-dynamic-character-error';
      errorEl.textContent = 'Ingrese un caracter valido';
      errorEl.style.color = '#ef4444';
      errorEl.style.fontSize = '11px';
      errorEl.style.marginTop = '4px';
      errorEl.style.display = 'block';

      container.appendChild(errorEl);

      const timeoutId = window.setTimeout(() => {
        errorEl.remove();
        this.activeErrors.delete(container!);
      }, 2500);

      this.activeErrors.set(container, { errorEl, timeoutId });
    }
  }

  private readonly ignoredInputTypes = new Set([
    'button', 'checkbox', 'color', 'date', 'file', 'hidden', 'image', 'radio',
    'range', 'reset', 'submit',
  ]);
}
