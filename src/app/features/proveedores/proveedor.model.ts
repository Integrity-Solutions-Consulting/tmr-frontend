export interface TipoProveedor {
  id: number;
  nombre: string;
}

export interface Proveedor {
  id: number;
  nombreproveedor: string;
  ruc?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  activo: boolean;
  idtipoproveedor?: number;
  tipoProveedor?: string;
  fechacreacion: string;
}

export interface ProveedoresPaginados {
  items: Proveedor[];
  total: number;
  pagina: number;
  tamanoPagina: number;
}

export interface ResumenProveedores {
  total: number;
  activos: number;
  inactivos: number;
}

export interface DetalleProveedor {
  proveedor: Proveedor;
  facturasRelacionadas: number;
}

export interface ProveedorPayload {
  nombreProveedor: string;
  idTipoProveedor: number | null;
  ruc: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  activo: boolean;
}

export type CampoOrdenableProveedor = 'nombreproveedor' | 'tipoProveedor' | 'ruc' | 'activo';

export interface FiltrosProveedores {
  busqueda: string;
  tipoProveedorId: string;
  estado: string[];
}

export interface ConsultaProveedores extends FiltrosProveedores {
  pagina: number;
  tamanoPagina: number;
  ordenarPor: CampoOrdenableProveedor;
  ascendente: boolean;
}
