import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Colaborador } from '../../models/colaborador.model';
import { BadgeEstadoComponent } from '../../../../shared/components/badge-estado/badge-estado.component';
import { TruncatePipe } from '../../../../shared/pipes/truncate.pipe';
import { MatIconModule } from '@angular/material/icon';
import {
  ActionMenuComponent,
  ActionMenuItem,
} from '../../../../shared/components/action-menu/action-menu.component';

export type CampoOrdenableColaborador = 'identificacion' | 'tipoIdentificacion' | 'nombreCompleto' | 'numProyectos' | 'correoPrincipal' | 'cargo' | 'estado';

export interface OrdenColaboradores {
  campo: CampoOrdenableColaborador;
  asc: boolean;
}

/**
 * Ordena la lista COMPLETA de colaboradores. La página lo aplica antes de paginar para que el
 * orden abarque todos los registros y no solo los 10 de la página visible.
 */
export function ordenarColaboradores(lista: Colaborador[], orden: OrdenColaboradores | null): Colaborador[] {
  if (!orden) return lista;
  const factor = orden.asc ? 1 : -1;

  return [...lista].sort((a, b) => {
    const valorA = (a as any)[orden.campo];
    const valorB = (b as any)[orden.campo];

    if (typeof valorA === 'number' && typeof valorB === 'number') {
      return (valorA - valorB) * factor;
    }

    return String(valorA ?? '').toLowerCase().localeCompare(String(valorB ?? '').toLowerCase(), 'es', { numeric: true }) * factor;
  });
}

@Component({
  selector: 'app-tabla-colaboradores',
  standalone: true,
  imports: [CommonModule, BadgeEstadoComponent, TruncatePipe, ActionMenuComponent, MatIconModule],
  templateUrl: './tabla-colaboradores.component.html',
  styleUrl: './tabla-colaboradores.component.scss',
})
export class TablaColaboradoresComponent {
  @Input() colaboradores: Colaborador[] = [];
  @Input() cargando = false;

  @Output() verDetalle = new EventEmitter<Colaborador>();
  @Output() editar = new EventEmitter<Colaborador>();
  @Output() cambiarEstado = new EventEmitter<Colaborador>();
  @Output() registrarSalida = new EventEmitter<Colaborador>();
  /** La página ordena la lista completa antes de paginar (ver ordenarColaboradores). */
  @Output() ordenCambia = new EventEmitter<OrdenColaboradores>();

  menuAbierto: string | null = null;

  sortField: CampoOrdenableColaborador | null = null;
  sortAsc = true;

  ordenar(campo: CampoOrdenableColaborador): void {
    if (this.sortField === campo) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortField = campo;
      this.sortAsc = true;
    }
    this.ordenCambia.emit({ campo: this.sortField, asc: this.sortAsc });
  }

  direccionOrden(campo: CampoOrdenableColaborador): 'ascending' | 'descending' | 'none' {
    if (this.sortField !== campo) return 'none';
    return this.sortAsc ? 'ascending' : 'descending';
  }

  // La lista ya llega ordenada y paginada desde la página.
  get colaboradoresOrdenados(): Colaborador[] {
    return this.colaboradores;
  }

  toggleMenu(payload: { id: string; event: Event }): void {
    payload.event.stopPropagation();
    this.menuAbierto = this.menuAbierto === payload.id ? null : payload.id;
  }


  accionesColaborador(colaborador: Colaborador): ActionMenuItem[] {
    const activo = colaborador.estado === 'Activo';

    if (activo) {
      return [
        { id: 'ver-mas', label: 'Ver más' },
        { id: 'editar', label: 'Editar' },
        {
          id: 'registrar-salida',
          label: 'Registrar salida',
          danger: true,
        },
      ];
    } else {
      return [
        { id: 'ver-mas', label: 'Ver más' },
        { id: 'editar', label: 'Editar' },
        {
          id: 'activar',
          label: 'Activar',
        },
      ];
    }
  }


  onAccionSeleccionada(accion: ActionMenuItem, colaborador: Colaborador): void {
    this.menuAbierto = null;

    if (accion.id === 'ver-mas') {
      this.verDetalle.emit(colaborador);
      return;
    }

    if (accion.id === 'editar') {
      this.editar.emit(colaborador);
      return;
    }

    if (accion.id === 'registrar-salida') {
      this.registrarSalida.emit(colaborador);
      return;
    }

    if (accion.id === 'activar') {
      this.cambiarEstado.emit(colaborador);
      return;
    }
  }
}

