import { ErrorHandler, Injectable } from '@angular/core';

@Injectable()
export class ChunkErrorHandler implements ErrorHandler {
  handleError(error: any): void {
    const errorString = error?.message || error?.toString() || '';

    // Intercepta errores típicos de carga de chunks cuando cambia el hash de compilación en producción
    if (errorString.includes('Loading chunk') || errorString.includes('ChunkLoadError')) {
      console.warn('⚠️ Detectada falla de carga de módulo por nueva versión. Recargando la aplicación...');
      window.location.reload();
      return;
    }

    // Registrar otros errores en consola por defecto
    console.error(error);
  }
}
