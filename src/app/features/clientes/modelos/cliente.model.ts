// ─────────────────────────────────────────────────────────────
//  MODELOS — Módulo Clientes  |  
// ─────────────────────────────────────────────────────────────

export type TipoIdentificacion = 'RUC' | 'Cédula' | 'Pasaporte';
export type EstadoCliente      = 'Activo' | 'Inactivo';
export type EstadoProyecto     = 'En progreso' | 'Completado' | 'Pausado' | 'Cancelado';

export interface Cliente {
  id:                  number;
  tipoId:              TipoIdentificacion;
  identificador:       string;
  nombreComercial:     string;
  correoElectronico:   string;
  telefono:            string;
  estado:              EstadoCliente;
  nombres?:            string;
  apellidos?:          string;
  direccion?:          string;
  proyectosAsignados?: ProyectoCliente[];
}

export interface ProyectoCliente {
  id:      number;
  nombre:  string;
  cliente: string;
  estado:  EstadoProyecto;
}

export interface CrearClienteRequest {
  tipoId:            TipoIdentificacion;
  identificador:     string;
  nombreComercial:   string;
  nombres:           string;
  apellidos:         string;
  correoElectronico: string;
  telefono:          string;
  direccion:         string;
}

export interface EditarClienteRequest {
  tipoId:            TipoIdentificacion;
  identificador:     string;
  nombreComercial:   string;
  nombres:           string;
  apellidos:         string;
  correoElectronico: string;
  telefono:          string;
  direccion:         string;
  estado:            EstadoCliente;
}

export interface PaginacionResponse<T> {
  items:        T[];
  totalItems:   number;
  paginaActual: number;
  tamanoPagina: number;
  totalPaginas: number;
}

export interface FiltrosCliente {
  busqueda: string;
  estado:   'todos' | EstadoCliente;
}

export interface ResumenClientes {
  totalInactivos: number;
  totalActivos:   number;
  total:          number;
}

export interface Notificacion {
  tipo:    'exito' | 'error';
  mensaje: string;
}