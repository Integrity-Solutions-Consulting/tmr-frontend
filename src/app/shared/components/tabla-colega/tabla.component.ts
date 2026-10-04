import {
  Component,
  Input,
  Output,
  EventEmitter,
  ContentChild,
  TemplateRef,
  OnInit,
  signal,
  Signal,
  isSignal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColumnDefinition, TableConfig, TableEmptyState } from './tabla.types';
import { PaginacionComponent } from '../paginacion/paginacion.component';
import { BadgeEstadoComponent } from '../badge-estado/badge-estado.component';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-tabla',
  standalone: true,
  imports: [CommonModule, PaginacionComponent, BadgeEstadoComponent, MatIconModule],
  templateUrl: './tabla.component.html',
  styleUrl: './tabla.component.scss',
})
export class TablaComponent<T = any> implements OnInit {
  /**
   * Datos a mostrar en la tabla
   */
  @Input() datos: T[] = [];

  /**
   * Definición de columnas
   */
  @Input() columnas: ColumnDefinition[] = [];

  /**
   * Datos ya paginados para mostrar
   */
  @Input() datosPaginados: T[] = [];

  /**
   * Página actual
   */
  @Input() paginaActual: Signal<number> | number = 1;

  /**
   * Total de páginas
   */
  @Input() totalPaginas: Signal<number> | number = 1;

  /**
   * Cantidad total de registros
   */
  @Input() total: number = 0;

  /**
   * Items por página
   */
  @Input() porPagina: number = 10;

  /**
   * Si debe mostrar datos (false muestra estado vacío)
   */
  @Input() mostrarDatos: Signal<boolean> | boolean = false;

  /**
   * Configuración de la tabla
   */
  @Input() config: TableConfig = {
    emptyState: {
      title: 'Sin datos',
      description: 'No hay información disponible',
      showAction: false,
    },
    rowIdProperty: 'id',
    selectable: false,
  };

  /**
   * Evento cuando cambia la página
   */
  @Output() paginaCambia = new EventEmitter<number>();

  /**
   * Evento cuando se hace clic en una fila (opcional)
   */
  @Output() rowClick = new EventEmitter<T>();

  /**
   * Evento cuando se ejecuta la acción del estado vacío
   */
  @Output() emptyStateAction = new EventEmitter<void>();

  /**
   * Template personalizado para filas
   */
  @ContentChild('rowTemplate') rowTemplate?: TemplateRef<{ $implicit: T; index: number }>;

  /**
   * Estado de orden (ordena solo las filas visibles de datosPaginados,
   * ya que en consumidores con paginación en servidor es lo único disponible en el cliente)
   */
  sortField: string | null = null;
  sortAsc = true;

  ngOnInit(): void {
    // Validar entrada
    if (!this.columnas || this.columnas.length === 0) {
      console.warn('TablaComponent: No se proporcionaron columnas');
    }
  }

  /**
   * Alternar orden por columna
   */
  ordenar(property: string): void {
    if (this.sortField === property) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortField = property;
      this.sortAsc = true;
    }
  }

  /**
   * Dirección de orden para accesibilidad (aria-sort)
   */
  direccionOrden(property: string): 'ascending' | 'descending' | 'none' {
    if (this.sortField !== property) return 'none';
    return this.sortAsc ? 'ascending' : 'descending';
  }

  /**
   * Filas a renderizar, ordenadas si corresponde
   */
  get datosPaginadosOrdenados(): T[] {
    if (!this.sortField) return this.datosPaginados;

    const campo = this.sortField;
    const factor = this.sortAsc ? 1 : -1;

    return [...this.datosPaginados].sort((a, b) => {
      const valorA = this.getValue(a, campo);
      const valorB = this.getValue(b, campo);

      if (valorA == null && valorB == null) return 0;
      if (valorA == null) return -1 * factor;
      if (valorB == null) return 1 * factor;

      if (valorA instanceof Date || valorB instanceof Date) {
        return (new Date(valorA).getTime() - new Date(valorB).getTime()) * factor;
      }

      if (typeof valorA === 'number' && typeof valorB === 'number') {
        return (valorA - valorB) * factor;
      }

      return String(valorA).localeCompare(String(valorB), 'es', { numeric: true }) * factor;
    });
  }

  /**
   * Obtener valor de un dato según su propiedad
   */
  getValue(item: T, property: string): any {
    const properties = property.split('.');
    let value = item as any;

    for (const prop of properties) {
      value = value?.[prop];
    }

    return value;
  }

  /**
   * Obtener ID único para la fila
   */
  getRowId(item: T, index: number): string {
    const idProperty = this.config.rowIdProperty || 'id';
    return `${this.getValue(item, idProperty)}_${index}`;
  }

  /**
   * Manejar clic en fila
   */
  onRowClick(item: T): void {
    this.rowClick.emit(item);
  }

  /**
   * Manejar clic en acción de estado vacío
   */
  onEmptyStateAction(): void {
    this.emptyStateAction.emit();
  }

  /**
   * Manejar cambio de página
   */
  onPaginaCambia(pagina: number): void {
    this.paginaCambia.emit(pagina);
  }

  /**
   * Convertir Signal a valor primitivo si es necesario
   */
  getSignalValue<U>(value: Signal<U> | U): U {
    return isSignal(value) ? (value as Signal<U>)() : (value as U);
  }
}
