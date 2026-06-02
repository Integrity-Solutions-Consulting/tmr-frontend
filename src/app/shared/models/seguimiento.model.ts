// src/app/shared/models/seguimiento.model.ts
export interface SeguimientoFiltros {
  busqueda: string;
  clienteId: string;
  fechaDesde: Date | null;
  fechaHasta: Date | null;
  periodo: 'quincena' | 'mes-completo';
}

export interface MetricasSeguimiento {
  horasPendientes: number;
  horasRegistradas: number;
  promedioPorDia: number;
  colaboradoresActivos: number;
  proyectosUnicos: number;
}
