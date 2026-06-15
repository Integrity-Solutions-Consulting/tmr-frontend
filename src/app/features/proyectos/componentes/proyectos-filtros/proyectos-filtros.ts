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
  seguimiento?: number[];
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
  seguimientoSeleccionados: number[] = [];
  tiposSeleccionados: string[] = [];

  estados: LookupOption[] = [];
  tipos: LookupOption[] = [];

  mostrarEstadoDropdown = false;
  mostrarSeguimientoDropdown = false;
  mostrarTipoDropdown = false;

  get seguimientoOpciones(): LookupOption[] {
    return this.estados.filter(e => e.nombre !== 'Activo');
  }

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

  get labelSeguimiento(): string {
    if (!this.seguimientoSeleccionados.length) return 'Seguimiento';
    if (this.seguimientoSeleccionados.length === 1) return this.estados.find(e => e.id === this.seguimientoSeleccionados[0])?.nombre ?? 'Seguimiento';
    return `${this.seguimientoSeleccionados.length} seguimiento`;
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
    this.mostrarSeguimientoDropdown = false;
    this.mostrarEstadoDropdown = !this.mostrarEstadoDropdown;
  }

  toggleSeguimientoDropdown(event: Event): void {
    event.stopPropagation();
    this.mostrarEstadoDropdown = false;
    this.mostrarTipoDropdown = false;
    this.mostrarSeguimientoDropdown = !this.mostrarSeguimientoDropdown;
  }

  toggleTipoDropdown(event: Event): void {
    event.stopPropagation();
    this.mostrarEstadoDropdown = false;
    this.mostrarSeguimientoDropdown = false;
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

  toggleSeguimiento(valorId: number, event: Event): void {
    event.stopPropagation();
    const idx = this.seguimientoSeleccionados.indexOf(valorId);
    if (idx === -1) {
      this.seguimientoSeleccionados = [...this.seguimientoSeleccionados, valorId];
    } else {
      this.seguimientoSeleccionados = this.seguimientoSeleccionados.filter(e => e !== valorId);
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

  limpiarSeguimientos(event: Event): void {
    event.stopPropagation();
    this.seguimientoSeleccionados = [];
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
    this.mostrarSeguimientoDropdown = false;
  }

  estaEstadoSeleccionado(valor: string): boolean {
    return this.estadosSeleccionados.includes(valor);
  }

  estaSeguimientoSeleccionado(valorId: number): boolean {
    return this.seguimientoSeleccionados.includes(valorId);
  }

  estaTipoSeleccionado(valor: string): boolean {
    return this.tiposSeleccionados.includes(valor);
  }

  emitirFiltros(): void {
    this.filtrosChange.emit({
      busqueda: this.busqueda,
      estados: this.estadosSeleccionados,
      tipos: this.tiposSeleccionados,
      seguimiento: this.seguimientoSeleccionados
    });
  }
}