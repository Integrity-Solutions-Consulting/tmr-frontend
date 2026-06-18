import { createFeatureSelector, createSelector } from '@ngrx/store';
import { DashboardState } from './dashboard.reducer';

export const selectDashboardState = createFeatureSelector<DashboardState>('dashboard');

export const selectDashboardData = createSelector(
  selectDashboardState,
  (state: DashboardState) => state.data
);

export const selectDashboardLoading = createSelector(
  selectDashboardState,
  (state: DashboardState) => state.loading
);

export const selectDashboardError = createSelector(
  selectDashboardState,
  (state: DashboardState) => state.error
);

export const selectMetricas = createSelector(
  selectDashboardData,
  (data) => data?.metricas || null
);

export const selectProximosACerrar = createSelector(
  selectDashboardData,
  (data) => data?.proximosACerrar || []
);

export const selectHorasPorProyecto = createSelector(
  selectDashboardData,
  (data) => data?.horasPorProyecto || []
);

export const selectProyectosPorCliente = createSelector(
  selectDashboardData,
  (data) => data?.proyectosPorCliente || []
);
