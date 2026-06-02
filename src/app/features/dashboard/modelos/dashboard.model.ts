// ─────────────────────────────────────────────────────────────
//  MODELOS — Dashboard
// ─────────────────────────────────────────────────────────────

export interface DashboardMetricas {
  totalProyectos: number;
  horasReportadas: number;
  colaboradoresActivos: number;
  clientesActivos: number;
}

export interface ProyectoResumen {
  codigo: string;
  nombre: string;
  cliente: string;
  estado: string;
  horas: number;
  presupuesto: number;
}

export interface HorasPorProyecto {
  proyecto: string;
  horas: number;
  codigo: string;
}

export interface DashboardData {
  metricas: DashboardMetricas;
  proximosACerrar: ProyectoResumen[];
  horasPorProyecto: HorasPorProyecto[];
}
