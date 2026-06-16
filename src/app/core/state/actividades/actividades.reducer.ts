import { createReducer, on } from '@ngrx/store';
import { ActividadesActions } from './actividades.actions';
import { Actividad } from '../../models/actividad.model';

const STORAGE_KEY = 'actividades_items';

function cargarDesdeStorage(): Actividad[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Actividad[]) : [];
  } catch {
    return [];
  }
}

function guardarEnStorage(items: Actividad[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // cuota excedida u otro error: ignorar silenciosamente
  }
}

export interface ActividadesState {
  items: Actividad[];
  importing: boolean;
  error: any;
  horasPendientes: string;
}

export const initialState: ActividadesState = {
  items: cargarDesdeStorage(),   // <-- rehidrata al arrancar
  importing: false,
  error: null,
  horasPendientes: '96,50 h'
};

export const actividadesReducer = createReducer(
  initialState,

  on(ActividadesActions.importarExcel, (state) => ({
    ...state,
    importing: true,
    error: null
  })),

  on(ActividadesActions.importarExcelSuccess, (state, { actividades }) => {
    const existingIds = new Set(actividades.map(a => a.id));
    const previosSinDuplicados = state.items.filter(a => !existingIds.has(a.id));
    const itemsAcumulados = [...previosSinDuplicados, ...actividades];

    guardarEnStorage(itemsAcumulados);   // <-- persiste

    return {
      ...state,
      items: itemsAcumulados,
      importing: false,
      error: null
    };
  }),

  on(ActividadesActions.importarExcelFailure, (state, { error }) => ({
    ...state,
    importing: false,
    error: error
  })),

  on(ActividadesActions.resetEstado, () => {
    localStorage.removeItem(STORAGE_KEY);   // <-- limpia storage al resetear
    return { ...initialState, items: [] };
  })
);