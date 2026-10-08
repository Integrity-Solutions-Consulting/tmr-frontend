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

// sm - Métricas del mes del calendario con la misma regla que Seguimiento
// (antes: horasPorRegistrar, horasRegistradas de hoy, horasSemana y horasMes).
export interface ResumenHorasDto {
  horasPorRegistrar: number;
  horasRegistradas: number;
  promedioPorDia: number;
}
