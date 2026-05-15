export type EstadoUsuario = 'Activo' | 'Inactivo' | 'Suspendido';
export type TipoFeriado = 'Nacional' | 'Local' | 'Religioso' | 'Institucional';

export interface Rol {
  id: number;
  nombre: string;
  descripcion: string;
  modulos: string[];
}

export interface Usuario {
  id: number;
  nombres: string;
  email: string;
  usuario: string;
  roles: string[];
  estado: EstadoUsuario;
  area: string;
}

export interface Feriado {
  id: number;
  nombre: string;
  tipo: TipoFeriado;
  fecha: string;
}

export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  type?: 'text' | 'chips' | 'status' | 'date' | 'boolean' | 'actions';
  width?: string;
}
