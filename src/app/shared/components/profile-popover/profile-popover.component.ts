import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-profile-popover',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  templateUrl: './profile-popover.component.html',
  styleUrl: './profile-popover.component.scss'
})
export class ProfilePopoverComponent {
  @Input() abierto = false;
  @Input() nombre = '';
  @Input() correo = '';

  @Output() cerrar = new EventEmitter<void>();
  @Output() cerrarSesion = new EventEmitter<void>();
  @Output() cambiarPassword = new EventEmitter<void>();

  onCambiarPassword(): void {
    this.cambiarPassword.emit();
    this.cerrar.emit();
  }

  onCerrarSesion(): void {
    this.cerrarSesion.emit();
    this.cerrar.emit();
  }
}
