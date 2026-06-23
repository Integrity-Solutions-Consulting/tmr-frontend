export interface ReporteFechas {
  id: string;
  cliente: string;
  lider: string;
  recurso: string;
  cargo: string;
  fechaInicio: Date;
  fechaFin: Date;
  codigoProyecto?: string;
  proyecto?: string;
  estadoProyecto?: string;
  tipoProyecto?: string;
  fechaFinReal?: Date;
  presupuesto?: number;
  horas?: number;
  fechaInicioEspera?: Date;
  fechaFinEspera?: Date;
  observaciones?: string;
}

export interface FiltrosReporteFechas {
  cliente?: string;
  lider?: string;
  fechaInicio?: string;
  fechaFin?: string;
}
