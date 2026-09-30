// src/app/shared/models/colaborador.model.ts
// sm - Un proyecto del colaborador en el rango consultado, con sus horas propias (ver Colaborador.proyectos).
export interface ProyectoResumen {
  idProyecto: number;
  nombre: string;
  cliente: string;
  liderTecnico: string;
  horasRegistradas: number;
}

export interface Colaborador {
  id: string;
  nombre: string;
  proyecto: string;
  // sm - Desglose por proyecto (Seguimiento): cada proyecto del colaborador en el rango con sus horas propias.
  // Se usa para generar un archivo de reporte por proyecto al descargar y para el desglose del modal "Ver detalle".
  // Vacío/undefined cuando el colaborador no tiene proyecto asignado ("Sin Proyecto").
  proyectos?: ProyectoResumen[];
  cliente: string;
  liderTecnico: string;
  nroHoras: number;
  // sm - Estado automático según los días del periodo; '-' cuando el periodo no tiene días laborables.
  estado: 'Completo' | 'En progreso' | 'Pendiente' | '-';
  diasConReporte: number;
  diasACompletar: number;
  // sm - Campos que envía el backend de Seguimiento para calcular "Horas por registrar".
  // Opcionales porque solo vienen en el endpoint de seguimiento (este modelo también se usa en otros lugares).
  horasJornada?: number;      // 8 h, o 6 h si es pasante (contrato Pasantía)
  horasEsperadas?: number;    // días laborables del rango (sin feriados, solo días trabajados) × jornada
  horasPorRegistrar?: number; // max(0, horasEsperadas − horas registradas)
  // sm - Para "Promedio por día": días laborables del periodo (hasta hoy, sin fines de semana ni feriados)
  // y horas registradas en esos días.
  diasLaborables?: number;
  horasDiasLaborables?: number;
}
