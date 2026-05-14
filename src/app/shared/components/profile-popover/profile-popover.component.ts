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
  @Input() nombre = 'Marlene Canizares';
  @Input() correo = 'marlene.canizares@integritysolutions.com.ec';

  @Output() cerrar = new EventEmitter<void>();
  @Output() cerrarSesion = new EventEmitter<void>();

  onCerrarSesion(): void {
    this.cerrarSesion.emit();
    this.cerrar.emit();
  }
}
