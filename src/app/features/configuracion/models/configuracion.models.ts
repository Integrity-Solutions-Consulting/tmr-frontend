export type EstadoUsuario = 'Activo' | 'Inactivo' | 'Suspendido';
export type TipoFeriado = 'Nacional' | 'Local' | 'Religioso' | 'Institucional';

export interface Rol {
  id: number;
  nombre: string;
  descripcion: string;
  modulos: string[];
}

export interface UsuarioPayload {
  idGenero: string;
  idNacionalidad: string;
  idTipoIdentificacion: string;
  tipoIdentificacion: string;
  numeroidentificacion: string;
  nombres: string;
  apellidos: string;
  correoContacto: string;
  tipoPersona: string;
  fechaNacimiento: string | null;
  usuarioCreacion: string;
  idUsuarioCreacion: string;
  ip: string;
  email: string;
  usuario: string;
  password: string;
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
