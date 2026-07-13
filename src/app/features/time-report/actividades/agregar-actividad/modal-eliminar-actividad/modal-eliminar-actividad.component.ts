import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal-eliminar-actividad',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal-eliminar-actividad.component.html',
  styleUrl: './modal-eliminar-actividad.component.scss'
})
export class ModalEliminarActividadComponent {
  @Input() mostrar = false;
  @Input() descripcionActividad = '';
  @Input() error: string | null = null;
  @Output() cerrarModal = new EventEmitter<void>();
  @Output() confirmarEliminar = new EventEmitter<void>();
}
