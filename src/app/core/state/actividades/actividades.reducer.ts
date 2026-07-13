import { createReducer, on } from '@ngrx/store';
import { ActividadesActions } from './actividades.actions';
import { Actividad } from '../../models/actividad.model';

export interface ActividadesState {
  items: Actividad[];
  cargando: boolean;
  importing: boolean;
  error: any;
}

export const initialState: ActividadesState = {
  items: [],
  cargando: false,
  importing: false,
  error: null,
};

export const actividadesReducer = createReducer(
  initialState,

  // Carga inicial
  on(ActividadesActions.cargarActividades, (state) => ({
    ...state,
    cargando: true,
    error: null
  })),

  on(ActividadesActions.cargarActividadesSuccess, (state, { actividades }) => ({
    ...state,
    items: actividades,
    cargando: false,
    error: null
  })),

  on(ActividadesActions.cargarActividadesFailure, (state, { error }) => ({
    ...state,
    cargando: false,
    error
  })),

  // Importar Excel
  on(ActividadesActions.importarExcel, (state) => ({
    ...state,
    importing: true,
    error: null
  })),

  on(ActividadesActions.importarExcelSuccess, (state, { actividades }) => {
    // Acumula evitando duplicados por id (los nuevos tienen prioridad)
    const existingIds = new Set(actividades.map(a => a.id));
    const previosSinDuplicados = state.items.filter(a => !existingIds.has(a.id));
    return {
      ...state,
      items: [...previosSinDuplicados, ...actividades],
      importing: false,
      error: null
    };
  }),

  on(ActividadesActions.importarExcelFailure, (state, { error }) => ({
    ...state,
    importing: false,
    error
  })),

  on(ActividadesActions.resetEstado, () => ({ ...initialState }))
);