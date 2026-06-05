/**
 * Configuración de Autenticación
 * Define constantes y configuración centralizada para el manejo de tokens
 */

export const AUTH_CONFIG = {
  // Clave bajo la cual se almacena el token en localStorage
  TOKEN_KEY: 'accessToken',

  // Token JWT válido para desarrollo
  TOKEN_VALUE: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiZW1haWwiOiJhZG1pbkB0bXIuY29tIiwianRpIjoiYjhiYTc0MjgtZGQzOC00NzEwLWJkMGUtYzI5MjdjNzEwYmQ1IiwiaWF0IjoxNzgwNjM3NzU3LCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL3JvbGUiOiJBZG1pbmlzdHJhZG9yIiwiZXhwIjoxNzgwNjM4NjU3LCJpc3MiOiJ0bXItYmFja2VuZCIsImF1ZCI6InRtci1mcm9udGVuZCJ9.vHuMfBghN4eM0gHrZnfwcwH6Wijc_fudzcTQks7rIGg',
  //TOKEN_VALUE: localStorage.getItem('authToken') || '',
  // URL base de la API de autenticación
  API_URL: 'http://localhost:7082/api',

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
