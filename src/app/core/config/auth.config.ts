/**
 * Configuración de Autenticación
 * Define constantes y configuración centralizada para el manejo de tokens
 */

export const AUTH_CONFIG = {
  // Clave bajo la cual se almacena el token en localStorage
  TOKEN_KEY: 'authToken',

  // Token JWT válido para desarrollo
  TOKEN_VALUE: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxNCIsImVtYWlsIjoicXdlQHF3ZS5jb20iLCJpYXQiOjE3Nzk4OTgzNjgsImV4cCI6MTc3OTkwMTk2OCwiaXNzIjoidG1yLWJhY2tlbmQiLCJhdWQiOiJ0bXItdXN1YXJpb3MifQ.zo0LGvcHAzhvgAWykR5uLXNt57fKShtkTUjgvjbpOig',

  // URL base de la API de autenticación
  API_URL: 'http://localhost:5071/api',

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
