import { Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DashboardHistorico, EstadoHistorico, Semaforo } from '../../../modelos/dashboard-ejecutivo.model';
import {
  anchoBarra,
  claseSemaforo,
  etiquetaEstado,
  etiquetaMes,
  formatoFecha,
  formatoHoras,
  formatoPorcentaje,
} from '../dashboard-ejecutivo.utils';

// sm - Fila de "Brecha y recurrencia por colaborador" (sección 7.2). La arma el dashboard con el periodo y el histórico.
export interface BrechaColaborador {
  idEmpleado: number;
  colaborador: string;
  esperadas: number;
  reportadas: number;
  pendientes: number;
  porcentaje: number;
  semaforo: Semaforo;
  ocasionesConAtraso: number;
  // sm - Detalle de los cortes con atraso para el tooltip (ej. "1-15 Sep: 4 días incompletos").
  detalleAtrasos: string;
  recurrente: boolean;
  // sm - Sin horas esperadas en el periodo elegido (aparece solo por sus atrasos en la ventana).
  sinHorasPeriodo?: boolean;
  historial: { etiqueta: string; estado: EstadoHistorico | 'SinDatos'; porcentaje: number | null }[];
}

/**
 * sm - Bloque "Brecha y recurrencia / Histórico de cumplimiento" del Dashboard ejecutivo (sección 7.2 y RF 15).
 * Se separó del dashboard para que su hoja de estilos quede bajo el presupuesto de Angular; el estado del periodo,
 * los filtros y el panel de detalle siguen en el dashboard, que recibe las acciones por los eventos.
 */
@Component({
  selector: 'app-brecha-historico',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatTooltipModule],
  templateUrl: './brecha-historico.component.html',
  styleUrl: './brecha-historico.component.scss',
})
export class BrechaHistoricoComponent {
  readonly colaboradores = input<BrechaColaborador[]>([]);
  readonly historico = input<DashboardHistorico | null>(null);
  readonly cargandoHistorico = input(false);
  readonly mesesVentana = input<6 | 12>(6);
  readonly umbralRecurrencia = input(3);
  readonly periodo = input<{ anio: number; mes: number } | null>(null);
  // sm - Clave del detalle abierto en el panel lateral (para resaltar la fila del colaborador).
  readonly seleccion = input<string | null>(null);

  readonly abrirColaborador = output<{ idEmpleado: number; colaborador: string }>();
  readonly cambiarVentana = output<6 | 12>();
  readonly cambiarUmbral = output<string>();
  readonly seleccionarMes = output<{ anio: number; mes: number }>();

  readonly formatoFecha = formatoFecha;
  readonly formatoHoras = formatoHoras;
  readonly formatoPorcentaje = formatoPorcentaje;
  readonly claseSemaforo = claseSemaforo;
  readonly etiquetaEstado = etiquetaEstado;
  readonly etiquetaMes = etiquetaMes;
  readonly anchoBarra = anchoBarra;

  readonly pestana = signal<'brecha' | 'historico'>('brecha');
  readonly mostrarTodos = signal(false);

  readonly brechaVisible = computed(() =>
    this.mostrarTodos() ? this.colaboradores() : this.colaboradores().slice(0, 8),
  );

  readonly maximaBrecha = computed(() => Math.max(1, ...this.colaboradores().map((c) => c.pendientes)));
}
