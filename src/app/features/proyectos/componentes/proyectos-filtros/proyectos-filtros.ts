import { Component, EventEmitter, OnInit, Output, inject } from '@angular/core';
import { NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { ProyectosService } from '../../servicios/proyectos.service';
import { LookupOption } from '../../modelos/proyecto.model';

export interface FiltrosProyecto {
  busqueda: string;
  estado: string;
  tipo: string;
}

@Component({
  selector: 'app-proyectos-filtros',
  standalone: true,
  imports: [
    NgFor,               // ← esto resuelve el error
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './proyectos-filtros.html',
  styleUrl: './proyectos-filtros.scss'
})
export class ProyectosFiltros implements OnInit {
  @Output() filtrosChange = new EventEmitter<FiltrosProyecto>();

  private proyectosService = inject(ProyectosService);

  busqueda = '';
  estado = '';
  tipo = '';

  estados: LookupOption[] = [];
  tipos: LookupOption[] = [];

  ngOnInit(): void {
    this.proyectosService.obtenerLookups().subscribe({
      next: (lookups) => {
        this.estados = lookups.estados;
        this.tipos = lookups.tipos;
      },
      error: (error) => console.error('Error al cargar lookups de filtros:', error)
    });
  }

  emitirFiltros(): void {
    this.filtrosChange.emit({
      busqueda: this.busqueda,
      estado: this.estado,
      tipo: this.tipo
    });
  }
}