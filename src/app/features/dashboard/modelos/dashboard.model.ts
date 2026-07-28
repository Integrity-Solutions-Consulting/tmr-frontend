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
  fechaFinPlaneada?: string;
}

export interface HorasPorProyecto {
  id: number;
  proyecto: string;
  horas: number;
  codigo: string;
  horasAsignadas: number;
}

export interface ProyectosPorCliente {
  cliente: string;
  proyectosAsignados: number;
  porcentaje: number;
}

export interface DashboardData {
  metricas: DashboardMetricas;
  proximosACerrar: ProyectoResumen[];
  horasPorProyecto: HorasPorProyecto[];
  proyectosPorCliente: ProyectosPorCliente[];
}
