/**
 * Configuración de Autenticación
 * Define constantes y configuración centralizada para el manejo de tokens
 */

export const AUTH_CONFIG = {
  // Clave bajo la cual se almacena el token en localStorage
  TOKEN_KEY: 'authToken',

  // Token JWT válido para desarrollo
  //TOKEN_VALUE: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxNSIsImVtYWlsIjoibWFyaWJlbEBnbWFpbC5jb20iLCJpYXQiOjE3Nzk5MDc2MjAsImV4cCI6MTc3OTkxMTIyMCwiaXNzIjoidG1yLWJhY2tlbmQiLCJhdWQiOiJ0bXItdXN1YXJpb3MifQ.HDbViTON9C4gIccGK8DFHTvfGaUKMGMqwausREkSwdw',
  TOKEN_VALUE: localStorage.getItem('token') || '',
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
