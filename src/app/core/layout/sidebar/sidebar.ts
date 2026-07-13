import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TokenService } from '../../../features/auth/servicios/token.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss'
})
export class Sidebar {
  private readonly tokenService = inject(TokenService);

  /** Estado abierto/cerrado de los grupos colapsables */
  trOpen  = false;   // Time Report
  repOpen = false;   // Reportes
  cfgOpen = false;   // Configuración

  get isAdmin(): boolean {
    return this.tokenService.isAdmin();
  }

  get isLider(): boolean {
    return this.tokenService.isLider();
  }

  get isColaborador(): boolean {
    return this.tokenService.isColaborador();
  }

  get isGerente(): boolean {
    return this.tokenService.isGerente();
  }

  get isAdministrativo(): boolean {
    return this.tokenService.isAdministrativo();
  }

  hasModule(moduleName: string): boolean {
    return this.tokenService.hasModule(moduleName);
  }
}
