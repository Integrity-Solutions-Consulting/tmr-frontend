/**
 * Configuración centralizada para manejo de tokens
 */
export const TOKEN_CONFIG = {
  // Tiempo antes de expiración para emitir advertencia (segundos)
  EXPIRATION_WARNING_SECONDS: 60,
  
  // Ventana de tiempo para considerar al usuario activo (segundos)
  // Si no hay actividad en este período, se muestra modal
  ACTIVITY_CHECK_WINDOW: 60,
  
  // Intervalo de verificación del estado del token (milisegundos)
  CHECK_INTERVAL_MS: 10000,
  
  // Throttle para eventos de actividad (milisegundos)
  ACTIVITY_THROTTLE_MS: 200,
  
  // Tiempo de respuesta del modal antes de logout automático (segundos)
  MODAL_RESPONSE_TIMEOUT: 60
};
