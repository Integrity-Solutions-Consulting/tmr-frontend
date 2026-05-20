import { Component } from '@angular/core';
import { ProfilePopoverComponent } from '../../../shared/components/profile-popover/profile-popover.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [ProfilePopoverComponent],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss'
})
export class Navbar {
  perfilAbierto = false;

  togglePerfil(): void {
    this.perfilAbierto = !this.perfilAbierto;
  }

  cerrarPerfil(): void {
    this.perfilAbierto = false;
  }

  cerrarSesion(): void {
    this.perfilAbierto = false;
  }
}
