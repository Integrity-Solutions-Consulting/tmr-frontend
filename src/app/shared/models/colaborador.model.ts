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
}
