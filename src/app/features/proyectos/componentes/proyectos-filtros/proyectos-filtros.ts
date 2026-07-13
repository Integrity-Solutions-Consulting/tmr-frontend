import { Component, EventEmitter, OnInit, OnDestroy, Output, inject, HostListener } from '@angular/core';
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
export class ProyectosFiltros implements OnInit, OnDestroy {
  @Output() filtrosChange = new EventEmitter<FiltrosProyecto>();

  private proyectosService = inject(ProyectosService);

  busqueda = '';
  estadosSeleccionados: string[] = [];
  seguimientoSeleccionados: number[] = [];
  tiposSeleccionados: string[] = [];

  estados: LookupOption[] = [];
  tipos: LookupOption[] = [];
  estadosFiltro = ['Activo', 'Inactivo'];

  mostrarEstadoDropdown = false;
  mostrarSeguimientoDropdown = false;
  mostrarTipoDropdown = false;

  dropdownTop = 0;
  dropdownLeft = 0;

  private scrollHandler = () => this.cerrarDropdowns();

  get seguimientoOpciones(): LookupOption[] {
    return this.estados.filter(e => !this.estadosFiltro.includes(e.nombre));
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
    if (this.seguimientoSeleccionados.length === 1)
      return this.estados.find(e => e.id === this.seguimientoSeleccionados[0])?.nombre ?? 'Seguimiento';
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
    window.addEventListener('scroll', this.scrollHandler, true);
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.scrollHandler, true);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.cerrarDropdowns();
  }

  private calcularPosicion(event: Event): void {
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    this.dropdownTop = rect.bottom + 6;
    this.dropdownLeft = rect.left;
  }

  toggleEstadoDropdown(event: Event): void {
    event.stopPropagation();
    const abriendo = !this.mostrarEstadoDropdown;
    this.cerrarDropdowns();
    if (abriendo) {
      this.calcularPosicion(event);
      this.mostrarEstadoDropdown = true;
    }
  }

  toggleSeguimientoDropdown(event: Event): void {
    event.stopPropagation();
    const abriendo = !this.mostrarSeguimientoDropdown;
    this.cerrarDropdowns();
    if (abriendo) {
      this.calcularPosicion(event);
      this.mostrarSeguimientoDropdown = true;
    }
  }

  toggleTipoDropdown(event: Event): void {
    event.stopPropagation();
    const abriendo = !this.mostrarTipoDropdown;
    this.cerrarDropdowns();
    if (abriendo) {
      this.calcularPosicion(event);
      this.mostrarTipoDropdown = true;
    }
  }

  toggleEstado(valor: string, event: Event): void {
    event.stopPropagation();
    const idx = this.estadosSeleccionados.indexOf(valor);
    this.estadosSeleccionados = idx === -1
      ? [...this.estadosSeleccionados, valor]
      : this.estadosSeleccionados.filter(e => e !== valor);
    this.emitirFiltros();
  }

  toggleSeguimiento(valorId: number, event: Event): void {
    event.stopPropagation();
    const idx = this.seguimientoSeleccionados.indexOf(valorId);
    this.seguimientoSeleccionados = idx === -1
      ? [...this.seguimientoSeleccionados, valorId]
      : this.seguimientoSeleccionados.filter(e => e !== valorId);
    this.emitirFiltros();
  }

  toggleTipo(valor: string, event: Event): void {
    event.stopPropagation();
    const idx = this.tiposSeleccionados.indexOf(valor);
    this.tiposSeleccionados = idx === -1
      ? [...this.tiposSeleccionados, valor]
      : this.tiposSeleccionados.filter(t => t !== valor);
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
