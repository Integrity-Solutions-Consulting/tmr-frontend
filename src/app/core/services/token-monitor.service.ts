import { Injectable, NgZone } from '@angular/core';
import { Subject } from 'rxjs';
import { TokenService } from '../../features/auth/servicios/token.service';

/**
 * TokenMonitorService
 * Monitorea la expiración del Access Token y emite eventos:
 * - onExpirationWarning: 1 minuto antes de expiración
 * - onTokenExpired: cuando el token expira
 */
@Injectable({
  providedIn: 'root'
})
export class TokenMonitorService {
  private expirationWarning$ = new Subject<void>();
  private tokenExpired$ = new Subject<void>();
  private checkInterval: any;
  private warningEmitted = false;
  private readonly DEBUG = true; // Habilitar logs de debug

  constructor(
    private tokenService: TokenService,
    private ngZone: NgZone
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
   * Inicia el monitoreo del token
   * Revisa cada 10 segundos si el token está próximo a expirar
   */
  startMonitoring(): void {
    if (this.checkInterval) {
      if (this.DEBUG) {
        console.warn('⚠️ TokenMonitor: Ya está activo, deteniendo anterior...');
      }
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
    if (this.DEBUG) {
      console.log(`✅ TokenMonitor INICIADO`);
      console.log(`   Token expirará en: ${expirationTime.toLocaleTimeString()}`);
      console.log(`   Tiempo hasta expiración: ${this.getTimeUntilExpiration()}s`);
    }

    // Usar NgZone para no ejecutar en Angular zone y evitar cambios de detección innecesarios
    this.ngZone.runOutsideAngular(() => {
      this.checkInterval = setInterval(() => {
        const timeUntilExpiration = this.getTimeUntilExpiration();

        if (this.DEBUG) {
          console.log(`⏱️  TokenMonitor: ${timeUntilExpiration}s hasta expiración`);
        }

        if (timeUntilExpiration <= 0) {
          // Token expiró
          if (this.DEBUG) {
            console.warn('❌ TokenMonitor: TOKEN EXPIRADO');
          }
          this.ngZone.run(() => {
            this.tokenExpired$.next();
          });
          this.stopMonitoring();
        } else if (timeUntilExpiration <= 60 && !this.warningEmitted) {
          // Faltan 60 segundos o menos (emitir solo una vez)
          if (this.DEBUG) {
            console.warn(`⚠️  TokenMonitor: ADVERTENCIA DE EXPIRACIÓN (${timeUntilExpiration}s restantes)`);
          }
          this.warningEmitted = true;
          this.ngZone.run(() => {
            this.expirationWarning$.next();
          });
        }
      }, 10000); // Revisar cada 10 segundos
    });
  }

  /**
   * Detiene el monitoreo
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      if (this.DEBUG) {
        console.log('🛑 TokenMonitor DETENIDO');
      }
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

  /**
   * Retorna los segundos restantes (para debug)
   */
  getSecondsRemaining(): number {
    return this.getTimeUntilExpiration();
  }
}
