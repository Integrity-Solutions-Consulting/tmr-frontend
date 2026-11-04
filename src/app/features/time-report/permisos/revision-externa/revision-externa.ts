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
  readonly observacionLider = signal('');
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
      error: err => {
        this.toast.error(
          'Enlace no disponible',
          err?.error?.message || 'El enlace externo es inválido o ha expirado.',
        );
      },
    });
  }

  readonly datosFormulario = computed<DatosFormularioOficial>(() => {
    const api = this.solicitudApi();
    const aprobado = this.procesado() === 'confirmado';
    const token = this.tokenExterno();

    if (api) {
      return {
        idPermiso: api.id,
        tokenExterno: token ?? undefined,
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
        evidenciaUrl: token && api.tieneEvidencia ? this.apiService.obtenerUrlEvidenciaExterna(token) : undefined,
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
      folio: 'PER-EXT',
      diaSolicitud: '01',
      mesSolicitud: '01',
      anioSolicitud: String(new Date().getFullYear()),
      apellidosNombres: 'Colaborador',
      numeroCedula: '',
      cargo: '',
      cliente: '',
      jefeInmediato: 'Líder Externo',
      tipoPermiso: 'VACACIONES',
      motivos: '',
      fechaInicio: '',
      fechaFinalizacion: '',
      fechaRegreso: '',
      fechaAprobacion: 'Pendiente',
      diasSolicitados: '',
      horario: 'COMPLETA',
      horasSolicitadas: '',
      comentarios: this.observacionLider(),
    };
  });

  async descargarPdf(): Promise<void> {
    await this.pdfService.descargarFormularioPdf(this.datosFormulario());
  }

  confirmarExterno(): void {
    const token = this.tokenExterno();
    if (!token) {
      this.toast.error('Token no proporcionado', 'Abre este portal desde el enlace enviado a tu correo.');
      return;
    }

    this.apiService.registrarDecisionExterna(token, 'aprobar', this.observacionLider().trim()).subscribe({
      next: res => {
        if (res?.success && res.data) {
          this.solicitudApi.set(res.data);
        }
        this.procesado.set('confirmado');
        this.toast.exito(
          'Solicitud aprobada vía Magic Link',
          'Se registró la aprobación y se notificó a Talento Humano y al colaborador.',
        );
      },
      error: err => {
        this.toast.error(
          'No se pudo procesar la aprobación',
          err?.error?.message || 'El enlace puede haber expirado o ya fue utilizado.',
        );
      },
    });
  }

  rechazarExterno(): void {
    const token = this.tokenExterno();
    if (!token) {
      this.toast.error('Token no proporcionado', 'Abre este portal desde el enlace enviado a tu correo.');
      return;
    }

    const comentario = this.observacionLider().trim();
    if (!comentario) {
      this.toast.error(
        'Motivo obligatorio',
        'Por favor ingresa el motivo por el cual rechazas la solicitud (RF-007).',
      );
      return;
    }

    this.apiService.registrarDecisionExterna(token, 'rechazar', comentario).subscribe({
      next: res => {
        if (res?.success && res.data) {
          this.solicitudApi.set(res.data);
        }
        this.procesado.set('rechazado');
        this.toast.error(
          'Solicitud rechazada por Líder Externo',
          'Se notificó al colaborador y a Talento Humano.',
        );
      },
      error: err => {
        this.toast.error(
          'No se pudo procesar el rechazo',
          err?.error?.message || 'El enlace puede haber expirado o ya fue utilizado.',
        );
      },
    });
  }
}
