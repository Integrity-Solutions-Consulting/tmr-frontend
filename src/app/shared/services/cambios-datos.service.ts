import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';

/**
 * sm - Aviso entre pestañas de que se guardaron datos que afectan los cálculos de horas (asignaciones de proyectos,
 * colaboradores, actividades, feriados). Lo emite CambiosDatosInterceptor tras cada guardado exitoso y lo escuchan
 * las pantallas abiertas en OTRAS pestañas (Seguimiento) para recargarse solas sin que el usuario pulse F5.
 * En la misma pestaña no hace falta: al entrar a una pantalla ya se piden los datos de nuevo.
 */
@Injectable({ providedIn: 'root' })
export class CambiosDatosService implements OnDestroy {
  private readonly canal: BroadcastChannel | null = (() => {
    try {
      return typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('tmr-cambios-datos') : null;
    } catch {
      return null;
    }
  })();
  private readonly cambiosSubject = new Subject<void>();

  /** Emite cuando otra pestaña guardó datos. */
  readonly cambios$: Observable<void> = this.cambiosSubject.asObservable();

  constructor() {
    if (this.canal) this.canal.onmessage = () => this.cambiosSubject.next();
  }

  notificar(): void {
    try {
      this.canal?.postMessage({ fecha: Date.now() });
    } catch {
      // sm - Sin BroadcastChannel solo se pierde la recarga automática; la pantalla se refresca al volver a la pestaña.
    }
  }

  ngOnDestroy(): void {
    this.canal?.close();
  }
}
