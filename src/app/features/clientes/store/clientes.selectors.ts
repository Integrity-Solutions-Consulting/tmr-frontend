import { createSelector } from '@ngrx/store';
import { selectClientesState } from './clientes.reducer';

export const selectResumenClientes = createSelector(
  selectClientesState,
  state => state.resumen
);

export const selectPaginacionInfo = createSelector(
  selectClientesState,
  state => ({
    paginaActual: state.paginaActual,
    totalPaginas: state.totalPaginas,
    totalItems:   state.totalItems,
    tamanoPagina: state.tamanoPagina,
  })
);

export {
  selectClientes,
  selectCargando,
  selectNotificacion,
  selectClienteSeleccionado,
  selectModalCrearAbierto,
  selectModalEditarAbierto,
  selectModalDetalleAbierto,
  selectFiltros,
  selectPaginaActual,
  selectTotalPaginas,
  selectTotalItems,
} from './clientes.reducer';
