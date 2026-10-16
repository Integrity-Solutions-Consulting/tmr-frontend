import { inject, Injectable, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { TokenService } from '../../features/auth/servicios/token.service';
import { NotificacionesService, ResumenCorte } from './notificaciones.service';

type Visto = 'proceso' | 'final';

/**
 * Retroalimentación del corte automático de horas (flujo 1) para Administrador y Líder.
 * Mantiene abierta la conexión SSE GET /notificaciones/cortes/stream mientras hay sesión y muestra el popup
 * con enviados, fallidos y omitidos: en vivo cuando el corte se procesa, o al entrar si el último corte
 * pasó mientras el usuario no estaba. El componente <app-resumen-corte> vive en el AppComponent y solo pinta este estado.
 */
@Injectable({ providedIn: 'root' })
export class ResumenCorteService {
  private static readonly ESPERA_MINIMA_MS = 5_000;
  private static readonly ESPERA_MAXIMA_MS = 60_000;

  private notificaciones = inject(NotificacionesService);
  private tokenService = inject(TokenService);

  readonly resumen = signal<ResumenCorte | null>(null);
  readonly popupVisible = signal(false);
  readonly detalleVisible = signal(false);

  private conexion?: Subscription;
  private reintento?: ReturnType<typeof setTimeout>;
  private esperaReintentoMs = ResumenCorteService.ESPERA_MINIMA_MS;

  /** Solo Administrador y Líder tienen NOTIFICACIONES_EJECUTAR (script 14). */
  puedeVer(): boolean {
    return this.tokenService.isTokenValid()
      && (this.tokenService.hasRole('ADMINISTRADOR') || this.tokenService.isLider());
  }

  /** Abre la conexión si corresponde y no está abierta. Se puede llamar en cada navegación. */
  iniciar(): void {
    if (this.conexion || this.reintento || !this.puedeVer()) return;
    this.conectar();
  }

  /** Cierra la conexión y el popup (al cerrar sesión). */
  detener(): void {
    this.conexion?.unsubscribe();
    this.conexion = undefined;
    clearTimeout(this.reintento);
    this.reintento = undefined;
    this.esperaReintentoMs = ResumenCorteService.ESPERA_MINIMA_MS;
    this.resumen.set(null);
    this.popupVisible.set(false);
    this.detalleVisible.set(false);
  }

  /** "Entendido": no se vuelve a mostrar este corte (salvo una vez más cuando termine, si se cerró en proceso). */
  cerrarPopup(): void {
    this.marcarVisto();
    this.popupVisible.set(false);
  }

  /** "Ver más": pasa del popup a la lista de colaboradores con su resultado. */
  verDetalle(): void {
    this.marcarVisto();
    this.popupVisible.set(false);
    this.detalleVisible.set(true);
  }

  cerrarDetalle(): void {
    this.detalleVisible.set(false);
  }

  private conectar(): void {
    this.conexion = this.notificaciones.streamCortes().subscribe({
      next: resumen => {
        this.esperaReintentoMs = ResumenCorteService.ESPERA_MINIMA_MS;
        this.alRecibir(resumen);
      },
      error: err => {
        console.warn('Stream de cortes desconectado; se reintenta:', err);
        this.reconectar();
      },
      // El backend no cierra el stream; si se cierra (reinicio, proxy) se vuelve a abrir
      complete: () => this.reconectar(),
    });
  }

  private reconectar(): void {
    this.conexion = undefined;
    if (!this.puedeVer()) return;
    clearTimeout(this.reintento);
    this.reintento = setTimeout(() => {
      this.reintento = undefined;
      if (this.puedeVer()) this.conectar();
    }, this.esperaReintentoMs);
    this.esperaReintentoMs = Math.min(this.esperaReintentoMs * 2, ResumenCorteService.ESPERA_MAXIMA_MS);
  }

  private alRecibir(resumen: ResumenCorte | null): void {
    this.resumen.set(resumen);
    if (!resumen || this.popupVisible() || this.detalleVisible()) return;

    const visto = this.leerVisto(resumen.fechaCorte);
    // Nunca visto, o se cerró mientras se procesaba y ya terminó: se muestra el resultado final
    if (!visto || (visto === 'proceso' && !resumen.enProceso)) {
      this.popupVisible.set(true);
    }
  }

  private marcarVisto(): void {
    const resumen = this.resumen();
    if (!resumen) return;
    try {
      localStorage.setItem(this.claveVisto(resumen.fechaCorte), resumen.enProceso ? 'proceso' : 'final');
    } catch {
      // Sin almacenamiento disponible el popup simplemente puede volver a aparecer
    }
  }

  private leerVisto(fechaCorte: string): Visto | null {
    try {
      return localStorage.getItem(this.claveVisto(fechaCorte)) as Visto | null;
    } catch {
      return null;
    }
  }

  // Por usuario: en el mismo navegador un admin y un líder ven cada uno su popup
  private claveVisto(fechaCorte: string): string {
    const token = this.tokenService.getToken();
    const usuario = token ? this.tokenService.decodeToken(token)?.sub ?? 'anonimo' : 'anonimo';
    return `tmr-corte-visto:${usuario}:${new Date(fechaCorte).getTime()}`;
  }
}
