import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-gestor-plantillas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gestor-plantillas.component.html',
  styleUrl: './gestor-plantillas.component.scss'
})
export class GestorPlantillasComponent {
  // Aquí se administrará el motor de plantillas de forma independiente
}
