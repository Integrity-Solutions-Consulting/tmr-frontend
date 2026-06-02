export interface PaginacionConfig {
  paginaActual: number;
  porPagina: number;
  total: number;
  totalPaginas: number;
}
 
export interface PaginacionCambio {
  pagina: number;
  porPagina: number;
}