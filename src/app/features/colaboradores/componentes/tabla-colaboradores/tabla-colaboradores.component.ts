import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Colaborador } from '../../models/colaborador.model';
import { BadgeEstadoComponent } from '../../../../shared/components/badge-estado/badge-estado.component';
import { TruncatePipe } from '../../../../shared/pipes/truncate.pipe';

@Component({
  selector: 'app-tabla-colaboradores',
  standalone: true,
  imports: [CommonModule, BadgeEstadoComponent, TruncatePipe],
  templateUrl: './tabla-colaboradores.component.html',
  styleUrl: './tabla-colaboradores.component.scss',
})
export class TablaColaboradoresComponent {
  @Input() colaboradores: Colaborador[] = [];
  @Input() cargando: boolean = false;

  @Output() verDetalle = new EventEmitter<Colaborador>();
  @Output() editar     = new EventEmitter<Colaborador>();
  @Output() eliminar   = new EventEmitter<Colaborador>();

  menuAbierto: string | null = null;

  toggleMenu(id: string, event: Event): void {
    event.stopPropagation();
    this.menuAbierto = this.menuAbierto === id ? null : id;
  }

  // Cierra el menú al hacer click en cualquier parte del documento.
  @HostListener('document:click')
  cerrarMenu(): void {
    this.menuAbierto = null;
  }

  onVerDetalle(col: Colaborador, event: Event): void {
    event.stopPropagation();
    this.menuAbierto = null;
    this.verDetalle.emit(col);
  }

  onEditar(col: Colaborador, event: Event): void {
    event.stopPropagation();
    this.menuAbierto = null;
    this.editar.emit(col);
  }

  onEliminar(col: Colaborador, event: Event): void {
    event.stopPropagation();
    this.menuAbierto = null;
    this.eliminar.emit(col);
  }
}
