export interface RecursoProyecto {
  tipo: string;
  nombre: string;
  rol: string;
  entrada: string;
  salida: string;
  costoHora: number;
  horas: number;
}

export interface Proyecto {
  codigo: string;
  nombre: string;
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
