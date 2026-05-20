import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-success-modal',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  templateUrl: './success-modal.component.html',
  styleUrl: './success-modal.component.scss'
})
export class SuccessModalComponent {
  @Input() visible = false;
  @Input() mensaje = 'Operacion realizada exitosamente';
  @Input() textoBoton = 'Aceptar';

  @Output() cerrar = new EventEmitter<void>();

  cerrarModal(): void {
    this.cerrar.emit();
  }
}
