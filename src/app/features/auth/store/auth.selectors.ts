import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AuthState } from '../modelos/auth.models';

export const authFeatureKey = 'auth';

export const selectAuthState = createFeatureSelector<AuthState>(authFeatureKey);

export const selectUser = createSelector(
  selectAuthState,
  (state: AuthState) => state.user
);

export const selectToken = createSelector(
  selectAuthState,
  (state: AuthState) => state.token
);

export const selectIsLoading = createSelector(
  selectAuthState,
  (state: AuthState) => state.loading
);

export const selectError = createSelector(
  selectAuthState,
  (state: AuthState) => state.error
);

export const selectIsAuthenticated = createSelector(
  selectAuthState,
  (state: AuthState) => state.isAuthenticated
);

export const selectSuccessMessage = createSelector(
  selectAuthState,
  (state: AuthState) => state.successMessage
);

