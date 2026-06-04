import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ActividadesState } from './actividades.reducer';

// 1. Apuntamos a la "porción" de actividades en el Store global
export const selectActividadesState = createFeatureSelector<ActividadesState>('actividades');

// 2. Selector para obtener la lista de items (la tabla)
export const selectActividadesList = createSelector(
  selectActividadesState,
  (state) => state.items
);

// 3. Selector para saber si estamos importando (el spinner del botón)
export const selectIsImporting = createSelector(
  selectActividadesState,
  (state) => state.importing
);

// 4. Selector para capturar errores
export const selectActividadesError = createSelector(
  selectActividadesState,
  (state) => state.error
);

// 5. Selector útil: saber si la tabla está vacía
export const selectHasActividades = createSelector(
  selectActividadesList,
  (items) => items.length > 0
);
// 6. Selector para las horas pendientes por registrar
export const selectHorasPendientes = createSelector(
  selectActividadesState,
  (state) => state.horasPendientes
);
