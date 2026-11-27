import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AuthState } from '../modelos/auth.models';

export const authFeatureKey = 'auth';

export const selectAuthState = createFeatureSelector<AuthState>(authFeatureKey);

export const selectIsLoading = createSelector(
  selectAuthState,
  (state: AuthState) => state.loading
);

export const selectError = createSelector(
  selectAuthState,
  (state: AuthState) => state.error
);

export const selectSuccessMessage = createSelector(
  selectAuthState,
  (state: AuthState) => state.successMessage
);

