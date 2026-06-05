export interface RecursoProyecto {
  id?: number;
  idEmpleado?: number;
  tipo: string;
  nombre: string;
  rol: string;
  entrada: string;
  salida: string;
  costoHora: number;
  horas: number;
}

export interface Proyecto {
  id?: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  idCliente?: number;
  idTipoProyecto?: number;
  idLider?: number;
  idEstadoProyecto?: number;
  estado: string;
  cliente?: string;
  tipo?: string;
  fechaInicio?: string;
  fechaFin?: string;
  lider?: string;
  cargoLider?: string;
  costoHoraLider?: number;
  horasLider?: number;
  numeroRecursos?: number;
  presupuesto?: number;
  horas?: number;
  recursos?: RecursoProyecto[];
}
