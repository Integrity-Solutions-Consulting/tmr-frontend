/**
 * Configuración para pruebas de expiración de tokens
 * En desarrollo, puedes cambiar estos valores para probar el comportamiento de expiración
 */

export const TOKEN_DEBUG_CONFIG = {
  /**
   * Habilitar logs de debug en TokenMonitorService
   */
  ENABLE_LOGS: true,

  /**
   * Intervalo de chequeo en milisegundos (10 segundos por defecto)
   * Para pruebas rápidas, reducir a 5000 ms (5 segundos)
   */
  CHECK_INTERVAL_MS: 10000,

  /**
   * IMPORTANTE: Para pruebas locales, en el backend cambiar:
   * - appsettings.Development.json: "AccessTokenMinutes": 1
   * Esto generará tokens con 1 minuto de vida útil
   */
  DEV_NOTES: `
    Para pruebas de expiración:
    1. En tmr-backend/appsettings.Development.json:
       "Jwt": {
         "AccessTokenMinutes": 1,  // Token expira en 1 minuto
         ...
       }
    2. El modal aparecerá a los 59 segundos
    3. El logout automático ocurrirá a los 60 segundos
  `
};
