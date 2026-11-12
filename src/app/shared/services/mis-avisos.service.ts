import { inject, Injectable, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { TokenService } from '../../features/auth/servicios/token.service';
import { AvisoColaborador, NotificacionesService } from './notificaciones.service';

/**
 * Campana de cualquier colaborador: los correos de horas faltantes que se le enviaron (aviso de su líder desde
 * Seguimiento o del corte de quincena / fin de mes). Mantiene abierta la conexión SSE GET /notificaciones/mias/stream
 * mientras hay sesión, así un aviso nuevo aparece al instante. Son solo avisos: no abren nada.
 */
@Injectable({ providedIn: 'root' })
export class MisAvisosService {
  private static readonly ESPERA_MINIMA_MS = 5_000;
  private static readonly ESPERA_MAXIMA_MS = 60_000;

  private notificaciones = inject(NotificacionesService);
  private tokenService = inject(TokenService);

  readonly avisos = signal<AvisoColaborador[]>([]);
  /** Punto rojo de la campana: llegó un aviso después de la última vez que se abrió. */
  readonly pendiente = signal(false);

  private conexion?: Subscription;
  private reintento?: ReturnType<typeof setTimeout>;
  private esperaReintentoMs = MisAvisosService.ESPERA_MINIMA_MS;

  /** Abre la conexión si hay sesión y no está abierta. Se puede llamar en cada navegación. */
  iniciar(): void {
    if (this.conexion || this.reintento || !this.tokenService.isTokenValid()) return;
    this.conectar();
  }

  /** Cierra la conexión y limpia los avisos (al cerrar sesión). */
  detener(): void {
    this.conexion?.unsubscribe();
    this.conexion = undefined;
    clearTimeout(this.reintento);
    this.reintento = undefined;
    this.esperaReintentoMs = MisAvisosService.ESPERA_MINIMA_MS;
    this.avisos.set([]);
    this.pendiente.set(false);
  }

  /** Al abrir la campana los avisos dejan de contar como nuevos (siguen en la lista). */
  marcarVistos(): void {
    const ultimo = this.avisos()[0];
    if (!ultimo) return;
    try {
      localStorage.setItem(this.claveVistos(), ultimo.fechaEnvio);
    } catch {
      // Sin almacenamiento el punto puede volver a aparecer al recargar
    }
    this.pendiente.set(false);
  }

  private conectar(): void {
    this.conexion = this.notificaciones.streamMisAvisos().subscribe({
      next: avisos => {
        this.esperaReintentoMs = MisAvisosService.ESPERA_MINIMA_MS;
        this.avisos.set(avisos);
        this.pendiente.set(this.hayNuevos(avisos));
      },
      error: err => {
        console.warn('Stream de avisos desconectado; se reintenta:', err);
        this.reconectar();
      },
      // El backend no cierra el stream; si se cierra (reinicio, proxy) se vuelve a abrir
      complete: () => this.reconectar(),
    });
  }

  private reconectar(): void {
    this.conexion = undefined;
    if (!this.tokenService.isTokenValid()) return;
    clearTimeout(this.reintento);
    this.reintento = setTimeout(() => {
      this.reintento = undefined;
      if (this.tokenService.isTokenValid()) this.conectar();
    }, this.esperaReintentoMs);
    this.esperaReintentoMs = Math.min(this.esperaReintentoMs * 2, MisAvisosService.ESPERA_MAXIMA_MS);
  }

  // Los avisos llegan del más nuevo al más antiguo: hay nuevos si el primero es posterior al último visto
  private hayNuevos(avisos: AvisoColaborador[]): boolean {
    if (avisos.length === 0) return false;
    let vistoHasta: string | null = null;
    try {
      vistoHasta = localStorage.getItem(this.claveVistos());
    } catch {
      vistoHasta = null;
    }
    return !vistoHasta || new Date(avisos[0].fechaEnvio).getTime() > new Date(vistoHasta).getTime();
  }

  // Por usuario: en el mismo navegador cada persona tiene su propio "visto"
  private claveVistos(): string {
    const token = this.tokenService.getToken();
    const usuario = token ? this.tokenService.decodeToken(token)?.sub ?? 'anonimo' : 'anonimo';
    return `tmr-avisos-vistos:${usuario}`;
  }
}
