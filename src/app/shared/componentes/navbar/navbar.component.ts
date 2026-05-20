import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent {
  mostrarPerfil = false;

  togglePerfil() {
    this.mostrarPerfil = !this.mostrarPerfil;
  }

  cerrarSesion() {
    console.log('Cerrando sesión...');
    // Aquí iría tu lógica de AuthService.logout()
  }
}
