import { createReducer, on } from '@ngrx/store';
import { AuthState } from '../modelos/auth.models';
import * as AuthActions from './auth.actions';

export const initialAuthState: AuthState = {
  user: null,
  token: null,
  loading: false,
  error: null,
  isAuthenticated: false,
  successMessage: null,
};

export const authReducer = createReducer(
  initialAuthState,
  // Login actions
  on(AuthActions.login, (state) => ({
    ...state,
    loading: true,
    error: null,
    successMessage: null,
  })),
  on(AuthActions.loginSuccess, (state, { response }) => ({
    ...state,
    user: response.user ?? null,
    token: response.accessToken ?? response.token ?? null,
    loading: false,
    error: null,
    isAuthenticated: true,
    successMessage: null,
  })),
  on(AuthActions.loginFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
    isAuthenticated: false,
    successMessage: null,
  })),
  // Logout actions
  on(AuthActions.logout, (state) => ({
    ...state,
    loading: true,
    error: null,
    successMessage: null,
  })),
  on(AuthActions.logoutSuccess, (state) => ({
    ...state,
    user: null,
    token: null,
    loading: false,
    error: null,
    isAuthenticated: false,
    successMessage: null,
  })),
  on(AuthActions.logoutFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
    successMessage: null,
  })),
  // Refresh token actions
  on(AuthActions.refreshToken, (state) => ({
    ...state,
    loading: true,
    error: null,
    successMessage: null,
  })),
  on(AuthActions.refreshTokenSuccess, (state, { token }) => ({
    ...state,
    token,
    loading: false,
    error: null,
    successMessage: null,
  })),
  on(AuthActions.refreshTokenFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
    successMessage: null,
  })),
  // Forgot password actions
  on(AuthActions.forgotPassword, (state) => ({
    ...state,
    loading: true,
    error: null,
    successMessage: null,
  })),
  on(AuthActions.forgotPasswordSuccess, (state, { response }) => ({
    ...state,
    loading: false,
    error: null,
    successMessage: response.message,
  })),
  on(AuthActions.forgotPasswordFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
    successMessage: null,
  })),
  on(AuthActions.clearSuccessMessage, (state) => ({
    ...state,
    successMessage: null,
  }))
);

