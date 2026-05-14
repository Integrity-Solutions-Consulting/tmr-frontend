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

@Component({
  selector: 'app-tabla',
  standalone: true,
  imports: [CommonModule, PaginacionComponent, BadgeEstadoComponent],
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

  ngOnInit(): void {
    // Validar entrada
    if (!this.columnas || this.columnas.length === 0) {
      console.warn('TablaComponent: No se proporcionaron columnas');
    }
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
