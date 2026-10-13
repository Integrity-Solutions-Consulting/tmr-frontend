// sm - "Inhabilitado" (proyecto Inactivo) no es un estado real del catálogo de seguimiento: la tabla lo arma
// al vuelo (ver Tabla.obtenerSeguimiento) y reemplaza cualquier seguimiento real que tuviera el proyecto. Se
// usa este id "sentinela" (ningún estado real del catálogo lo usa) para poder filtrar por él en el filtro de
// Seguimiento, igual que se ve en la tabla.
export const ID_SEGUIMIENTO_INHABILITADO = -99;

export interface RecursoProyecto {
  id?: number;
  idEmpleado?: number | null;
  idProveedor?: number | null;
  idDepartamento?: number | null;
  tipo: string;
  nombre: string;
  departamento?: number | null;
  rol: string;
  entrada?: string | null;
  salida?: string | null;
  costoHora: number;
  horas: number;
  // sm - Estado de asignación del recurso (true = Activo, false = Inactivo). El backend lo devuelve Inactivo
  // también cuando la fecha de salida ya pasó.
  estadoAsignacion?: boolean;
}

export interface LiderProyecto {
  idLider?: number | null;
  lider?: string;
  cargoLider?: string;
  costoHoraLider?: number;
  horasLider?: number;
  recursos?: RecursoProyecto[];
}

export interface Proyecto {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  idCliente?: number | null;
  cliente?: string;
  idTipoProyecto?: number | null;
  tipo?: string;
  idLider?: number | null;
  lider?: string;
  cargoLider?: string;
  costoHoraLider?: number;
  horasLider?: number;
  lideres?: LiderProyecto[];
  idEstadoProyecto?: number;
  estado: string;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  presupuesto?: number | null;
  horas?: number | null;
  numeroRecursos?: number;
  activo?: boolean;
  fechaCreacion?: string;
  recursos?: RecursoProyecto[];
  // Nuevos campos
  observacion?: string;
  fechaInicioReal?: string | null;
  fechaFinReal?: string | null;
  fechaInicioEspera?: string | null;
  fechaFinEspera?: string | null;
}

export interface LookupOption {
  id: number;
  nombre: string;
}

export interface CargoLookup {
  id: number;
  nombre: string;
  idDepartamento: number | null;
}

export interface ProyectoLookups {
  clientes: LookupOption[];
  lideres: LookupOption[];
  empleados: LookupOption[];
  cargos: CargoLookup[];
  estados: LookupOption[];
  tipos: LookupOption[];
  departamentos: LookupOption[];
  proveedores: LookupOption[];
}