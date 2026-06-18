import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-modal-detalle-lider',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal-detalle-lider.html',
  styleUrl: './modal-detalle-lider.scss'
})
export class ModalDetalleLider {
  @Input() lider: any;
  @Output() cerrarModal = new EventEmitter<void>();

  proyectosExpandido = true;

  cerrar() {
    this.cerrarModal.emit();
  }

  toggleProyectos() {
    this.proyectosExpandido = !this.proyectosExpandido;
  }
}