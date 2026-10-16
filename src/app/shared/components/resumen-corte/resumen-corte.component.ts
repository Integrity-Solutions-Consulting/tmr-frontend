import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { EstadoEnvioCorte } from '../../services/notificaciones.service';
import { describirPeriodoCorte, ResumenCorteService } from '../../services/resumen-corte.service';
import { HorasFormatPipe } from '../../pipes/horas-format.pipe';
import { ModalBase } from '../modal-base/modal-base';

type FiltroEstado = 'Todos' | EstadoEnvioCorte;

// Detalle del último corte automático de horas: cada colaborador con su resultado (enviado, fallido, omitido).
// Se monta una sola vez en el AppComponent y lo abren el Dashboard y la campana del navbar (ResumenCorteService).
@Component({
  selector: 'app-resumen-corte',
  standalone: true,
  imports: [DatePipe, HorasFormatPipe, ModalBase],
  templateUrl: './resumen-corte.component.html',
  styleUrl: './resumen-corte.component.scss',
})
export class ResumenCorteComponent {
  protected readonly servicio = inject(ResumenCorteService);

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
    return r ? describirPeriodoCorte(r) : '';
  });

  constructor() {
    // Se abre desde el Dashboard o desde la campana del navbar: siempre empieza mostrando todos
    effect(() => {
      if (this.servicio.detalleVisible()) this.filtro.set('Todos');
    });
  }

  protected claseEstado(estado: EstadoEnvioCorte): string {
    return `estado-pill estado-pill--${estado.toLowerCase()}`;
  }
}
