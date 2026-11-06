import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificacionToastService } from '../../../../shared/services/notificacion-toast.service';
import { PermisosApiService } from '../permisos-api.service';

export type TipoPermisoOficial =
  | 'VACACIONES'
  | 'LICENCIA_ENFERMEDAD'
  | 'CITAS_MEDICAS'
  | 'MATRIMONIO'
  | 'NACIMIENTO_HIJO'
  | 'OTROS'
  | 'MATERNIDAD'
  | 'FALLECIMIENTO_FAMILIAR';

export type HorarioPermisoOficial = 'MANANA' | 'TARDE' | 'COMPLETA' | 'OTROS';

export interface DatosFormularioOficial {
  idPermiso?: number;
  tokenExterno?: string;
  folio?: string;
  diaSolicitud: string;
  mesSolicitud: string;
  anioSolicitud: string;
  apellidosNombres: string;
  numeroCedula: string;
  cargo: string;
  cliente: string;
  jefeInmediato: string;
  tipoPermiso: TipoPermisoOficial;
  motivos: string;
  evidenciaNombre?: string;
  evidenciaUrl?: string;
  evidenciaUrlDescarga?: string;
  fechaInicio: string;
  fechaFinalizacion: string;
  fechaRegreso: string;
  fechaAprobacion: string;
  diasSolicitados: string | number;
  horario: HorarioPermisoOficial;
  detalleHorario?: string;
  horasSolicitadas: string | number;
  aprobacionLider?: {
    aprobado: boolean;
    responsable: string;
    metodo: string;
    fecha?: string;
  };
  aprobacionTalentoHumano?: {
    aprobado: boolean;
    responsable: string;
    fecha?: string;
  };
  comentarios?: string;
}

@Component({
  selector: 'app-formulario-permiso-oficial',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './formulario-permiso-oficial.html',
  styleUrl: './formulario-permiso-oficial.scss',
})
export class FormularioPermisoOficialComponent {
  private readonly permisosApi = inject(PermisosApiService);
  private readonly toast = inject(NotificacionToastService);

  @Input({ required: true }) datos!: DatosFormularioOficial;

  descargandoEvidencia = false;

  esTipo(tipo: TipoPermisoOficial): boolean {
    return this.datos?.tipoPermiso === tipo;
  }

  esHorario(horario: HorarioPermisoOficial): boolean {
    return this.datos?.horario === horario;
  }

  get puedeDescargarEvidencia(): boolean {
    return Boolean(
      this.datos?.evidenciaNombre &&
        (this.datos.tokenExterno ||
          this.datos.idPermiso ||
          this.datos.evidenciaUrlDescarga ||
          this.datos.evidenciaUrl),
    );
  }

  abrirEvidencia(event: Event): void {
    event.preventDefault();
    if (this.descargandoEvidencia) return;

    if (this.datos?.tokenExterno) {
      const urlExt = this.permisosApi.obtenerUrlEvidenciaExterna(this.datos.tokenExterno);
      window.open(urlExt, '_blank', 'noopener');
      return;
    }

    if (this.datos?.idPermiso) {
      this.descargandoEvidencia = true;
      this.permisosApi.descargarEvidenciaBlob(this.datos.idPermiso).subscribe({
        next: (blob) => {
          this.descargandoEvidencia = false;
          const objectUrl = URL.createObjectURL(blob);
          const nuevaVentana = window.open(objectUrl, '_blank', 'noopener');
          if (!nuevaVentana) {
            const enlace = document.createElement('a');
            enlace.href = objectUrl;
            enlace.download = this.datos.evidenciaNombre || `evidencia_${this.datos.idPermiso}`;
            enlace.click();
          }
          setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
        },
        error: () => {
          this.descargandoEvidencia = false;
          this.toast.error(
            'No se pudo abrir la evidencia',
            'No pudimos abrir el documento adjunto en este momento. Inténtalo nuevamente en unos segundos.',
          );
        },
      });
      return;
    }

    const fallbackUrl = this.datos?.evidenciaUrlDescarga || this.datos?.evidenciaUrl;
    if (fallbackUrl) {
      window.open(fallbackUrl, '_blank', 'noopener');
    }
  }
}
