import { inject, Injectable, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { TokenService } from '../../features/auth/servicios/token.service';
import { NotificacionesService, ResumenCorte } from './notificaciones.service';

/** "1 al 15 de octubre de 2026" (las fechas llegan como yyyy-MM-dd y se leen en hora local para no correr un día). */
export function describirPeriodoCorte(resumen: ResumenCorte): string {
  const leer = (fecha: string) => {
    const [anio, mes, dia] = fecha.split('-').map(Number);
    return new Date(anio, mes - 1, dia);
  };
  const inicio = leer(resumen.inicioPeriodo);
  const fin = leer(resumen.finPeriodo);
  return `${inicio.getDate()} al ${fin.getDate()} de ${fin.toLocaleDateString('es-EC', { month: 'long', year: 'numeric' })}`;
}

/**
 * Retroalimentación del corte automático de horas (flujo 1) para Administrador y Líder.
 * Mantiene abierta la conexión SSE GET /notificaciones/cortes/stream mientras hay sesión: el Dashboard muestra
 * enviados, fallidos y omitidos del último corte (en vivo mientras se procesa) y la campana del navbar avisa
 * de cada corte nuevo. El modal de detalle (<app-resumen-corte>, en el AppComponent) se abre desde ambos.
 */
@Injectable({ providedIn: 'root' })
export class ResumenCorteService {
  private static readonly ESPERA_MINIMA_MS = 5_000;
  private static readonly ESPERA_MAXIMA_MS = 60_000;

  private notificaciones = inject(NotificacionesService);
  private tokenService = inject(TokenService);

  readonly resumen = signal<ResumenCorte | null>(null);
  readonly detalleVisible = signal(false);
  /** Punto rojo de la campana del navbar: hay un corte (o una nueva ejecución) que aún no se vio desde la campana. */
  readonly campanaPendiente = signal(false);

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

  /** Cierra la conexión y el detalle (al cerrar sesión). */
  detener(): void {
    this.conexion?.unsubscribe();
    this.conexion = undefined;
    clearTimeout(this.reintento);
    this.reintento = undefined;
    this.esperaReintentoMs = ResumenCorteService.ESPERA_MINIMA_MS;
    this.resumen.set(null);
    this.detalleVisible.set(false);
    this.campanaPendiente.set(false);
  }

  /** Al abrir la campana el aviso del corte deja de contar como nuevo (sigue en la lista hasta el siguiente corte). */
  marcarCampanaVista(): void {
    const resumen = this.resumen();
    if (!resumen) return;
    try {
      localStorage.setItem(this.claveCampana(resumen), '1');
    } catch {
      // Sin almacenamiento el punto puede volver a aparecer al recargar
    }
    this.campanaPendiente.set(false);
  }

  /** Lista de colaboradores con su resultado (desde el Dashboard o la campana). */
  verDetalle(): void {
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
    this.campanaPendiente.set(!!resumen && !this.leerCampana(resumen));
  }

  private leerCampana(resumen: ResumenCorte): boolean {
    try {
      return localStorage.getItem(this.claveCampana(resumen)) !== null;
    } catch {
      return false;
    }
  }

  // Por usuario y por ejecución: en el mismo navegador un admin y un líder ven cada uno su aviso, y si el mismo
  // corte se vuelve a ejecutar (reinicio, recuperación) el punto de la campana aparece de nuevo
  private claveCampana(resumen: ResumenCorte): string {
    const token = this.tokenService.getToken();
    const usuario = token ? this.tokenService.decodeToken(token)?.sub ?? 'anonimo' : 'anonimo';
    const ejecucion = resumen.ejecucion ? `:${new Date(resumen.ejecucion).getTime()}` : '';
    return `tmr-corte-campana:${usuario}:${new Date(resumen.fechaCorte).getTime()}${ejecucion}`;
  }
}
