import { computed, inject, Injectable, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { TokenService } from '../../features/auth/servicios/token.service';
import { NotificacionInterna, NotificacionesService } from './notificaciones.service';

/**
 * Campana de notificaciones internas persistidas (RF-010 - Módulo de Solicitudes y Permisos).
 * Mantiene abierta la conexión SSE GET /api/notificaciones/internas/stream mientras exista sesión.
 */
@Injectable({ providedIn: 'root' })
export class NotificacionesInternasService {
  private static readonly ESPERA_MINIMA_MS = 5_000;
  private static readonly ESPERA_MAXIMA_MS = 60_000;

  private readonly notificacionesApi = inject(NotificacionesService);
  private readonly tokenService = inject(TokenService);

  readonly items = signal<NotificacionInterna[]>([]);
  readonly noLeidas = computed(() => this.items().filter(n => !n.leida).length);
  readonly pendiente = computed(() => this.noLeidas() > 0);

  private conexion?: Subscription;
  private reintento?: ReturnType<typeof setTimeout>;
  private esperaReintentoMs = NotificacionesInternasService.ESPERA_MINIMA_MS;

  iniciar(): void {
    if (this.conexion || this.reintento || !this.tokenService.isTokenValid()) return;
    this.conectar();
  }

  detener(): void {
    this.conexion?.unsubscribe();
    this.conexion = undefined;
    clearTimeout(this.reintento);
    this.reintento = undefined;
    this.esperaReintentoMs = NotificacionesInternasService.ESPERA_MINIMA_MS;
    this.items.set([]);
  }

  marcarLeida(id: number): void {
    this.items.update(lista =>
      lista.map(n => (n.id === id ? { ...n, leida: true } : n)),
    );
    this.notificacionesApi.marcarInternaLeida(id).subscribe({
      error: () => {},
    });
  }

  marcarTodasLeidas(): void {
    if (!this.pendiente()) return;
    this.items.update(lista => lista.map(n => ({ ...n, leida: true })));
    this.notificacionesApi.marcarTodasInternasLeidas().subscribe({
      error: () => {},
    });
  }

  private conectar(): void {
    this.conexion = this.notificacionesApi.streamInternas().subscribe({
      next: lista => {
        this.esperaReintentoMs = NotificacionesInternasService.ESPERA_MINIMA_MS;
        this.items.set(lista);
      },
      error: () => this.reconectar(),
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
    this.esperaReintentoMs = Math.min(
      this.esperaReintentoMs * 2,
      NotificacionesInternasService.ESPERA_MAXIMA_MS,
    );
  }
}

