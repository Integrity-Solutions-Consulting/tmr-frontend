import { Injectable, signal } from '@angular/core';
import { Observable, Subject, lastValueFrom, takeUntil } from 'rxjs';

// sm - Error propio para identificar que el usuario canceló la descarga desde el toast de progreso.
export class DescargaCanceladaError extends Error {
  constructor() {
    super('Descarga cancelada por el usuario.');
  }
}

export type FormatoDescarga = 'pdf' | 'xlsx';

export interface EstadoProgresoDescarga {
  visible: boolean;
  cerrando: boolean;
  titulo: string;
  detalle: string;
  progreso: number;
  indeterminado: boolean;
  cancelando: boolean;
}

/**
 * Lo que recibe cada tarea de descarga: reportar avance, esperar peticiones HTTP cancelables y
 * comprobar si el usuario canceló (las utilidades de exportación lo llaman justo antes de guardar).
 */
export interface ContextoDescarga {
  actualizar(progreso: number, detalle: string): void;
  esperar<T>(peticion: Observable<T>): Promise<T>;
  verificarCancelacion(): void;
}

const ESTADO_INICIAL: EstadoProgresoDescarga = {
  visible: false,
  cerrando: false,
  titulo: '',
  detalle: '',
  progreso: 0,
  indeterminado: true,
  cancelando: false,
};

/**
 * Toast de progreso de descarga compartido por toda la app (mismo diseño que nació en Seguimiento).
 * El componente <app-descarga-progreso> vive en el AppComponent y solo pinta este estado.
 */
@Injectable({ providedIn: 'root' })
export class DescargaProgresoService {
  readonly estado = signal<EstadoProgresoDescarga>(ESTADO_INICIAL);

  private cancelar$ = new Subject<void>();
  private cancelada = false;
  private activa = false;
  private temporizadorCierre?: ReturnType<typeof setTimeout>;

  readonly contexto: ContextoDescarga = {
    actualizar: (progreso, detalle) => this.actualizar(progreso, detalle),
    esperar: (peticion) => this.esperarCancelable(peticion),
    verificarCancelacion: () => this.verificarCancelacion(),
  };

  get enCurso(): boolean {
    return this.activa;
  }

  /**
   * Flujo estándar de una descarga de un archivo: muestra el toast, ejecuta la tarea, completa al 100% y cierra.
   * Si el usuario cancela devuelve `undefined` sin mostrar nada más; cualquier otro error cierra el toast y se relanza.
   */
  async ejecutar<T>(formato: FormatoDescarga, tarea: (ctx: ContextoDescarga) => Promise<T>): Promise<T | undefined> {
    if (this.activa) return undefined;
    this.iniciar(formato);
    try {
      // sm - Deja que el toast se pinte antes de la generación (jsPDF/ExcelJS bloquean el hilo mientras arman el archivo).
      await new Promise(resolve => setTimeout(resolve, 50));
      this.actualizar(10, 'Preparando datos...');
      const resultado = await tarea(this.contexto);
      await this.finalizar();
      return resultado;
    } catch (error) {
      this.cerrar();
      if (error instanceof DescargaCanceladaError) return undefined;
      throw error;
    }
  }

  // sm - Muestra el toast. La descarga múltiple avanza por archivo/reporte (progreso real);
  // la de un solo archivo arranca indeterminada hasta que la tarea reporta su primera etapa.
  iniciar(formato: FormatoDescarga, cantidad = 1): void {
    clearTimeout(this.temporizadorCierre);
    this.cancelada = false;
    this.activa = true;
    this.estado.set({
      visible: true,
      cerrando: false,
      titulo: `Descargando ${formato === 'pdf' ? 'PDF' : 'Excel'}${cantidad > 1 ? ` (${cantidad} reportes)` : ''}`,
      detalle: cantidad > 1 ? `0 de ${cantidad} reportes generados` : 'Generando reporte...',
      progreso: 0,
      indeterminado: cantidad === 1,
      cancelando: false,
    });
  }

  // sm - Actualiza el porcentaje y el texto del toast; al recibir un valor la barra deja de ser indeterminada.
  actualizar(progreso: number, detalle: string): void {
    if (!this.activa || this.cancelada) return;
    this.estado.update(estado => ({
      ...estado,
      progreso: Math.min(100, Math.max(0, Math.round(progreso))),
      detalle,
      indeterminado: false,
    }));
  }

  // sm - Deja la barra en 100%, espera un instante para que se vea completa y cierra el toast con su animación de salida.
  async finalizar(): Promise<void> {
    this.actualizar(100, 'Descarga completada');
    await new Promise(resolve => setTimeout(resolve, 600));
    this.cerrar();
  }

  // sm - Cierra el toast con la animación de salida y luego lo quita del DOM.
  cerrar(): void {
    this.activa = false;
    if (!this.estado().visible) return;
    this.estado.update(estado => ({ ...estado, cerrando: true }));
    clearTimeout(this.temporizadorCierre);
    this.temporizadorCierre = setTimeout(() => {
      this.estado.update(estado => ({ ...estado, visible: false, cerrando: false }));
    }, 200);
  }

  // sm - Botón "Cancelar" del toast: corta la petición HTTP en curso y evita que se guarde el archivo.
  cancelar(): void {
    if (!this.activa || this.cancelada) return;
    this.cancelada = true;
    this.cancelar$.next();
    this.estado.update(estado => ({ ...estado, detalle: 'Cancelando...', cancelando: true }));
  }

  get fueCancelada(): boolean {
    return this.cancelada;
  }

  verificarCancelacion(): void {
    if (this.cancelada) throw new DescargaCanceladaError();
  }

  // sm - Espera una petición HTTP permitiendo cancelarla desde el toast; si se cancela lanza DescargaCanceladaError.
  async esperarCancelable<T>(peticion: Observable<T>): Promise<T> {
    this.verificarCancelacion();
    try {
      return await lastValueFrom(peticion.pipe(takeUntil(this.cancelar$)));
    } catch (error) {
      this.verificarCancelacion();
      throw error;
    }
  }
}
