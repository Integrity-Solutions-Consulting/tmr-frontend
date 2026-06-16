import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ActividadesState } from './actividades.reducer';

export const selectActividadesState = createFeatureSelector<ActividadesState>('actividades');

export const selectActividadesList = createSelector(
  selectActividadesState,
  (state) => state.items
);

export const selectIsImporting = createSelector(
  selectActividadesState,
  (state) => state.importing
);

export const selectActividadesError = createSelector(
  selectActividadesState,
  (state) => state.error
);

export const selectHasActividades = createSelector(
  selectActividadesList,
  (items) => items.length > 0
);