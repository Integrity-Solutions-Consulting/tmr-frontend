export type EstadoUsuario = 'Activo' | 'Inactivo' | 'Suspendido';
export type TipoFeriado = 'Nacional' | 'Local' | 'Institucional';

export interface Rol {
  id: number;
  nombre: string;
  descripcion: string;
  modulos: string[];
  activo: boolean;
}

export interface UsuarioPayload {
  idGenero: number | string;
  idNacionalidad: number | string;
  idTipoIdentificacion: number | string;
  tipoIdentificacion: 'C' | 'R' | 'P' | 'O' | string;
  numeroidentificacion: string;
  nombres: string;
  apellidos: string;
  correoContacto: string;
  tipoPersona: 'NATURAL' | 'JURIDICA' | string;
  fechaNacimiento: string | null;
  usuarioCreacion: string;
  idUsuarioCreacion: string;
  ip: string;
  email: string;
  usuario: string;
  password?: string;
  debeCambiarPassword: boolean;
  usuarioInterno: boolean;
  idtipoidentificacion: string;
  idgenero: string;
  idnacionalidad: string;
  fechanacimiento: string | null;
  telefono: string | null;
  direccion: string | null;
  rolesids: string[];
}

export interface Usuario extends UsuarioPayload {
  id: number;
  estado: EstadoUsuario;
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
