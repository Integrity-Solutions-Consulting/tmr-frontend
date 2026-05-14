// src/app/shared/models/actividad.model.ts
export interface Actividad {
  id: string;
  tipoActividad: 'Desarrollo' | 'Diseño' | 'Reunión' | 'Testing' | 'Otro';
  proyectoId: string;
  proyectoNombre: string;
  codigoRequerimiento: string;
  descripcion?: string;
  fechaActividad: Date;
  numeroHoras: number;
  esRecurrente: boolean;
  // Solo si esRecurrente = true
  fechaInicio?: Date;
  fechaFin?: Date;
  horasPorDia?: number;
  incluirFinesDeSemana?: boolean;
  incluirFeriados?: boolean;
}
