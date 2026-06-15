export type EstadoUsuario = 'Activo' | 'Inactivo' | 'Suspendido';
export type TipoFeriado = 'Nacional' | 'Local' | 'Institucional';

export interface Modulo {
  id: number;
  nombre: string;
}

export interface Rol {
  id: number;
  nombre: string;
  descripcion: string;
  modulos: Modulo[];
  modulosids?: number[];
  activo: boolean;
}

export interface UsuarioPayload {
  idPersona: number | null;
  email: string;
  usuario: string;
  password?: string;
  debeCambiarPassword: boolean;
  usuarioInterno: boolean;
  rolesids: string[];
}

export interface Usuario extends UsuarioPayload {
  id: number;
  idUsuario: number;
  estado: EstadoUsuario;
  numeroidentificacion?: string | null;
  nombres?: string | null;
  apellidos?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  fechanacimiento?: string | null;
  ultimologin?: string | null;
}

export interface ColaboradorUsuarioOption {
  id: number;
  idPersona?: number | null;
  codigoEmpleado?: string;
  numeroIdentificacion?: string;
  nombreCompleto: string;
  email?: string;
  cargo?: string;
  activo?: boolean;
}

export interface RegisterUserRequest {
  idRol: number;
  idGenero: number;
  idNacionalidad: number;
  idTipoIdentificacion: number;
  tipoIdentificacion: 'C' | 'R' | 'P' | 'O';
  numeroidentificacion: string;
  nombres: string;
  apellidos: string;
  correoContacto: string;
  tipoPersona: 'NATURAL' | 'JURIDICA';
  fechaNacimiento: string;
  telefono: string | null;
  direccion: string | null;
  email: string;
  usuario: string;
}

export interface Feriado {
  id: number;
  nombre: string;
  tipo: TipoFeriado;
  fecha: string;
  descripcion?: string;
  recurrente: boolean;
  activo: boolean;
}

export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  type?: 'text' | 'chips' | 'status' | 'date' | 'boolean' | 'actions';
  width?: string;
}
