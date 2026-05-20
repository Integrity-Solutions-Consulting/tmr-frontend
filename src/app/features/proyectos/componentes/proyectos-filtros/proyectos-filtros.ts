import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

export interface FiltrosProyecto {
  busqueda: string;
  estado: string;
  tipo: string;
}

@Component({
  selector: 'app-proyectos-filtros',
  standalone: true,
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './proyectos-filtros.html',
  styleUrl: './proyectos-filtros.scss'
})
export class ProyectosFiltros {
  @Output() filtrosChange = new EventEmitter<FiltrosProyecto>();

  busqueda = '';
  estado = '';
  tipo = '';

  emitirFiltros(): void {
    this.filtrosChange.emit({
      busqueda: this.busqueda,
      estado: this.estado,
      tipo: this.tipo
    });
  }
}
