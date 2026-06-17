import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal-confirmacion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal-confirmacion.html',
  styleUrl: './modal-confirmacion.scss'
})
export class ModalConfirmacion {
  @Input() mostrar = false;
  @Input() mensaje = 'El nuevo líder ha sido agregado exitosamente';
  @Output() cerrarModal = new EventEmitter<void>();

  cerrar() {
    this.cerrarModal.emit();
  }
}
