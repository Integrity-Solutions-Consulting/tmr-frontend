// src/app/shared/models/actividad.model.ts
export interface Actividad {
  id?: string;
  idempleado: number;
  idproyecto: number;
  idtipoactividad: number;
  codigorequerimiento: string;
  cantidadhoras: number;
  fechaactividad: Date | string;
  descripcionactividad: string;
  notas?: string;
  esbillable?: boolean;
  aprobadopor?: number;
  fechaaprobacion?: Date | string;
  activo?: boolean;
  usuariocreacion?: string;
  fechacreacion?: Date | string;
  usuariomodificacion?: string;
  fechamodificacion?: Date | string;
  ipcreacion?: string;
  ipmodificacion?: string;
  // Propiedades de visualización
  tipoActividadNombre?: string;
  proyectoNombre?: string;
  colaborador?: string;
  proyecto?: string;
  nroHoras?: number;
  cliente?: string;
}

export interface TipoActividad {
  id: number;
  nombre: string;
  descripcion?: string;
}

export interface ActividadRecurrente {
  esRecurrente: boolean;
  fechaInicio?: Date;
  fechaFin?: Date;
  horasPorDia?: number;
  incluirFinesDeSemana?: boolean;
  incluirFeriados?: boolean;
}
