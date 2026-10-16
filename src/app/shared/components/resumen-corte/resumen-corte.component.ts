import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { EstadoEnvioCorte } from '../../services/notificaciones.service';
import { ResumenCorteService } from '../../services/resumen-corte.service';
import { ModalScrollLockService } from '../../services/modal-scroll-lock.service';
import { HorasFormatPipe } from '../../pipes/horas-format.pipe';
import { ModalBase } from '../modal-base/modal-base';

type FiltroEstado = 'Todos' | EstadoEnvioCorte;

// Popup con el resultado del corte automático de horas (enviados, fallidos, omitidos) y su detalle por colaborador.
// Se monta una sola vez en el AppComponent y se controla desde ResumenCorteService (SSE).
@Component({
  selector: 'app-resumen-corte',
  standalone: true,
  imports: [DatePipe, HorasFormatPipe, ModalBase],
  templateUrl: './resumen-corte.component.html',
  styleUrl: './resumen-corte.component.scss',
})
export class ResumenCorteComponent {
  protected readonly servicio = inject(ResumenCorteService);
  private readonly scrollLock = inject(ModalScrollLockService);

  protected readonly resumen = this.servicio.resumen;
  protected readonly filtro = signal<FiltroEstado>('Todos');

  protected readonly filtros = computed(() => {
    const r = this.resumen();
    return [
      { valor: 'Todos' as FiltroEstado, texto: 'Todos', cantidad: r?.empleados.length ?? 0 },
      { valor: 'Enviado' as FiltroEstado, texto: 'Enviados', cantidad: r?.enviados ?? 0 },
      { valor: 'Fallido' as FiltroEstado, texto: 'Fallidos', cantidad: r?.fallidos ?? 0 },
      { valor: 'Omitido' as FiltroEstado, texto: 'Omitidos', cantidad: r?.omitidos ?? 0 },
      { valor: 'Pendiente' as FiltroEstado, texto: 'Pendientes', cantidad: r?.pendientes ?? 0 },
    ].filter(f => f.valor !== 'Pendiente' || f.cantidad > 0);
  });

  protected readonly empleadosFiltrados = computed(() => {
    const empleados = this.resumen()?.empleados ?? [];
    const filtro = this.filtro();
    return filtro === 'Todos' ? empleados : empleados.filter(e => e.estado === filtro);
  });

  // "1 al 15 de octubre de 2026"
  protected readonly periodo = computed(() => {
    const r = this.resumen();
    if (!r) return '';
    const inicio = this.fechaLocal(r.inicioPeriodo);
    const fin = this.fechaLocal(r.finPeriodo);
    const mes = fin.toLocaleDateString('es-EC', { month: 'long', year: 'numeric' });
    return `${inicio.getDate()} al ${fin.getDate()} de ${mes}`;
  });

  constructor() {
    // El popup bloquea el scroll de la página igual que los modales (el detalle lo hace app-modal-base)
    let bloqueado = false;
    effect(() => {
      const visible = this.servicio.popupVisible();
      if (visible && !bloqueado) this.scrollLock.lock();
      if (!visible && bloqueado) this.scrollLock.unlock();
      bloqueado = visible;
    });
  }

  protected verDetalle(): void {
    this.filtro.set('Todos');
    this.servicio.verDetalle();
  }

  protected claseEstado(estado: EstadoEnvioCorte): string {
    return `estado-pill estado-pill--${estado.toLowerCase()}`;
  }

  // Las fechas del período llegan como yyyy-MM-dd: se leen en hora local para no correr un día
  private fechaLocal(fecha: string): Date {
    const [anio, mes, dia] = fecha.split('-').map(Number);
    return new Date(anio, mes - 1, dia);
  }
}
