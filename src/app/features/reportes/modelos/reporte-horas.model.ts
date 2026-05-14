export interface ReporteHoras {
  id: string;
  cliente: string;
  recursos: number;
  horas: number;
  mes: string;
  anio: string;
  ultimoReporte?: Date;
}

export interface FiltrosReporteHoras {
  cliente: string;
  mes: string;
  anio: string;
}
