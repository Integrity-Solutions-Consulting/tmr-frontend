// ============================================================
// MÓDULO COLABORADORES — Modelos e Interfaces
// ============================================================

// OJO: este type realmente representa la empresa/asociación en la tabla.
// Se mantiene el nombre para no romper código existente.
export type TipoIdentificacion = 'RPS' | 'ISC' | 'RPS E ISC';

export type EstadoColaborador = 'Activo' | 'Inactivo' | 'Todos';
export type Modalidad = 'Presencial' | 'Remoto' | 'Híbrida';
export type Categoria = 'Junior' | 'Semi-senior' | 'Senior' | 'Especialista' | 'Especialista Plus';
export type Genero = 'Masculino' | 'Femenino' | 'Otro';

export type TipoPersona = 'NATURAL' | 'JURIDICA';

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

  // ── IDs necesarios para precargar correctamente el modal editar ──
  idEmpresaCatalogo?: number | null;
  tipoPersona?: TipoPersona | string | null;
  idTipoIdentificacion?: number | null;
  idGenero?: number | null;
  idNacionalidad?: number | null;
  idTipoContrato?: number | null;
  idModoTrabajo?: number | null;
  idCategoriaEmpleado?: number | null;
  idDepartamento?: number | null;
  idCargo?: number | null;

  // ── Contrato / empresa ─────────────────────────────
  tipoContrato?: string;
  tipoIdentificacion: TipoIdentificacion;
  asociacion?: string | null;

  // ── Datos personales ───────────────────────────────
  identificacion: string;
  numeroIdentificacion?: string | null;
  nombres?: string | null;
  apellidos?: string | null;
  nombreCompleto: string;
  fechaNacimiento: string;         // ISO date string 'YYYY-MM-DD'
  genero: Genero | string;
  nacionalidad?: string | null;

  // ── Datos laborales ────────────────────────────────
  departamento: string;
  fechaContratacion: string;       // ISO date string 'YYYY-MM-DD'
  fechaIngreso?: string | null;
  cargo: string;
  aniosExperiencia: number;
  modalidad: Modalidad | string;
  categoria: Categoria | string;

  // ── Datos de contacto ──────────────────────────────
  correoElectronico: string;
  email?: string | null;
  telefono: string;
  direccion: string;

  // ── Estado / proyectos ─────────────────────────────
  estado: EstadoColaborador;
  activo?: boolean;
  proyectosAsignados: ProyectoAsignado[];
  numProyectos: number;

  // ── salida de colaboradores ─────────────────────────────
  fechaSalida?: string | null;
  tipoSalida?: string | null;
  causaSalida?: string | null;
  comentarioSalida?: string | null;
  reemplazoNombre?: string | null;
  tieneDatosSalida?: boolean;

  // ── CAMPOS PARA REEMPLAZO ─────────────────────────────
   reemplazaANombre?: string | null;
}

// DTO para CREAR colaborador.
// Se mantiene para compatibilidad, aunque el payload real se arma en el modal.
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

  // Nuevos opcionales para Persona + Empleado.
  tipoPersona?: TipoPersona | string | null;
  idTipoIdentificacion?: number | null;
  idGenero?: number | null;
  idNacionalidad?: number | null;
  idEmpresaCatalogo?: number | null;
}

// DTO para EDITAR colaborador.
// Se mantiene para compatibilidad, aunque el payload real se arma en el modal.
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

  // Nuevos opcionales para editar Persona + Empleado.
  tipoPersona?: TipoPersona | string | null;
  idTipoIdentificacion?: number | null;
  numeroIdentificacion?: string | null;
  nombres?: string | null;
  apellidos?: string | null;
  idGenero?: number | null;
  idNacionalidad?: number | null;
  idEmpresaCatalogo?: number | null;
  idTipoContrato?: number | null;
  idModoTrabajo?: number | null;
  idCategoriaEmpleado?: number | null;
}

// Respuesta paginada.
export interface ColaboradoresPaginados {
  data: Colaborador[];
  total: number;
  pagina: number;
  porPagina: number;
  totalPaginas: number;
}

// Filtros de búsqueda.
export interface FiltrosColaborador {
  busqueda: string;
  estado: EstadoColaborador | 'Todos';
  asignacion?: 'asignado' | 'noAsignado' | null;
}

export interface Notificacion {
  tipo: 'exito' | 'error';
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

// ============================================================
// Interface para el detalle GET /api/colaboradores/{id}
// Se usa para mapear correctamente el modal editar.
// ============================================================
export interface ColaboradorDetalleApi {
  id: number;
  codigoEmpleado: string;
  asociacion: string;
  tipoContrato: string;
  activo: boolean;

  // IDs necesarios para editar.
  idEmpresaCatalogo?: number | null;
  tipoPersona?: string | null;
  idTipoIdentificacion?: number | null;
  idGenero?: number | null;
  idNacionalidad?: number | null;
  idTipoContrato?: number | null;
  idModoTrabajo?: number | null;
  idCategoriaEmpleado?: number | null;

  // Datos laborales.
  departamento: string;
  fechaIngreso: string | null;
  cargo: string;
  aniosExperiencia: number | null;
  modalidad: string;
  categoria: string;

  // Datos personales.
  idPersona: number;
  nombres: string;
  apellidos: string;
  numeroIdentificacion: string;
  fechaNacimiento: string | null;
  genero: string;
  nacionalidad?: string | null;

  // Contacto.
  email: string;
  telefono: string;
  direccion: string;

  // Proyectos.
  proyectos: ProyectoAsignado[];


  // ── salida de colaboradores ─────────────────────────────
  fechaSalida: string | null;
  tipoSalida: string | null;
  causaSalida: string | null;
  comentarioSalida: string | null;
  reemplazoNombre: string | null;


  // ── CAMPOS PARA REEMPLAZO ─────────────────────────────
   reemplazaANombre?: string | null;

}

// ── Request para registrar salida ─────────────────────────────
export interface RegistrarSalidaRequest {
  fechaSalida: string;
  idTipoSalida: number;
  idCausaSalida: number;
  comentario: string | null;
  idEmpleadoReemplazo: number | null;
}