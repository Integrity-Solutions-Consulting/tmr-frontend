export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  token?: string;
  user?: User | null;
  data?: {
    accessToken?: string;
    token?: string;
    user?: User;
    usuario?: User;
  };
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  successMessage: string | null;
}
