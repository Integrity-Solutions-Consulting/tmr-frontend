export interface Actividad {
  id?: string;
  colaborador: string;
  proyecto: string;
  cliente: string;
  liderTecnico: string;
  nroHoras: number;
  estado: 'Cargado' | 'Pendiente' | 'Error';
}

export interface ActividadesState {
  items: Actividad[];
  loading: boolean;
  importing: boolean;
  error: string | null;
}