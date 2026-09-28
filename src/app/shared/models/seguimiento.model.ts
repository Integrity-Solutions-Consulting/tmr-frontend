// src/app/shared/models/seguimiento.model.ts
// sm - Filtros que se envían al backend de Seguimiento (fechas en formato yyyy-MM-dd).
// La búsqueda por colaborador/proyecto no va aquí: se aplica en el frontend.
export interface SeguimientoFiltros {
  fechaDesde: string;
  fechaHasta: string;
  clienteSeleccionado?: string;
}

export interface MetricasSeguimiento {
  horasPendientes: number;
  horasRegistradas: number;
  promedioPorDia: number;
  colaboradoresActivos: number;
  proyectosUnicos: number;
}
