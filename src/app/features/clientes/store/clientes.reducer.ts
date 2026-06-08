import { createFeature, createReducer, on } from '@ngrx/store';
import { Cliente, FiltrosCliente, Notificacion, PaginacionResponse } from '../modelos/cliente.model';
import { ClientesActions } from './clientes.actions';

// ── State ────────────────────────────────────────────────────
export interface ClientesState {
  clientes:          Cliente[];
  totalItems:        number;
  totalPaginas:      number;
  paginaActual:      number;
  tamanoPagina:      number;
  filtros:           FiltrosCliente;
  cargando:          boolean;
  error:             string | null;
  notificacion:      Notificacion | null;
  clienteSeleccionado: Cliente | null;
  modalCrearAbierto:   boolean;
  modalEditarAbierto:  boolean;
  modalDetalleAbierto: boolean;
}

// ── Estado inicial ───────────────────────────────────────────
const estadoInicial: ClientesState = {
  clientes:            [],
  totalItems:          0,
  totalPaginas:        1,
  paginaActual:        1,
  tamanoPagina:        9,
  filtros:             { busqueda: '', estado: 'Activo' },
  cargando:            false,
  error:               null,
  notificacion:        null,
  clienteSeleccionado: null,
  modalCrearAbierto:   false,
  modalEditarAbierto:  false,
  modalDetalleAbierto: false,
};

// ── Reducer ──────────────────────────────────────────────────
export const clientesFeature = createFeature({
  name: 'clientes',
  reducer: createReducer(
    estadoInicial,

    // Cargar lista
    on(ClientesActions.cargarClientes, state => ({
      ...state, cargando: true, error: null
    })),
    on(ClientesActions.cargarClientesExitoso, (state, { respuesta }) => ({
      ...state,
      cargando:     false,
      clientes:     respuesta.items,
      totalItems:   respuesta.totalItems,
      totalPaginas: respuesta.totalPaginas,
      paginaActual: respuesta.paginaActual,
      tamanoPagina: respuesta.tamanoPagina,
    })),
    on(ClientesActions.cargarClientesFallido, (state, { error }) => ({
      ...state, cargando: false, error
    })),

    // Cargar detalle
    on(ClientesActions.cargarClientePorId, state => ({
      ...state, cargando: true
    })),
    on(ClientesActions.cargarClientePorIdExitoso, (state, { cliente }) => ({
      ...state, cargando: false, clienteSeleccionado: cliente
    })),
    on(ClientesActions.cargarClientePorIdFallido, (state, { error }) => ({
      ...state, cargando: false, error
    })),

    // Crear
    on(ClientesActions.crearCliente, state => ({
      ...state, cargando: true, error: null
    })),
    on(ClientesActions.crearClienteExitoso, (state, { cliente }) => ({
      ...state,
      cargando:          false,
      clientes:          [...state.clientes, cliente],
      modalCrearAbierto: false,
      notificacion:      { tipo: 'exito', mensaje: 'El cliente ha sido agregado exitosamente' },
    })),
    on(ClientesActions.crearClienteFallido, (state, { error }) => ({
      ...state,
      cargando:     false,
      notificacion: { tipo: 'error', mensaje: 'Error al crear el cliente. Intente nuevamente.' },
      error,
    })),

    // Editar
    on(ClientesActions.editarCliente, state => ({
      ...state, cargando: true, error: null
    })),
    on(ClientesActions.editarClienteExitoso, (state, { cliente }) => ({
      ...state,
      cargando: false,
      clientes: state.clientes.map(c => c.id === cliente.id ? cliente : c),
      modalEditarAbierto:  false,
      clienteSeleccionado: null,
      notificacion:        { tipo: 'exito', mensaje: 'El cliente ha sido editado exitosamente' },
    })),
    on(ClientesActions.editarClienteFallido, (state, { error }) => ({
      ...state,
      cargando:     false,
      notificacion: { tipo: 'error', mensaje: 'Error al editar el cliente. Intente nuevamente.' },
      error,
    })),

    // Paginación y filtros
    on(ClientesActions.cambiarPagina, (state, { pagina }) => ({
      ...state, paginaActual: pagina
    })),
    on(ClientesActions.cambiarFiltros, (state, { filtros }) => ({
      ...state, filtros, paginaActual: 1
    })),

    // Notificación
    on(ClientesActions.limpiarNotificacion, state => ({
      ...state, notificacion: null
    })),

    // Modales
    on(ClientesActions.abrirModalCrear, state => ({
      ...state, modalCrearAbierto: true
    })),
    on(ClientesActions.cerrarModalCrear, state => ({
      ...state, modalCrearAbierto: false
    })),
    on(ClientesActions.abrirModalEditar, (state, { cliente }) => ({
      ...state, modalEditarAbierto: true, clienteSeleccionado: cliente
    })),
    on(ClientesActions.cerrarModalEditar, state => ({
      ...state, modalEditarAbierto: false, clienteSeleccionado: null
    })),
    on(ClientesActions.abrirModalDetalle, (state, { cliente }) => ({
      ...state, modalDetalleAbierto: true, clienteSeleccionado: cliente
    })),
    on(ClientesActions.cerrarModalDetalle, state => ({
      ...state, modalDetalleAbierto: false, clienteSeleccionado: null
    })),
  )
});

export const {
  name: clientesFeatureName,
  reducer: clientesReducer,
  selectClientesState,
  selectClientes,
  selectTotalItems,
  selectTotalPaginas,
  selectPaginaActual,
  selectTamanoPagina,
  selectFiltros,
  selectCargando,
  selectError,
  selectNotificacion,
  selectClienteSeleccionado,
  selectModalCrearAbierto,
  selectModalEditarAbierto,
  selectModalDetalleAbierto,
} = clientesFeature;
