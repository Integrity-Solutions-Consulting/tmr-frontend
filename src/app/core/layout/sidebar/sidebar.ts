import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss'
})
export class Sidebar {
  /** Estado abierto/cerrado de los grupos colapsables */
  trOpen  = false;   // Time Report
  repOpen = false;   // Reportes
  cfgOpen = false;   // Configuración
}
