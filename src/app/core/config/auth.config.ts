import { environment } from '../../../environments/environment';

/**
 * Configuración de Autenticación
 * Define constantes y configuración centralizada para el manejo de tokens
 */

export const AUTH_CONFIG = {
  // Clave bajo la cual se almacena el token en localStorage
  TOKEN_KEY: 'accessToken',

  // Token JWT válido para desarrollo
  TOKEN_VALUE: '',
  //TOKEN_VALUE: localStorage.getItem('accessToken') || '',
  // URL base de la API de autenticación
  API_URL: environment.apiUrl,

  // Endpoints
  ENDPOINTS: {
    LOGIN: '/auth/login',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout'
  },

  // Tiempo de expiración del token (en minutos)
  TOKEN_EXPIRATION: 60,

  // Habilitar logs de autenticación
  DEBUG: true
};
