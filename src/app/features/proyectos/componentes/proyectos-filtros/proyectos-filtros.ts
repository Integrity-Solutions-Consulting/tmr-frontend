import { Component, EventEmitter, OnInit, OnDestroy, Output, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { ProyectosService } from '../../servicios/proyectos.service';
import { ID_SEGUIMIENTO_INHABILITADO, LookupOption, Proyecto } from '../../modelos/proyecto.model';
import { selectProyectos } from '../../store/proyectos.selectors';

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
  private store = inject(Store);

  // sm - Filtro en cascada: cada dropdown solo muestra las opciones que realmente tienen al menos un proyecto
  // que coincide con los OTROS filtros ya aplicados (igual universo de proyectos y misma normalización que usa
  // la tabla en Tabla.proyectosFiltrados, para que "lo que se puede elegir" y "lo que se ve" sean coherentes).
  private proyectosSignal = toSignal(this.store.select(selectProyectos), { initialValue: [] as Proyecto[] });

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

  private scrollHandler = () => this.cerrarDropdowns();

  readonly idSeguimientoInhabilitado = ID_SEGUIMIENTO_INHABILITADO;

  get seguimientoOpciones(): LookupOption[] {
    return this.estados.filter(e => !this.estadosFiltro.includes(e.nombre));
  }

  // ── Cascada: opciones disponibles de cada dropdown según los demás filtros activos ──

  private normalizarEstadoProyecto(p: Proyecto): string {
    if (typeof p.activo === 'boolean') return p.activo ? 'Activo' : 'Inactivo';
    return (p.estado ?? '').trim().toLowerCase() === 'inactivo' ? 'Inactivo' : 'Activo';
  }

  private coincideBusqueda(p: Proyecto): boolean {
    const q = this.busqueda.toLowerCase();
    if (!q) return true;
    return p.codigo.toLowerCase().includes(q) ||
      p.nombre.toLowerCase().includes(q) ||
      (p.cliente ?? '').toLowerCase().includes(q);
  }

  private coincideEstado(p: Proyecto): boolean {
    return !this.estadosSeleccionados.length || this.estadosSeleccionados.includes(this.normalizarEstadoProyecto(p));
  }

  private coincideTipo(p: Proyecto): boolean {
    return !this.tiposSeleccionados.length || this.tiposSeleccionados.includes(p.tipo ?? '');
  }

  private coincideSeguimiento(p: Proyecto): boolean {
    if (!this.seguimientoSeleccionados.length) return true;
    return this.normalizarEstadoProyecto(p) === 'Inactivo'
      ? this.seguimientoSeleccionados.includes(this.idSeguimientoInhabilitado)
      : this.seguimientoSeleccionados.includes(p.idEstadoProyecto ?? -1);
  }

  // sm - Estado: disponible si hay al menos un proyecto (que coincide con búsqueda+tipo+seguimiento) en ese
  // estado, o si ya está seleccionado (para no ocultar una selección vigente aunque quede sin resultados).
  get estadosDisponibles(): string[] {
    const disponibles = new Set(
      this.proyectosSignal()
        .filter(p => this.coincideBusqueda(p) && this.coincideTipo(p) && this.coincideSeguimiento(p))
        .map(p => this.normalizarEstadoProyecto(p))
    );
    return this.estadosFiltro.filter(e => disponibles.has(e) || this.estadosSeleccionados.includes(e));
  }

  get seguimientoOpcionesDisponibles(): LookupOption[] {
    const disponibles = new Set(
      this.proyectosSignal()
        .filter(p => this.coincideBusqueda(p) && this.coincideEstado(p) && this.coincideTipo(p))
        .map(p => this.normalizarEstadoProyecto(p) === 'Inactivo' ? this.idSeguimientoInhabilitado : (p.idEstadoProyecto ?? -1))
    );
    return this.seguimientoOpciones.filter(e => disponibles.has(e.id) || this.seguimientoSeleccionados.includes(e.id));
  }

  get mostrarInhabilitado(): boolean {
    return this.proyectosSignal()
      .filter(p => this.coincideBusqueda(p) && this.coincideEstado(p) && this.coincideTipo(p))
      .some(p => this.normalizarEstadoProyecto(p) === 'Inactivo')
      || this.seguimientoSeleccionados.includes(this.idSeguimientoInhabilitado);
  }

  get tiposDisponibles(): LookupOption[] {
    const disponibles = new Set(
      this.proyectosSignal()
        .filter(p => this.coincideBusqueda(p) && this.coincideEstado(p) && this.coincideSeguimiento(p))
        .map(p => p.tipo ?? '')
        .filter(Boolean)
    );
    return this.tipos.filter(t => disponibles.has(t.nombre) || this.tiposSeleccionados.includes(t.nombre));
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
    if (this.seguimientoSeleccionados.length === 1) {
      const id = this.seguimientoSeleccionados[0];
      if (id === this.idSeguimientoInhabilitado) return 'Inhabilitado';
      return this.estados.find(e => e.id === id)?.nombre ?? 'Seguimiento';
    }
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

  toggleEstadoDropdown(event: Event): void {
    event.stopPropagation();
    const abriendo = !this.mostrarEstadoDropdown;
    this.cerrarDropdowns();
    if (abriendo) {
      this.mostrarEstadoDropdown = true;
    }
  }

  toggleSeguimientoDropdown(event: Event): void {
    event.stopPropagation();
    const abriendo = !this.mostrarSeguimientoDropdown;
    this.cerrarDropdowns();
    if (abriendo) {
      this.mostrarSeguimientoDropdown = true;
    }
  }

  toggleTipoDropdown(event: Event): void {
    event.stopPropagation();
    const abriendo = !this.mostrarTipoDropdown;
    this.cerrarDropdowns();
    if (abriendo) {
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
