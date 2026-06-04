import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Cliente, EstadoProyecto } from '../../modelos/cliente.model';

@Component({
  selector: 'app-modal-detalle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal-detalle.component.html',
  styleUrl: './modal-detalle.component.scss',
})
export class ModalDetalleComponent {
  @Input() cliente!: Cliente;
  @Output() cerrar = new EventEmitter<void>();

  // ── Estado expansión proyectos ────────────────────────────
  expandido = false;

  // ── Toggle proyectos ──────────────────────────────────────
  toggleProyectos(): void {
    this.expandido = !this.expandido;
  }

  // ── Clase CSS según estado proyecto ──────────────────────
  getClase(estado: EstadoProyecto): string {
    const mapa: Record<EstadoProyecto, string> = {
      'En progreso': 'proyecto-estado en-progreso',
      'Completado':  'proyecto-estado completado',
      'Pausado':     'proyecto-estado pausado',
      'Cancelado':   'proyecto-estado cancelado',
    };
    return mapa[estado] || 'proyecto-estado';
  }

  // ── Cerrar con overlay ────────────────────────────────────
  onOverlay(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
      this.cerrar.emit();
    }
  }
}
