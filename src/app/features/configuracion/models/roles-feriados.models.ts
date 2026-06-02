export interface Rol {
  id: number;
  nombre: string;
  descripcion?: string | null;
  modulos: Array<'dashboard' | 'proyectos' | 'actividades' | 'seguimiento'>;
  activo: boolean;
}

export interface RolCreate {
  nombre: string;
  descripcion?: string;
  modulos: Array<'dashboard' | 'proyectos' | 'actividades' | 'seguimiento'>;
}

export interface Feriado {
  id: number;
  tipo: 'Local' | 'Nacional' | 'Religioso';
  nombre: string;
  fecha: string; // ISO date
  descripcion?: string | null;
  recurrente: boolean;
  activo: boolean;
}

export interface FeriadoCreate {
  tipo: 'Local' | 'Nacional' | 'Religioso';
  nombre: string;
  fecha: string; // ISO date
  descripcion?: string;
  recurrente?: boolean;
}
