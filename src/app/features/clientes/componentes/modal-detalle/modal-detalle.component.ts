import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Cliente } from '../../modelos/cliente.model';

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

  expandido = false;

  toggleProyectos(): void {
    this.expandido = !this.expandido;
  }

  onOverlay(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
      this.cerrar.emit();
    }
  }

  getEstadoClass(estado?: string | null): string {
    return (estado ?? 'sin seguimiento')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-');
  }
}
