import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TokenService } from '../../../features/auth/servicios/token.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
  host: {
    '[class.sidebar-host--collapsed]': 'collapsed'
  }
})
export class Sidebar {
  private readonly tokenService = inject(TokenService);
  readonly themeService = inject(ThemeService);

  get logoSrc(): string {
    return this.themeService.activeTheme() === 'dark'
      ? 'assets/imagenes/logo_isc2.png'
      : 'assets/imagenes/logo-isc.png';
  }

  /** Estado abierto/cerrado de los grupos colapsables */
  trOpen  = false;   // Time Report
  repOpen = false;   // Reportes
  cfgOpen = false;   // Configuración

  collapsed = false;

  toggleCollapsed(): void {
    this.collapsed = !this.collapsed;
  }

  /**
   * Los grupos no pierden sus destinos cuando el menú está reducido: el primer
   * clic recupera el ancho normal y muestra las opciones correspondientes.
   */
  toggleGroup(group: 'timeReport' | 'reportes' | 'configuracion'): void {
    const wasCollapsed = this.collapsed;

    if (wasCollapsed) {
      this.collapsed = false;
    }

    if (group === 'timeReport') {
      this.trOpen = wasCollapsed || !this.trOpen;
      return;
    }

    if (group === 'reportes') {
      this.repOpen = wasCollapsed || !this.repOpen;
      return;
    }

    this.cfgOpen = wasCollapsed || !this.cfgOpen;
  }

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
