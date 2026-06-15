export interface User {
  id: string;
  email: string;
  name: string;
  modulos?: string[];
  idEmpleado?: number;
  debeCambiarPassword?: boolean;
}

/**
 * AuthResponse - Respuesta del backend para login y refresh-token
 * Nota: Las propiedades del backend vienen en PascalCase
 */
export interface AuthResponse {
  // Propiedades del nuevo flujo (login y refresh-token) - REQUERIDAS
  accessToken: string;
  refreshToken: string;
  expiresAt: string | Date;
  tokenFamilyId: string;
  user: User | null;
  debeCambiarPassword?: boolean;
  debeCambiarContrasena?: boolean;

  // Propiedades legacies para retrocompatibilidad
  token?: string;
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

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

