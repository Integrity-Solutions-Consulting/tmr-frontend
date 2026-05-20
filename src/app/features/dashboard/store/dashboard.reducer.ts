import { createReducer, on } from '@ngrx/store';
import { DashboardData } from '../modelos/dashboard.model';
import * as DashboardActions from './dashboard.actions';

export interface DashboardState {
  data: DashboardData | null;
  loading: boolean;
  error: any | null;
}

const initialState: DashboardState = {
  data: null,
  loading: false,
  error: null
};

export const dashboardReducer = createReducer(
  initialState,
  on(DashboardActions.loadDashboardData, (state) => ({
    ...state,
    loading: true,
    error: null
  })),
  on(DashboardActions.loadDashboardDataSuccess, (state, { data }) => ({
    ...state,
    data,
    loading: false,
    error: null
  })),
  on(DashboardActions.loadDashboardDataFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  }))
);
