export interface RecursoProyecto {
  id?: number;
  idEmpleado?: number | null;
  idDepartamento?: number | null;
  tipo: string;
  nombre: string;
  departamento?: number | null;
  rol: string;
  entrada?: string | null;
  salida?: string | null;
  costoHora: number;
  horas: number;
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
}