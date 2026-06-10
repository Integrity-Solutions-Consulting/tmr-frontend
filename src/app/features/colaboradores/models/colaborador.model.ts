// ============================================================
// MÓDULO COLABORADORES — Modelos e Interfaces
// ============================================================
 
export type TipoIdentificacion = 'RPS' | 'ISC' | 'RPS E ISC';
export type EstadoColaborador = 'Activo' | 'Inactivo' | 'Todos';
export type Modalidad = 'Presencial' | 'Remoto' | 'Híbrida';
export type Categoria = 'Junior' | 'Semi-senior' | 'Senior' | 'Especialista' | 'Especialista Plus';
export type Genero = 'Masculino' | 'Femenino' | 'Otro' ;
export type EstadoProyecto = 
  | 'En progreso' 
  | 'Completado' 
  | 'En pausa' 
  | 'Cancelado'
  | 'Inactivo'
  | 'Aprobado'
  | 'Aplazado'
  | 'Planificación'
  | 'En espera';

export interface ProyectoAsignado {
  id: string;
  nombre: string;
  cliente: string;
  estado: EstadoProyecto;
}
 
export interface Colaborador {
  id: string;
  codigoEmpleado?: string;
  tipoContrato?: string;
  identificacion: string;
  tipoIdentificacion: TipoIdentificacion;
  nombreCompleto: string;
  departamento: string;
  fechaContratacion: string;       // ISO date string 'YYYY-MM-DD'
  cargo: string;
  aniosExperiencia: number;
  modalidad: Modalidad;
  categoria: Categoria;
  correoElectronico: string;
  fechaNacimiento: string;         // ISO date string 'YYYY-MM-DD'
  telefono: string;
  genero: Genero;
  direccion: string;
  estado: EstadoColaborador;
  proyectosAsignados: ProyectoAsignado[];
  numProyectos: number;
}
 
// DTO para CREAR colaborador (sin id ni numProyectos, esos los asigna el backend)
export interface CrearColaboradorDto {
  tipoIdentificacion: TipoIdentificacion;
  identificacion: string;
  nombreCompleto: string;
  departamento: string;
  fechaContratacion: string;
  cargo: string;
  aniosExperiencia: number;
  modalidad: Modalidad;
  categoria: Categoria;
  correoElectronico: string;
  fechaNacimiento: string;
  telefono: string;
  genero: Genero;
  direccion: string;
  estado: EstadoColaborador;
}
 
// DTO para EDITAR colaborador (sin tipoIdentificacion ni id)
export interface EditarColaboradorDto {
  nombreCompleto: string;
  departamento: string;
  fechaContratacion: string;
  cargo: string;
  aniosExperiencia: number;
  modalidad: Modalidad;
  categoria: Categoria;
  identificacion: string;
  correoElectronico: string;
  fechaNacimiento: string;
  telefono: string;
  genero: Genero;
  direccion: string;
  estado: EstadoColaborador;
}
 
// Respuesta paginada (lista para conectar con backend)
export interface ColaboradoresPaginados {
  data: Colaborador[];
  total: number;
  pagina: number;
  porPagina: number;
  totalPaginas: number;
}
 
// Filtros de búsqueda
export interface FiltrosColaborador {
  busqueda: string;
  estado: EstadoColaborador | 'Todos';
  asignacion?: 'asignado' | 'noAsignado' | null;
}

export interface Notificacion {
  tipo:    'exito' | 'error';
  mensaje: string;
}

// ============================================================
// Interface que coincide con lo que devuelve GET /api/colaboradores
// ============================================================
export interface ColaboradorListaApi {
  id: number;
  codigoEmpleado: string;
  numeroIdentificacion: string;
  asociacion: string;
  nombreCompleto: string;
  email: string;
  cargo: string;
  numProyectos: number;
  activo: boolean;
}
