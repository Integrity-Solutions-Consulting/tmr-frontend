import { Injectable, OnDestroy } from '@angular/core';
import { TOKEN_CONFIG } from '../config/token.config';

@Injectable({
  providedIn: 'root'
})
export class UserActivityService implements OnDestroy {
  private lastActivityTime: number = Date.now(); // Inicializar al crear el servicio
  private isTracking: boolean = false;
  private throttleTimeout: any;

  constructor() {}

  /**
   * Inicia el monitoreo de actividad del usuario
   * Nota: Los listeners se registran desde AppComponent vía @HostListener
   * Esta función RESETEA el lastActivityTime al momento de inicio del monitoreo
   */
  startTracking(): void {
    if (this.isTracking) {
      console.warn('⚠️ UserActivity: Ya está activo - no reinicializando');
      return;
    }

    this.isTracking = true;
    // IMPORTANTE: Reinicializar lastActivityTime cuando se activa el monitoreo
    // Esto es crucial para que la ventana de actividad sea correcta
    this.lastActivityTime = Date.now();
  }

  /**
   * Detiene el monitoreo de actividad
   */
  stopTracking(): void {
    if (!this.isTracking) return;

    this.isTracking = false;

    if (this.throttleTimeout) {
      clearTimeout(this.throttleTimeout);
    }
  }

  /**
   * Retorna si hay actividad dentro de los últimos N segundos
   * @param withinLastSeconds - Número de segundos a verificar
   */
  isUserActive(withinLastSeconds: number = TOKEN_CONFIG.ACTIVITY_CHECK_WINDOW): boolean {
    const timeSinceLastActivity = this.getSecondsSinceLastActivity();
    const isActive = timeSinceLastActivity <= withinLastSeconds;
    return isActive;
  }

  /**
   * Retorna los segundos desde la última actividad
   */
  getSecondsSinceLastActivity(): number {
    return Math.floor((Date.now() - this.lastActivityTime) / 1000);
  }

  /**
   * Retorna el timestamp de la última actividad
   */
  getLastActivityTime(): number {
    return this.lastActivityTime;
  }

  /**
   * Registra una actividad del usuario (llamado desde AppComponent @HostListener)
   * NOTA: SIEMPRE registra la actividad, incluso antes de startTracking()
   * Esto evita perder eventos durante el startup del componente
   * @param eventName - Nombre del evento (para logging)
   */
  recordActivity(eventName: string = 'activity'): void {
    // Aplicar throttle para evitar actualizaciones muy frecuentes
    if (this.throttleTimeout) {
      return; // Throttled - ignora evento
    }

    const oldTime = this.lastActivityTime;
    this.lastActivityTime = Date.now();

    this.throttleTimeout = setTimeout(() => {
      this.throttleTimeout = null;
    }, TOKEN_CONFIG.ACTIVITY_THROTTLE_MS);
  }

  /**
   * Limpia recursos
   */
  ngOnDestroy(): void {
    this.stopTracking();
  }
}

