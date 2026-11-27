// sm - Métricas del mes del calendario con la misma regla que Seguimiento
// (antes: horasPorRegistrar, horasRegistradas de hoy, horasSemana y horasMes).
export interface ResumenHorasDto {
  horasPorRegistrar: number;
  horasRegistradas: number;
  promedioPorDia: number;
  // sm - Jornada diaria del colaborador (8h, o 6h si es pasante), para mostrar el progreso de horas al
  // registrar (ver CalculoHorasPeriodo en el backend).
  horasJornada: number;
}
