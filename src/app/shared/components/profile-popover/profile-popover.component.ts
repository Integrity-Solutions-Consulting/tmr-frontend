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

  @Output() miPerfil = new EventEmitter<void>();
  @Output() configuracion = new EventEmitter<void>();
  @Output() cambiarPassword = new EventEmitter<void>();
  @Output() cerrarSesion = new EventEmitter<void>();
  @Output() cerrar = new EventEmitter<void>();

  onMiPerfil(): void {
    this.miPerfil.emit();
    this.cerrar.emit();
  }

  onConfiguracion(): void {
    this.configuracion.emit();
    this.cerrar.emit();
  }

  onCambiarPassword(): void {
    this.cambiarPassword.emit();
    this.cerrar.emit();
  }

  onCerrarSesion(): void {
    this.cerrarSesion.emit();
    this.cerrar.emit();
  }
}
