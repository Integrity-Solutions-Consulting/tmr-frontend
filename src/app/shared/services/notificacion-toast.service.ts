import { Injectable, signal } from '@angular/core';

export type TipoToast = 'info' | 'exito' | 'warning' | 'error';

export interface ToastNotificacion {
  id: number;
  tipo: TipoToast;
  titulo: string;
  detalle: string;
  cerrando: boolean;
}

/**
 * Toasts no intrusivos arriba a la derecha, independientes entre sí (pueden apilarse): cada llamada crea una
 * tarjeta nueva que se cierra sola, no es una tarjeta que va mutando de estado. El flujo de un aviso manual
 * muestra primero un toast "info" (solicitud enviada) y, cuando llega la confirmación, un segundo toast ya
 * independiente con el resultado (éxito / warning / error). El componente <app-notificacion-toast> vive en
 * el AppComponent y solo pinta este estado.
 */
@Injectable({ providedIn: 'root' })
export class NotificacionToastService {
  readonly toasts = signal<ToastNotificacion[]>([]);

  private siguienteId = 1;
  private temporizadores = new Map<number, ReturnType<typeof setTimeout>>();

  /** Acuse de recibo, p. ej. "la solicitud ya se envió, esperando confirmación". Se cierra solo, rápido. */
  info(titulo: string, detalle: string, cerrarEnMs = 3500): number {
    return this.mostrar('info', titulo, detalle, cerrarEnMs);
  }

  exito(titulo: string, detalle: string, cerrarEnMs = 6000): number {
    return this.mostrar('exito', titulo, detalle, cerrarEnMs);
  }

  /** Resultado sin éxito ni error técnico (p. ej. el envío se omitió por una regla de negocio). */
  warning(titulo: string, detalle: string, cerrarEnMs = 9000): number {
    return this.mostrar('warning', titulo, detalle, cerrarEnMs);
  }

  error(titulo: string, detalle: string, cerrarEnMs = 9000): number {
    return this.mostrar('error', titulo, detalle, cerrarEnMs);
  }

  /** Cierra el toast con su animación de salida antes de que expire su temporizador. */
  cerrar(id: number): void {
    this.limpiarTemporizador(id);
    if (!this.toasts().some(t => t.id === id && !t.cerrando)) return;
    this.toasts.update(lista => lista.map(t => (t.id === id ? { ...t, cerrando: true } : t)));
    setTimeout(() => this.toasts.update(lista => lista.filter(t => t.id !== id)), 200);
  }

  cerrarTodos(): void {
    this.temporizadores.forEach(t => clearTimeout(t));
    this.temporizadores.clear();
    this.toasts.set([]);
  }

  private mostrar(tipo: TipoToast, titulo: string, detalle: string, cerrarEnMs: number): number {
    const id = this.siguienteId++;
    this.toasts.update(lista => [...lista, { id, tipo, titulo, detalle, cerrando: false }]);
    this.temporizadores.set(id, setTimeout(() => this.cerrar(id), cerrarEnMs));
    return id;
  }

  private limpiarTemporizador(id: number): void {
    const t = this.temporizadores.get(id);
    if (t !== undefined) clearTimeout(t);
    this.temporizadores.delete(id);
  }
}
