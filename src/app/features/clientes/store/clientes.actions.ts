import { createActionGroup, emptyProps, props } from '@ngrx/store';
import {
  Cliente, CrearClienteRequest, EditarClienteRequest,
  PaginacionResponse, FiltrosCliente
} from '../modelos/cliente.model';

export const ClientesActions = createActionGroup({
  source: 'Clientes',
  events: {

    // ── Cargar lista ────────────────────────────────────────
    'Cargar Clientes': props<{ pagina: number; tamanoPagina: number; filtros: FiltrosCliente }>(),
    'Cargar Clientes Exitoso': props<{ respuesta: PaginacionResponse<Cliente> }>(),
    'Cargar Clientes Fallido': props<{ error: string }>(),

    // ── Cargar detalle ──────────────────────────────────────
    'Cargar Cliente Por Id': props<{ id: number }>(),
    'Cargar Cliente Por Id Exitoso': props<{ cliente: Cliente }>(),
    'Cargar Cliente Por Id Fallido': props<{ error: string }>(),

    // ── Crear ───────────────────────────────────────────────
    'Crear Cliente': props<{ request: CrearClienteRequest }>(),
    'Crear Cliente Exitoso': props<{ cliente: Cliente }>(),
    'Crear Cliente Fallido': props<{ error: string }>(),

    // ── Editar ──────────────────────────────────────────────
    'Editar Cliente': props<{ id: number; request: EditarClienteRequest }>(),
    'Editar Cliente Exitoso': props<{ cliente: Cliente }>(),
    'Editar Cliente Fallido': props<{ error: string }>(),

    // ── UI ──────────────────────────────────────────────────
    'Cambiar Pagina':   props<{ pagina: number }>(),
    'Cambiar Filtros':  props<{ filtros: FiltrosCliente }>(),
    'Limpiar Notificacion': emptyProps(),
    'Abrir Modal Crear': emptyProps(),
    'Cerrar Modal Crear': emptyProps(),
    'Abrir Modal Editar': props<{ cliente: Cliente }>(),
    'Cerrar Modal Editar': emptyProps(),
    'Abrir Modal Detalle': props<{ cliente: Cliente }>(),
    'Cerrar Modal Detalle': emptyProps(),
  }
});