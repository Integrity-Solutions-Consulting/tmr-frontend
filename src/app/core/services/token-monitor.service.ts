import { Injectable, NgZone } from '@angular/core';
import { Subject } from 'rxjs';
import { TokenService } from '../../features/auth/servicios/token.service';
import { UserActivityService } from './user-activity.service';
import { TOKEN_CONFIG } from '../config/token.config';

/**
 * TokenMonitorService
 * Monitorea la expiración del Access Token y emite eventos:
 * - onSilentRefreshNeeded: cuando hay actividad y faltan 60s
 * - onExpirationWarning: 1 minuto antes de expiración (sin actividad)
 * - onTokenExpired: cuando el token expira
 */
@Injectable({
  providedIn: 'root'
})
export class TokenMonitorService {
  private expirationWarning$ = new Subject<void>();
  private tokenExpired$ = new Subject<void>();
  private silentRefreshNeeded$ = new Subject<void>();
  private checkInterval: any;
  private warningEmitted = false;

  constructor(
    private tokenService: TokenService,
    private ngZone: NgZone,
    private userActivity: UserActivityService
  ) {}

  /**
   * Observable que emite 1 minuto antes de expiración
   */
  onExpirationWarning() {
    return this.expirationWarning$.asObservable();
  }

  /**
   * Observable que emite cuando el token expira
   */
  onTokenExpired() {
    return this.tokenExpired$.asObservable();
  }

  /**
   * Observable que emite cuando se debe hacer refresh silencioso (hay actividad)
   */
  onSilentRefreshNeeded() {
    return this.silentRefreshNeeded$.asObservable();
  }

  /**
   * Inicia el monitoreo del token
   * Revisa cada 10 segundos si el token está próximo a expirar
   * Detecta actividad del usuario para decidir entre refresh silencioso o mostrar modal
   */
  startMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.warningEmitted = false;
    const token = this.tokenService.getToken();
    
    if (!token) {
      console.warn('⚠️ TokenMonitor: No hay token, no se puede iniciar monitoreo');
      return;
    }

    const decoded = this.tokenService.decodeToken(token);
    if (!decoded || !decoded.exp) {
      console.warn('⚠️ TokenMonitor: Token inválido o sin claim exp');
      return;
    }

    const expirationTime = new Date(decoded.exp * 1000);

    // Usar NgZone para no ejecutar en Angular zone y evitar cambios de detección innecesarios
    this.ngZone.runOutsideAngular(() => {
      this.checkInterval = setInterval(() => {
        const timeUntilExpiration = this.getTimeUntilExpiration();

        if (timeUntilExpiration <= 0) {
          // Token expiró
          this.ngZone.run(() => {
            this.tokenExpired$.next();
          });
          this.stopMonitoring();
        } else if (timeUntilExpiration <= TOKEN_CONFIG.EXPIRATION_WARNING_SECONDS && !this.warningEmitted) {
          // Faltan 60 segundos o menos (emitir solo una vez)
          // Verificar actividad del usuario
          const hasActivity = this.userActivity.isUserActive(TOKEN_CONFIG.ACTIVITY_CHECK_WINDOW);

          if (hasActivity) {
            // Hay actividad - refresh silencioso
            this.warningEmitted = true;
            this.ngZone.run(() => {
              this.silentRefreshNeeded$.next();
            });
          } else {
            // Sin actividad - mostrar modal
            this.warningEmitted = true;
            this.ngZone.run(() => {
              this.expirationWarning$.next();
            });
          }
        }
      }, TOKEN_CONFIG.CHECK_INTERVAL_MS); // Revisar cada 10 segundos
    });
  }

  /**
   * Detiene el monitoreo
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.warningEmitted = false;
  }

  /**
   * Retorna segundos hasta expiración (-1 si no hay token)
   */
  private getTimeUntilExpiration(): number {
    const token = this.tokenService.getToken();
    if (!token) return -1;

    const decoded = this.tokenService.decodeToken(token);
    if (!decoded || !decoded.exp) return -1;

    const expirationTime = decoded.exp * 1000; // convertir a ms
    const now = Date.now();
    return Math.floor((expirationTime - now) / 1000);
  }

  /** Retorna los segundos restantes. */
  getSecondsRemaining(): number {
    return this.getTimeUntilExpiration();
  }
}
