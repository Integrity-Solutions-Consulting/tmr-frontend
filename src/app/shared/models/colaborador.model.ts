// src/app/shared/models/colaborador.model.ts
export interface Colaborador {
  id: string;
  nombre: string;
  proyecto: string;
  cliente: string;
  liderTecnico: string;
  nroHoras: number;
  estado: 'Completo' | 'En progreso' | 'Pendiente';
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
