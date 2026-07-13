import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal-eliminar-lider',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal-eliminar-lider.component.html',
  styleUrl: './modal-eliminar-lider.component.scss'
})
export class ModalEliminarLiderComponent {
  @Input() mostrar = false;
  @Input() nombreLider = '';
  @Input() error: string | null = null;
  @Output() cerrarModal = new EventEmitter<void>();
  @Output() confirmarEliminar = new EventEmitter<void>();
}