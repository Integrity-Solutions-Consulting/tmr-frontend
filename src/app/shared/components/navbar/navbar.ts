import {
  Component,
  ElementRef,
  HostListener
} from '@angular/core';

import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss'
})
export class Navbar {

  mostrarPerfil = false;

  constructor(
    private elementRef: ElementRef
  ) {}

  togglePerfil(): void {
    this.mostrarPerfil = !this.mostrarPerfil;
  }

  cerrarSesion(): void {
    console.log('Cerrar sesión');

    this.mostrarPerfil = false;
  }

  @HostListener('document:click', ['$event'])
  clickFuera(event: MouseEvent): void {

    const clickDentro =
      this.elementRef.nativeElement.contains(event.target);

    if (!clickDentro) {
      this.mostrarPerfil = false;
    }
  }
}