import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ActividadesState } from './actividades.reducer';

export const selectActividadesState = createFeatureSelector<ActividadesState>('actividades');

export const selectActividadesList = createSelector(
  selectActividadesState,
  (state) => state.items
);

export const selectActividadesCargando = createSelector(
  selectActividadesState,
  (state) => state.cargando
);