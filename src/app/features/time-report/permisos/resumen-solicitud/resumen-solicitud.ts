import { Component, Input, inject, signal } from '@angular/core';
import { DatosFormularioOficial } from '../formulario-permiso-oficial/formulario-permiso-oficial';
import { AdjuntoPermisoApi, PermisosApiService } from '../permisos-api.service';
import { NotificacionToastService } from '../../../../shared/services/notificacion-toast.service';

@Component({
  selector: 'app-resumen-solicitud',
  standalone: true,
  templateUrl: './resumen-solicitud.html',
  styleUrl: './resumen-solicitud.scss',
})
export class ResumenSolicitudComponent {
  @Input({ required: true }) datos!: DatosFormularioOficial;
  @Input() tipo = '';
  @Input() proyecto = '';
  @Input() estado = '';
  @Input() adjuntos: AdjuntoPermisoApi[] = [];

  readonly completo = signal(true);
  readonly descargando = signal(false);

  private readonly api = inject(PermisosApiService);
  private readonly toast = inject(NotificacionToastService);

  get fechasYHorario(): string {
    const ini = this.datos?.fechaInicio || '';
    const fin = this.datos?.fechaFinalizacion || '';
    const rango = ini && fin && ini !== fin ? `${ini} – ${fin}` : ini || fin;
    const detalle = (this.datos?.detalleHorario || '').trim();
    if (detalle) {
      return `${rango} · ${detalle}`;
    }
    return `${rango} · 08:30 – 17:30`;
  }

  get duracionFormateada(): string {
    const textoHoras = String(this.datos?.horasSolicitadas ?? '').replace(',', '.');
    const matchHoras = textoHoras.match(/(\d+(?:\.\d+)?)/);
    let horasTotales = matchHoras ? parseFloat(matchHoras[1]) : NaN;

    if (!Number.isFinite(horasTotales) || horasTotales <= 0) {
      const textoDias = String(this.datos?.diasSolicitados ?? '').replace(',', '.');
      const matchDias = textoDias.match(/(\d+(?:\.\d+)?)/);
      const diasNum = matchDias ? parseFloat(matchDias[1]) : NaN;
      if (Number.isFinite(diasNum) && diasNum > 0) {
        horasTotales = diasNum * 8;
      } else {
        return [this.datos?.diasSolicitados, this.datos?.horasSolicitadas]
          .filter(Boolean)
          .join(' · ');
      }
    }

    const minutosTotales = Math.round(horasTotales * 60);
    const diasEnteros = Math.floor(minutosTotales / 480);
    const minutosRestantes = minutosTotales % 480;

    const formatearMinutos = (min: number): string => {
      const h = Math.floor(min / 60);
      const m = min % 60;
      if (h === 0) return `${m} min`;
      if (m === 0) return `${h} ${h === 1 ? 'hora' : 'horas'}`;
      return `${h} ${h === 1 ? 'hora' : 'horas'} y ${m} min`;
    };

    if (diasEnteros === 0) {
      return formatearMinutos(minutosTotales);
    }

    const etqDias = `${diasEnteros} ${diasEnteros === 1 ? 'día' : 'días'}`;
    if (minutosRestantes === 0) {
      return etqDias;
    }

    return `${etqDias} y ${formatearMinutos(minutosRestantes)}`;
  }

  get proyectoFormateado(): string {
    const cli = (this.datos?.cliente || '').trim();
    const proy = (this.proyecto || '').trim();
    if (cli && proy && !cli.toLowerCase().includes(proy.toLowerCase())) {
      return `${cli} · ${proy}`;
    }
    return cli || proy || 'Sin proyecto asignado';
  }

  get estadoClase(): string {
    const est = (this.estado || '').toLowerCase();
    if (est.includes('aprobad') || est.includes('confirmad') || est.includes('informativ')) {
      return 'resumen-pill--ok';
    }
    if (est.includes('rechazad') || est.includes('devuelt') || est.includes('observad')) {
      return 'resumen-pill--danger';
    }
    return 'resumen-pill--pending';
  }

  descargar(adjunto?: AdjuntoPermisoApi): void {
    if ((!this.datos.idPermiso && !this.datos.tokenExterno) || this.descargando()) return;
    this.descargando.set(true);
    const solicitud = this.datos.tokenExterno
      ? this.api.descargarEvidenciaExternaBlob(this.datos.tokenExterno, adjunto?.id)
      : this.api.descargarEvidenciaBlob(this.datos.idPermiso!, adjunto?.id);
    solicitud.subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = adjunto?.nombreOriginal || this.datos.evidenciaNombre || 'respaldo';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        this.descargando.set(false);
      },
      error: () => {
        this.descargando.set(false);
        this.toast.error('No se pudo descargar', 'Intenta descargar el respaldo nuevamente.');
      },
    });
  }
}
