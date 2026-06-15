import { Component, EventEmitter, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ProyectosService } from '../../servicios/proyectos.service';
import { LookupOption } from '../../modelos/proyecto.model';

export interface FiltrosProyecto {
  busqueda: string;
  estados: string[];
  tipos: string[];
}

@Component({
  selector: 'app-proyectos-filtros',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule],
  templateUrl: './proyectos-filtros.html',
  styleUrl: './proyectos-filtros.scss'
})
export class ProyectosFiltros implements OnInit {
  @Output() filtrosChange = new EventEmitter<FiltrosProyecto>();

  private proyectosService = inject(ProyectosService);

  busqueda = '';
  estadosSeleccionados: string[] = [];
  tiposSeleccionados: string[] = [];

  estados: LookupOption[] = [];
  tipos: LookupOption[] = [];

  mostrarEstadoDropdown = false;
  mostrarTipoDropdown = false;

  get labelEstado(): string {
    if (!this.estadosSeleccionados.length) return 'Estado';
    if (this.estadosSeleccionados.length === 1) return this.estadosSeleccionados[0];
    return `${this.estadosSeleccionados.length} estados`;
  }

  get labelTipo(): string {
    if (!this.tiposSeleccionados.length) return 'Tipo';
    if (this.tiposSeleccionados.length === 1) return this.tiposSeleccionados[0];
    return `${this.tiposSeleccionados.length} tipos`;
  }

  ngOnInit(): void {
    this.proyectosService.obtenerLookups().subscribe({
      next: (lookups) => {
        this.estados = lookups.estados;
        this.tipos = lookups.tipos;
      },
      error: (err) => console.error('Error al cargar lookups:', err)
    });
  }

  toggleEstadoDropdown(event: Event): void {
    event.stopPropagation();
    this.mostrarTipoDropdown = false;
    this.mostrarEstadoDropdown = !this.mostrarEstadoDropdown;
  }

  toggleTipoDropdown(event: Event): void {
    event.stopPropagation();
    this.mostrarEstadoDropdown = false;
    this.mostrarTipoDropdown = !this.mostrarTipoDropdown;
  }

  toggleEstado(valor: string, event: Event): void {
    event.stopPropagation();
    const idx = this.estadosSeleccionados.indexOf(valor);
    if (idx === -1) {
      this.estadosSeleccionados = [...this.estadosSeleccionados, valor];
    } else {
      this.estadosSeleccionados = this.estadosSeleccionados.filter(e => e !== valor);
    }
    this.emitirFiltros();
  }

  toggleTipo(valor: string, event: Event): void {
    event.stopPropagation();
    const idx = this.tiposSeleccionados.indexOf(valor);
    if (idx === -1) {
      this.tiposSeleccionados = [...this.tiposSeleccionados, valor];
    } else {
      this.tiposSeleccionados = this.tiposSeleccionados.filter(t => t !== valor);
    }
    this.emitirFiltros();
  }

  limpiarEstados(event: Event): void {
    event.stopPropagation();
    this.estadosSeleccionados = [];
    this.emitirFiltros();
  }

  limpiarTipos(event: Event): void {
    event.stopPropagation();
    this.tiposSeleccionados = [];
    this.emitirFiltros();
  }

  cerrarDropdowns(): void {
    this.mostrarEstadoDropdown = false;
    this.mostrarTipoDropdown = false;
  }

  estaEstadoSeleccionado(valor: string): boolean {
    return this.estadosSeleccionados.includes(valor);
  }

  estaTipoSeleccionado(valor: string): boolean {
    return this.tiposSeleccionados.includes(valor);
  }

  emitirFiltros(): void {
    this.filtrosChange.emit({
      busqueda: this.busqueda,
      estados: this.estadosSeleccionados,
      tipos: this.tiposSeleccionados
    });
  }
}