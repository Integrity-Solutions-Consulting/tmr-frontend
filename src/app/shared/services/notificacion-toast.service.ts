import { Injectable, signal } from '@angular/core';

export type EstadoPasoToast = 'pendiente' | 'activo' | 'ok' | 'error' | 'aviso';
export type TipoToast = 'progreso' | 'exito' | 'error' | 'aviso';

export interface PasoToast {
  texto: string;
  estado: EstadoPasoToast;
}

export interface ToastNotificacion {
  id: number;
  tipo: TipoToast;
  titulo: string;
  detalle: string;
  pasos: PasoToast[];
  cerrando: boolean;
}

/**
 * Toasts no intrusivos arriba a la derecha para seguir una petición paso a paso (p. ej. el aviso manual a un
 * colaborador). A diferencia de los pop ups no bloquean la pantalla y pueden apilarse. El componente
 * <app-notificacion-toast> vive en el AppComponent y solo pinta este estado.
 */
@Injectable({ providedIn: 'root' })
export class NotificacionToastService {
  readonly toasts = signal<ToastNotificacion[]>([]);

  private siguienteId = 1;
  private temporizadores = new Map<number, ReturnType<typeof setTimeout>>();

  /** Muestra un toast en progreso; el primer paso queda activo. Devuelve su id para actualizarlo. */
  iniciar(titulo: string, detalle: string, pasos: string[]): number {
    const id = this.siguienteId++;
    this.toasts.update(lista => [
      ...lista,
      {
        id,
        tipo: 'progreso',
        titulo,
        detalle,
        pasos: pasos.map((texto, i) => ({ texto, estado: i === 0 ? 'activo' : 'pendiente' })),
        cerrando: false,
      },
    ]);
    return id;
  }

  /** Marca el paso como terminado y activa el siguiente (si hay). */
  avanzar(id: number, detalle?: string): void {
    this.modificar(id, toast => {
      const activo = toast.pasos.findIndex(p => p.estado === 'activo');
      if (activo === -1) return toast;
      const pasos = toast.pasos.map((p, i) =>
        i === activo ? { ...p, estado: 'ok' as const } : i === activo + 1 ? { ...p, estado: 'activo' as const } : p);
      return { ...toast, pasos, detalle: detalle ?? toast.detalle };
    });
  }

  actualizarDetalle(id: number, detalle: string): void {
    this.modificar(id, toast => ({ ...toast, detalle }));
  }

  /** Cierra el flujo con éxito: los pasos pendientes se completan y el toast se cierra solo. */
  exito(id: number, titulo: string, detalle: string, cerrarEnMs = 6000): void {
    this.terminar(id, 'exito', titulo, detalle, 'ok', cerrarEnMs);
  }

  /** Cierra el flujo con error en el paso activo. */
  error(id: number, titulo: string, detalle: string, cerrarEnMs = 9000): void {
    this.terminar(id, 'error', titulo, detalle, 'error', cerrarEnMs);
  }

  /** Cierra el flujo sin éxito ni error técnico (p. ej. el envío se omitió por una regla de negocio). */
  aviso(id: number, titulo: string, detalle: string, cerrarEnMs = 9000): void {
    this.terminar(id, 'aviso', titulo, detalle, 'aviso', cerrarEnMs);
  }

  /** Cierra el toast con su animación de salida. */
  cerrar(id: number): void {
    this.limpiarTemporizador(id);
    if (!this.toasts().some(t => t.id === id && !t.cerrando)) return;
    this.modificar(id, toast => ({ ...toast, cerrando: true }));
    setTimeout(() => this.toasts.update(lista => lista.filter(t => t.id !== id)), 200);
  }

  cerrarTodos(): void {
    this.temporizadores.forEach(t => clearTimeout(t));
    this.temporizadores.clear();
    this.toasts.set([]);
  }

  private terminar(
    id: number,
    tipo: Exclude<TipoToast, 'progreso'>,
    titulo: string,
    detalle: string,
    estadoPasoActivo: EstadoPasoToast,
    cerrarEnMs: number,
  ): void {
    this.modificar(id, toast => {
      const hayActivo = toast.pasos.some(p => p.estado === 'activo');
      const pasos = toast.pasos.map(p => {
        if (p.estado === 'activo') return { ...p, estado: estadoPasoActivo };
        // En éxito los pasos pendientes ya quedaron cubiertos; en error/aviso se dejan como estaban.
        if (p.estado === 'pendiente' && tipo === 'exito') return { ...p, estado: 'ok' as const };
        return p;
      });
      // Si ya no había paso activo (terminó antes de avanzar) el último refleja el resultado.
      if (!hayActivo && pasos.length > 0 && tipo !== 'exito') {
        pasos[pasos.length - 1] = { ...pasos[pasos.length - 1], estado: estadoPasoActivo };
      }
      return { ...toast, tipo, titulo, detalle, pasos };
    });
    this.limpiarTemporizador(id);
    this.temporizadores.set(id, setTimeout(() => this.cerrar(id), cerrarEnMs));
  }

  private modificar(id: number, cambio: (toast: ToastNotificacion) => ToastNotificacion): void {
    this.toasts.update(lista => lista.map(t => (t.id === id ? cambio(t) : t)));
  }

  private limpiarTemporizador(id: number): void {
    const t = this.temporizadores.get(id);
    if (t !== undefined) clearTimeout(t);
    this.temporizadores.delete(id);
  }
}
