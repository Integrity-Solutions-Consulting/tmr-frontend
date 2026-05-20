import { createAction, props } from '@ngrx/store';
import { DashboardData } from '../modelos/dashboard.model';

export const loadDashboardData = createAction(
  '[Dashboard] Load Dashboard Data'
);

export const loadDashboardDataSuccess = createAction(
  '[Dashboard] Load Dashboard Data Success',
  props<{ data: DashboardData }>()
);

export const loadDashboardDataFailure = createAction(
  '[Dashboard] Load Dashboard Data Failure',
  props<{ error: any }>()
);
