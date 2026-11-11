import { Component, Input, inject, signal } from '@angular/core';
import { DatosFormularioOficial } from '../formulario-permiso-oficial/formulario-permiso-oficial';
import { AdjuntoPermisoApi, PermisosApiService } from '../permisos-api.service';
import { NotificacionToastService } from '../../../../shared/services/notificacion-toast.service';
@Component({selector:'app-resumen-solicitud', standalone:true, templateUrl:'./resumen-solicitud.html', styleUrl:'./resumen-solicitud.scss'})
export class ResumenSolicitudComponent {
 @Input({required:true}) datos!: DatosFormularioOficial;
 @Input() tipo = '';
 @Input() proyecto = '';
 @Input() estado = '';
 @Input() adjuntos: AdjuntoPermisoApi[] = [];
 readonly completo = signal(true);
 readonly descargando = signal(false);
 private readonly api = inject(PermisosApiService);
 private readonly toast = inject(NotificacionToastService);
 descargar(adjunto?: AdjuntoPermisoApi): void {
  if ((!this.datos.idPermiso && !this.datos.tokenExterno) || this.descargando()) return;
  this.descargando.set(true);
  const solicitud = this.datos.tokenExterno
    ? this.api.descargarEvidenciaExternaBlob(this.datos.tokenExterno, adjunto?.id)
    : this.api.descargarEvidenciaBlob(this.datos.idPermiso!, adjunto?.id);
  solicitud.subscribe({
   next: blob => { const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=adjunto?.nombreOriginal || this.datos.evidenciaNombre || 'respaldo'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),60000); this.descargando.set(false); },
   error: () => {this.descargando.set(false); this.toast.error('No se pudo descargar','Intenta descargar el respaldo nuevamente.');}
  });
 }
}
