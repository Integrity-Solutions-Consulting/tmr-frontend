/**
 * Tipos y interfaces para el componente tabla genérico
 */

export type ContentType = 'text' | 'badge' | 'badge-estado' | 'action-menu' | 'custom' | 'fecha';

export interface ColumnDefinition {
  /** Nombre de la columna que se muestra en el header */
  header: string;

  /** Propiedad del objeto de datos que se debe mostrar */
  property: string;

  /** Tipo de contenido a mostrar */
  type: ContentType;

  /** Clases CSS adicionales para la celda */
  cellClass?: string;

  /** Clases CSS adicionales para el header */
  headerClass?: string;

  /** Para fechas, formato que se desea usar */
  dateFormat?: string;

  /** Para contenido personalizado, referencia del ng-template */
  templateRef?: any;

  /** Ancho de la columna (opcional) */
  width?: string;
}

export interface TableEmptyState {
  /** Título del estado vacío */
  title: string;

  /** Descripción del estado vacío */
  description: string;

  /** Mostrar botón de acción */
  showAction?: boolean;

  /** Texto del botón de acción */
  actionText?: string;
}

export interface TableConfig {
  /** Texto del estado vacío */
  emptyState?: TableEmptyState;

  /** Identificador único de cada fila */
  rowIdProperty?: string;

  /** Permitir selección de filas */
  selectable?: boolean;
}
