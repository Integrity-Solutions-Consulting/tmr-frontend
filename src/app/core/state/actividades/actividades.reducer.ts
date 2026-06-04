import { createReducer, on } from '@ngrx/store';
import { ActividadesActions } from './actividades.actions';
import { Actividad } from '../../models/actividad.model';

// 1. Interfaz del estado
export interface ActividadesState {
  items: Actividad[];
  importing: boolean;
  error: any;
  horasPendientes: string;
}

export const initialState: ActividadesState = {
  items: [],
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

  on(ActividadesActions.importarExcelSuccess, (state, { actividades }) => ({
    ...state,
    items: actividades,
    importing: false,
    horasPendientes: '45,20 h', // Simulación de actualización
    error: null
  })),

  on(ActividadesActions.importarExcelFailure, (state, { error }) => ({
    ...state,
    importing: false,
    error: error
  }))
);
