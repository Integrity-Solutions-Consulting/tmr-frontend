import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { NotificacionToastService } from '../../../shared/services/notificacion-toast.service';
import { DatosFormularioOficial } from './formulario-permiso-oficial/formulario-permiso-oficial';
import { PermisosApiService } from './permisos-api.service';

@Injectable({
  providedIn: 'root',
})
export class PermisosPdfService {
  private readonly permisosApi = inject(PermisosApiService);
  private readonly toast = inject(NotificacionToastService);

  /**
   * Descarga el PDF oficial generado por QuestPDF en el backend
   * (GET /api/permisos/{id}/pdf o GET /api/permisos/externo/{token}/pdf).
   */
  async descargarFormularioPdf(datos: DatosFormularioOficial): Promise<void> {
    const folioLimpio = (datos.folio || 'Permiso').replace(/[^A-Za-z0-9_-]/g, '_');
    const nombreArchivo = `Formulario_Permiso_${folioLimpio}.pdf`;

    try {
      let blob: Blob;
      if (datos.tokenExterno) {
        blob = await firstValueFrom(this.permisosApi.descargarPdfExternoBlob(datos.tokenExterno));
      } else if (datos.idPermiso) {
        blob = await firstValueFrom(this.permisosApi.descargarPdfBlob(datos.idPermiso));
      } else {
        this.toast.error(
          'Solicitud aún no guardada',
          'Guarda primero tu solicitud para poder descargar el formulario oficial en PDF.',
        );
        return;
      }

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = nombreArchivo;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch {
      this.toast.error(
        'No se pudo descargar el PDF',
        'No pudimos generar la descarga en este momento. Por favor inténtalo nuevamente en unos segundos.',
      );
    }
  }
}
