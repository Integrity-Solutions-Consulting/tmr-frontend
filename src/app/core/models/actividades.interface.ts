export interface CrearActividadDto {
  idEmpleado: number;
  idProyecto?: number | null;
  idTipoActividad: number;
  codigoRequerimiento?: string | null;
  cantidadHoras: number;
  fechaActividad: string; // Formato 'YYYY-MM-DD' para coincidir con DateOnly de C#
  descripcionActividad: string;
  notas?: string | null;
  esBillable?: boolean | null;
}

export interface ActividadDiaDto {
  fecha: string; // Formato 'YYYY-MM-DD'
  totalHoras: number;
}

export interface ResumenHorasDto {
  horasPorRegistrar: number;
  horasRegistradas: number;
  horasSemana: number;
  horasMes: number;
}
