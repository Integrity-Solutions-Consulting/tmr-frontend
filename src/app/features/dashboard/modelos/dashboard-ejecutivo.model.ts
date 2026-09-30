// sm - Modelos del Dashboard ejecutivo (Requerimiento_Funcional_Dashboard_Time_Report).
// Reflejan los DTOs de tmr-backend/Features/Dashboard/DTOs/DashboardEjecutivoDTOs.cs.

export type Semaforo = 'Verde' | 'Amarillo' | 'Rojo';
export type CategoriaProyecto = 'Activo' | 'Vencido' | 'Proximo' | 'Nuevo' | 'Cerrado';
export type EstadoHistorico = 'Cumplido' | 'AtrasoCarga' | 'Incumplido' | 'Regularizado';

export interface OpcionFiltro {
  id: number;
  nombre: string;
}

export interface OpcionProyectoFiltro extends OpcionFiltro {
  codigo: string;
  idCliente: number | null;
  idEstado: number;
}

export interface DashboardFiltrosOpciones {
  clientes: OpcionFiltro[];
  proyectos: OpcionProyectoFiltro[];
  estados: OpcionFiltro[];
  colaboradores: OpcionFiltro[];
}

export interface DashboardFiltros {
  anio: number;
  mes: number;
  idCliente: number | null;
  idProyecto: number | null;
  idEstado: number | null;
  idEmpleado: number | null;
  horizonte: number;
}

export interface DashboardParametros {
  umbralVerde: number;
  umbralAmarillo: number;
  horizonteDias: number;
  estadosActivos: string;
  estadosCerrados: string;
  reglaJornada: string;
  reglaReparto: string;
  fuenteNovedades: string;
}

export interface DashboardPeriodo {
  anio: number;
  mes: number;
  fechaInicio: string;
  fechaFin: string;
  fechaCorte: string;
  fechaGeneracion: string;
  ultimoRegistroActividad: string | null;
}

export interface DashboardTarjetas {
  colaboradoresSinProyecto: number;
  ingresos: number;
  salidas: number;
  clientesConProyectosActivos: number;
  proyectosActivos: number;
  proyectosVencidos: number;
  proyectosProximos: number;
  proyectosNuevos: number;
  proyectosCerrados: number;
  proyectosConDesvinculados: number;
}

export interface ColaboradorSinProyecto {
  idEmpleado: number;
  colaborador: string;
  identificacion: string;
  cargo: string;
  responsable: string;
  fechaIngreso: string | null;
  ultimoProyecto: string;
  diasSinAsignacion: number | null;
}

export interface MovimientoColaborador {
  idEmpleado: number;
  colaborador: string;
  identificacion: string;
  cargo: string;
  fecha: string;
  proyectos: string;
}

export interface ProyectoDashboard {
  idProyecto: number;
  codigo: string;
  nombre: string;
  idCliente: number | null;
  cliente: string;
  responsable: string;
  estado: string;
  fechaInicio: string | null;
  fechaTermino: string | null;
  fechaCierre: string | null;
  diasAtraso: number | null;
  diasParaTerminar: number | null;
  categorias: CategoriaProyecto[];
}

export interface AsignacionDesvinculada {
  idProyecto: number;
  codigoProyecto: string;
  proyecto: string;
  cliente: string;
  idEmpleado: number;
  colaborador: string;
  fechaSalida: string;
  fechaAsignacion: string | null;
  fechaFinAsignacion: string | null;
  rol: string;
}

export interface CumplimientoTotales {
  esperadas: number;
  reportadas: number;
  pendientes: number;
  porcentaje: number;
  semaforo: Semaforo;
}

export interface CumplimientoCliente extends CumplimientoTotales {
  idCliente: number;
  cliente: string;
  colaboradores: number;
  colaboradoresIncompletos: number;
}

export interface CumplimientoDetalle {
  idEmpleado: number;
  colaborador: string;
  correo: string;
  idProyecto: number;
  codigoProyecto: string;
  proyecto: string;
  idCliente: number;
  cliente: string;
  vigenciaDesde: string | null;
  vigenciaHasta: string | null;
  esperadas: number;
  registradas: number;
  reportadas: number;
  pendientes: number;
  porcentaje: number;
  semaforo: Semaforo;
  ultimoRegistro: string | null;
  estado: 'Completo' | 'Incompleto';
}

export interface DashboardEjecutivo {
  periodo: DashboardPeriodo;
  parametros: DashboardParametros;
  tarjetas: DashboardTarjetas;
  colaboradoresSinProyecto: ColaboradorSinProyecto[];
  ingresos: MovimientoColaborador[];
  salidas: MovimientoColaborador[];
  proyectos: ProyectoDashboard[];
  desvinculados: AsignacionDesvinculada[];
  cumplimientoTotal: CumplimientoTotales;
  cumplimientoClientes: CumplimientoCliente[];
  cumplimientoDetalle: CumplimientoDetalle[];
  fueraDeAsignacion: RegistroFueraDeAsignacion[];
}

// sm - Horas registradas que no entran al cumplimiento (proyecto sin asignación vigente, o sin proyecto).
export interface RegistroFueraDeAsignacion {
  idEmpleado: number;
  colaborador: string;
  idProyecto: number | null;
  proyecto: string;
  cliente: string;
  horas: number;
  ultimoRegistro: string;
}

export interface HistoricoMes {
  anio: number;
  mes: number;
  fechaCierre: string;
  mesAbierto: boolean;
  esperadas: number;
  reportadas: number;
  pendientes: number;
  porcentaje: number;
  semaforo: Semaforo;
  cumplidos: number;
  atrasosCarga: number;
  incumplidos: number;
  regularizados: number;
}

export interface HistoricoEstadoMes {
  anio: number;
  mes: number;
  esperadas: number;
  pendientes: number;
  pendientesAlCierre: number;
  porcentaje: number;
  estado: EstadoHistorico;
}

export interface HistoricoColaborador {
  idEmpleado: number;
  colaborador: string;
  meses: HistoricoEstadoMes[];
  mesesConAtraso: number;
  recurrente: boolean;
}

export interface DashboardHistorico {
  mesesVentana: number;
  umbralRecurrencia: number;
  reglaCierre: string;
  meses: HistoricoMes[];
  colaboradores: HistoricoColaborador[];
}
