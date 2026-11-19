/** Estado por el que se filtran los reportes Por Colaborador / Por Cliente. */
export type FiltroEstado = 'Todos' | 'Activo' | 'Inactivo';

/** Una asignación de un colaborador a un proyecto (historial). */
export interface AsignacionHistorial {
  idAsignacion: number;
  idEmpleado: number;
  colaborador: string;
  identificacion: string;
  cargo: string | null;
  colaboradorActivo: boolean;
  idCliente: number | null;
  cliente: string;
  idProyecto: number;
  codigoProyecto: string | null;
  proyecto: string;
  estadoProyecto: string | null;
  proyectoActivo: boolean;
  rol: string | null;
  lider: string | null;
  fechaInicio: Date | null;
  fechaFin: Date | null;
  vigente: boolean;
  diasTrabajados: number;
  horasRegistradas: number;
  // Derivados para mostrar en la tabla
  finTexto: string;
  duracion: string;
  estadoAsignacion: 'Vigente' | 'Finalizada';
  estadoColaborador: 'Activo' | 'Inactivo';
  estadoProyectoActivo: 'Activo' | 'Inactivo';
}

/** Tiempo total de un colaborador con un cliente. */
export interface ColaboradorClienteResumen {
  idEmpleado: number;
  colaborador: string;
  identificacion: string;
  cargo: string | null;
  colaboradorActivo: boolean;
  idCliente: number | null;
  cliente: string;
  proyectos: number;
  nombresProyectos: string;
  fechaInicio: Date | null;
  fechaFin: Date | null;
  enCurso: boolean;
  diasTrabajados: number;
  horasRegistradas: number;
  // Derivados
  finTexto: string;
  duracion: string;
  estadoColaborador: 'Activo' | 'Inactivo';
}

export interface ReporteColaboradores {
  resumen: ColaboradorClienteResumen[];
  asignaciones: AsignacionHistorial[];
}

export interface ClienteResumen {
  idCliente: number | null;
  cliente: string;
  identificacion: string | null;
  clienteActivo: boolean;
  totalProyectos: number;
  proyectosActivos: number;
  nombresProyectos: string;
  colaboradores: number;
  colaboradoresVigentes: number;
  estadoCliente: 'Activo' | 'Inactivo';
}

export interface ClienteProyecto {
  idProyecto: number;
  idCliente: number | null;
  cliente: string;
  codigo: string | null;
  proyecto: string;
  tipo: string | null;
  estadoProyecto: string | null;
  proyectoActivo: boolean;
  fechaInicio: Date | null;
  fechaFin: Date | null;
  totalColaboradores: number;
  colaboradoresVigentes: number;
  nombresColaboradores: string;
  estadoProyectoActivo: 'Activo' | 'Inactivo';
}

export interface ReporteClientes {
  clientes: ClienteResumen[];
  proyectos: ClienteProyecto[];
  colaboradores: AsignacionHistorial[];
}
