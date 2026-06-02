import { createSelector } from '@ngrx/store';
import { selectClientesState } from './clientes.reducer';

export const selectResumenClientes = createSelector(
  selectClientesState,
  state => ({
    totalInactivos: state.clientes.filter(c => c.estado === 'Inactivo').length,
    totalActivos:   state.clientes.filter(c => c.estado === 'Activo').length,
    total:          state.clientes.length,
  })
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