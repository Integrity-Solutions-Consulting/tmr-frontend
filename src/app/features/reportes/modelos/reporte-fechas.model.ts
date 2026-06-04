export interface ReporteFechas {
  id: string;
  cliente: string;
  lider: string;
  recurso: string;
  cargo: string;
  fechaInicio: Date;
  fechaFin: Date;
}

export interface FiltrosReporteFechas {
  cliente?: string;
  lider?: string;
  fechaInicio?: string;
  fechaFin?: string;
}
