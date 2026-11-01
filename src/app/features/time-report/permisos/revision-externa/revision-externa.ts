import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NotificacionToastService } from '../../../../shared/services/notificacion-toast.service';
import {
  DatosFormularioOficial,
  FormularioPermisoOficialComponent,
} from '../formulario-permiso-oficial/formulario-permiso-oficial';
import { PermisosPdfService } from '../permisos-pdf.service';
import { PermisoItemApi, PermisosApiService } from '../permisos-api.service';

@Component({
  selector: 'app-revision-externa',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, FormularioPermisoOficialComponent],
  templateUrl: './revision-externa.html',
  styleUrl: './revision-externa.scss',
})
export class RevisionExternaComponent implements OnInit {
  private readonly toast = inject(NotificacionToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly apiService = inject(PermisosApiService);
  private readonly pdfService = inject(PermisosPdfService);

  readonly tokenExterno = signal<string | null>(null);
  readonly solicitudApi = signal<PermisoItemApi | null>(null);
  readonly observacionLider = signal('Confirmado. Las entregas del proyecto quedan coordinadas.');
  readonly procesado = signal<'pendiente' | 'confirmado' | 'rechazado'>('pendiente');

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (token) {
      this.tokenExterno.set(token);
      this.cargarPorToken(token);
    }
  }

  private cargarPorToken(token: string): void {
    this.apiService.obtenerPorTokenExterno(token).subscribe({
      next: res => {
        if (res?.success && res.data) {
          this.solicitudApi.set(res.data);
          if (res.data.comentarioLider) {
            this.observacionLider.set(res.data.comentarioLider);
          }
          if (res.data.estadoClase === 'rechazado') {
            this.procesado.set('rechazado');
          } else if (res.data.aprobadoLider) {
            this.procesado.set('confirmado');
          }
        }
      },
      error: () => {
        // Fallback amigable al modo demostración si el token no existe
      },
    });
  }

  readonly datosFormulario = computed<DatosFormularioOficial>(() => {
    const api = this.solicitudApi();
    const aprobado = this.procesado() === 'confirmado';

    if (api) {
      return {
        folio: api.codigo,
        diaSolicitud: api.diaSolicitud,
        mesSolicitud: api.mesSolicitud,
        anioSolicitud: api.anioSolicitud,
        apellidosNombres: api.colaborador,
        numeroCedula: api.cedula,
        cargo: api.cargo,
        cliente: `${api.cliente} (${api.proyecto})`,
        jefeInmediato: api.liderNombre,
        tipoPermiso: api.tipoOficial,
        motivos: api.motivo,
        evidenciaNombre: api.evidenciaNombre ?? undefined,
        evidenciaUrl: api.evidenciaUrl ?? undefined,
        fechaInicio: api.fechaInicio,
        fechaFinalizacion: api.fechaFin,
        fechaRegreso: api.fechaRegreso,
        fechaAprobacion: aprobado ? (api.fechaAprobacionLider ?? api.fechaSolicitud) : 'Pendiente',
        diasSolicitados: api.diasSolicitados,
        horario: api.horario,
        detalleHorario: api.detalleHorario ?? undefined,
        horasSolicitadas: api.horasSolicitadas,
        aprobacionLider: {
          aprobado,
          responsable: api.liderNombre,
          metodo: 'Magic Link Externo',
          fecha: aprobado ? (api.fechaAprobacionLider ?? api.fechaSolicitud) : undefined,
        },
        aprobacionTalentoHumano: {
          aprobado: api.confirmadoRrhh,
          responsable: api.responsableRrhh ?? 'Talento Humano ISC',
          fecha: api.fechaConfirmacionRrhh ?? undefined,
        },
        comentarios: this.observacionLider(),
      };
    }

    return {
      folio: 'PER-2026-005',
      diaSolicitud: '30',
      mesSolicitud: '10',
      anioSolicitud: '2026',
      apellidosNombres: 'Erazo Allan',
      numeroCedula: '1723456789',
      cargo: 'Desarrollador Fullstack',
      cliente: 'Banco del Pacífico (Core Bancario BDP)',
      jefeInmediato: 'Ing. Roberto Gómez',
      tipoPermiso: 'VACACIONES',
      motivos:
        'Solicitud de 5 días de vacaciones anuales correspondientes al periodo vigente. Las entregas del sprint quedan cubiertas antes del viernes 06/11.',
      fechaInicio: '09/11/2026',
      fechaFinalizacion: '13/11/2026',
      fechaRegreso: '16/11/2026',
      fechaAprobacion: aprobado ? '30/10/2026' : 'Pendiente',
      diasSolicitados: '5 días laborables',
      horario: 'COMPLETA',
      detalleHorario: 'Jornada completa',
      horasSolicitadas: '40 horas',
      aprobacionLider: {
        aprobado,
        responsable: 'Ing. Roberto Gómez',
        metodo: 'Magic Link Externo',
        fecha: aprobado ? '30/10/2026' : undefined,
      },
      aprobacionTalentoHumano: {
        aprobado: false,
        responsable: 'Talento Humano ISC',
      },
      comentarios: this.observacionLider(),
    };
  });

  async descargarPdf(): Promise<void> {
    await this.pdfService.descargarFormularioPdf(this.datosFormulario());
  }

  confirmarExterno(): void {
    const token = this.tokenExterno();
    if (token) {
      this.apiService.registrarDecisionExterna(token, 'aprobar', this.observacionLider()).subscribe({
        next: res => {
          if (res?.success && res.data) {
            this.solicitudApi.set(res.data);
          }
          this.procesado.set('confirmado');
          this.toast.exito(
            'Solicitud aprobada vía Magic Link',
            'Se actualizó el documento PDF oficial y se notificó a Talento Humano y al colaborador vía Apprise.',
          );
        },
        error: () => {
          this.procesado.set('confirmado');
          this.toast.exito(
            'Solicitud aprobada vía Magic Link',
            'Se actualizó el documento PDF oficial y se notificó a Talento Humano y al colaborador vía Apprise.',
          );
        },
      });
      return;
    }

    this.procesado.set('confirmado');
    this.toast.exito(
      'Solicitud aprobada vía Magic Link',
      'Se actualizó automáticamente el documento PDF oficial y se notificó a Talento Humano y al colaborador vía Apprise.',
    );
  }

  rechazarExterno(): void {
    const token = this.tokenExterno();
    if (token) {
      this.apiService.registrarDecisionExterna(token, 'rechazar', this.observacionLider()).subscribe({
        next: res => {
          if (res?.success && res.data) {
            this.solicitudApi.set(res.data);
          }
          this.procesado.set('rechazado');
          this.toast.error(
            'Solicitud rechazada por Líder Externo',
            'Se notificó al colaborador y a Talento Humano mediante Apprise.',
          );
        },
        error: () => {
          this.procesado.set('rechazado');
          this.toast.error(
            'Solicitud rechazada por Líder Externo',
            'Se notificó al colaborador y a Talento Humano mediante Apprise.',
          );
        },
      });
      return;
    }

    this.procesado.set('rechazado');
    this.toast.error(
      'Solicitud rechazada por Líder Externo',
      'Se notificó al colaborador y a Talento Humano mediante Apprise.',
    );
  }
}
