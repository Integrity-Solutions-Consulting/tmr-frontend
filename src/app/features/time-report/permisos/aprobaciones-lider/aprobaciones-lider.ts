import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { TarjetaResumenComponent } from '../../../../shared/components/tarjeta-resumen/tarjeta-resumen.component';
import { ModalBase } from '../../../../shared/components/modal-base/modal-base';
import { NotificacionToastService } from '../../../../shared/services/notificacion-toast.service';
import {
  DatosFormularioOficial,
  FormularioPermisoOficialComponent,
  HorarioPermisoOficial,
  TipoPermisoOficial,
} from '../formulario-permiso-oficial/formulario-permiso-oficial';
import {
  PeriodoPreset,
  calcularRangoPreset,
  coincideBusquedaInteligente,
  cumpleRangoFechas,
} from '../filtro-fechas.util';
import { PermisosPdfService } from '../permisos-pdf.service';
import { PermisoItemApi, PermisosApiService } from '../permisos-api.service';

export interface SolicitudEquipoMock {
  id?: number;
  codigo: string;
  colaborador: string;
  cedula: string;
  cargo: string;
  cliente: string;
  proyecto: string;
  liderNombre?: string;
  diaSolicitud?: string;
  mesSolicitud?: string;
  anioSolicitud?: string;
  fechaAprobacion?: string;
  tipo: string;
  tipoOficial: TipoPermisoOficial;
  motivo: string;
  fechas: string;
  fechaInicio: string;
  fechaFin: string;
  fechaRegreso: string;
  diasSolicitados: string;
  horario: HorarioPermisoOficial;
  horasSolicitadas: string;
  duracion: string;
  evidencia: string | null;
  evidenciaUrl?: string | null;
  traslapeAlerta: string | null;
  estado: 'Pendiente' | 'Aprobado' | 'Observado' | 'Rechazado';
}

@Component({
  selector: 'app-aprobaciones-lider',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HeaderComponent,
    TarjetaResumenComponent,
    ModalBase,
    FormularioPermisoOficialComponent,
  ],
  templateUrl: './aprobaciones-lider.html',
  styleUrl: './aprobaciones-lider.scss',
})
export class AprobacionesLiderComponent implements OnInit {
  private readonly toast = inject(NotificacionToastService);
  private readonly pdfService = inject(PermisosPdfService);
  private readonly permisosApi = inject(PermisosApiService);

  readonly busqueda = signal('');
  readonly periodoPreset = signal<PeriodoPreset>('TODOS');
  readonly fechaDesde = signal('');
  readonly fechaHasta = signal('');
  readonly proyectoFiltro = signal('');
  readonly estadoFiltro = signal('');
  readonly modalRevisorVisible = signal(false);
  readonly solicitudActiva = signal<SolicitudEquipoMock | null>(null);
  readonly comentarioLider = signal('');

  readonly solicitudesEquipo = signal<SolicitudEquipoMock[]>([]);

  readonly kpiPendientes = computed(
    () => this.solicitudesEquipo().filter((s) => s.estado === 'Pendiente').length,
  );
  readonly kpiAusentesHoy = signal(0);
  readonly kpiAprobados = computed(
    () => this.solicitudesEquipo().filter((s) => s.estado === 'Aprobado').length,
  );

  readonly solicitudesFiltradas = computed(() => {
    const q = this.busqueda();
    const desde = this.fechaDesde();
    const hasta = this.fechaHasta();
    const proy = this.proyectoFiltro();
    const est = this.estadoFiltro();

    return this.solicitudesEquipo().filter((s) => {
      if (!cumpleRangoFechas(s.fechaInicio, s.fechaFin, desde, hasta)) return false;
      if (proy && s.proyecto !== proy) return false;
      if (est && s.estado !== est) return false;
      if (
        !coincideBusquedaInteligente(q, [
          s.codigo,
          s.colaborador,
          s.cedula,
          s.cargo,
          s.cliente,
          s.proyecto,
          s.tipo,
          s.tipoOficial,
          s.fechas,
          s.fechaInicio,
          s.fechaFin,
          s.fechaRegreso,
          s.diasSolicitados,
          s.horasSolicitadas,
          s.duracion,
          s.horario,
          s.estado,
          s.motivo,
          s.evidencia,
          s.traslapeAlerta,
        ])
      ) {
        return false;
      }
      return true;
    });
  });

  ngOnInit(): void {
    this.permisosApi.obtenerEquipo().subscribe({
      next: (res) => {
        if (res?.success && Array.isArray(res.data)) {
          this.solicitudesEquipo.set(res.data.map((i) => this.mapearApiAMock(i)));
        }
      },
      error: (err) => {
        this.toast.error(
          'No se pudo cargar la bandeja de equipo',
          err?.error?.message || 'Verifica tus permisos o la conexión con el servidor.',
        );
      },
    });
  }

  private mapearApiAMock(item: PermisoItemApi): SolicitudEquipoMock {
    return {
      id: item.id,
      codigo: item.codigo,
      colaborador: item.colaborador,
      cedula: item.cedula,
      cargo: item.cargo,
      cliente: item.cliente,
      proyecto: item.proyecto,
      liderNombre: item.liderNombre,
      diaSolicitud: item.diaSolicitud,
      mesSolicitud: item.mesSolicitud,
      anioSolicitud: item.anioSolicitud,
      fechaAprobacion: item.fechaAprobacion,
      tipo: item.tipo,
      tipoOficial: item.tipoOficial,
      motivo: item.motivo,
      fechas: item.fechas,
      fechaInicio: item.fechaInicio,
      fechaFin: item.fechaFin,
      fechaRegreso: item.fechaRegreso,
      diasSolicitados: item.diasSolicitados,
      horario: item.horario,
      horasSolicitadas: item.horasSolicitadas,
      duracion: item.duracion,
      evidencia: item.evidenciaNombre ?? null,
      evidenciaUrl: item.tieneEvidencia ? this.permisosApi.obtenerUrlEvidencia(item.id) : null,
      traslapeAlerta: item.traslapeAlerta ?? null,
      estado: item.estadoLider,
    };
  }

  cambiarPresetPeriodo(preset: PeriodoPreset): void {
    this.periodoPreset.set(preset);
    if (preset !== 'PERSONALIZADO') {
      const rango = calcularRangoPreset(preset);
      this.fechaDesde.set(rango.desde);
      this.fechaHasta.set(rango.hasta);
    }
  }

  cambiarFechaDesde(valor: string): void {
    this.fechaDesde.set(valor);
    if (this.fechaHasta() && valor && valor > this.fechaHasta()) {
      this.fechaHasta.set(valor);
    }
    this.periodoPreset.set(!valor && !this.fechaHasta() ? 'TODOS' : 'PERSONALIZADO');
  }

  cambiarFechaHasta(valor: string): void {
    this.fechaHasta.set(valor);
    if (this.fechaDesde() && valor && valor < this.fechaDesde()) {
      this.fechaDesde.set(valor);
    }
    this.periodoPreset.set(!this.fechaDesde() && !valor ? 'TODOS' : 'PERSONALIZADO');
  }

  abrirRevision(item: SolicitudEquipoMock): void {
    this.solicitudActiva.set(item);
    this.comentarioLider.set('');
    this.modalRevisorVisible.set(true);
  }

  obtenerClaseEstado(estado: SolicitudEquipoMock['estado']): string {
    if (estado === 'Aprobado') return 'status-badge status-badge--confirmado';
    if (estado === 'Rechazado') return 'status-badge status-badge--rechazado';
    if (estado === 'Observado') return 'status-badge status-badge--observado';
    return 'status-badge status-badge--pendiente';
  }

  obtenerDatosFormulario(item: SolicitudEquipoMock): DatosFormularioOficial {
    const aprobadaPorLider = item.estado === 'Aprobado';
    return {
      idPermiso: item.id,
      folio: item.codigo,
      diaSolicitud: item.diaSolicitud || '01',
      mesSolicitud: item.mesSolicitud || '01',
      anioSolicitud: item.anioSolicitud || String(new Date().getFullYear()),
      apellidosNombres: item.colaborador,
      numeroCedula: item.cedula,
      cargo: item.cargo,
      cliente: `${item.cliente} (${item.proyecto})`,
      jefeInmediato: item.liderNombre || 'Líder de Proyecto',
      tipoPermiso: item.tipoOficial,
      motivos: item.motivo,
      evidenciaNombre: item.evidencia ?? undefined,
      evidenciaUrlDescarga: item.evidenciaUrl ?? undefined,
      fechaInicio: item.fechaInicio,
      fechaFinalizacion: item.fechaFin,
      fechaRegreso: item.fechaRegreso,
      fechaAprobacion: item.fechaAprobacion || 'Pendiente',
      diasSolicitados: item.diasSolicitados,
      horario: item.horario,
      horasSolicitadas: item.horasSolicitadas,
      aprobacionLider: {
        aprobado: aprobadaPorLider,
        responsable: item.liderNombre || 'Líder de Proyecto',
        metodo: 'Cuenta TMR Líder',
        fecha: aprobadaPorLider ? item.fechaAprobacion : undefined,
      },
      aprobacionTalentoHumano: {
        aprobado: false,
        responsable: 'Talento Humano ISC',
      },
      comentarios: this.comentarioLider(),
    };
  }

  async descargarPdf(item: SolicitudEquipoMock): Promise<void> {
    await this.pdfService.descargarFormularioPdf(this.obtenerDatosFormulario(item));
    this.toast.exito(
      `PDF ${item.codigo} descargado`,
      'Se descargó el documento oficial PDF de la solicitud.',
    );
  }

  simularDecisionLider(accion: 'aprobar' | 'observar' | 'rechazar'): void {
    const actual = this.solicitudActiva();
    if (!actual || !actual.id) return;

    const comentario = this.comentarioLider().trim();
    if ((accion === 'observar' || accion === 'rechazar') && !comentario) {
      this.toast.error(
        'Comentario obligatorio',
        'Debes indicar el motivo para observar o rechazar la solicitud (RF-007).',
      );
      return;
    }

    this.permisosApi.registrarDecisionLider(actual.id, accion, comentario).subscribe({
      next: (res) => {
        if (res?.success && res.data) {
          const actualizada = this.mapearApiAMock(res.data);
          this.solicitudesEquipo.update((lista) =>
            lista.map((s) => (s.id === actual.id ? actualizada : s)),
          );
        }
        this.modalRevisorVisible.set(false);

        if (accion === 'aprobar') {
          this.toast.exito(
            `Solicitud ${actual.codigo} aprobada`,
            'La solicitud pasó a validación de Talento Humano y se notificó al colaborador.',
          );
          return;
        }

        if (accion === 'observar') {
          this.toast.exito(
            `Solicitud ${actual.codigo} observada`,
            'El colaborador recibió una notificación para subsanar su solicitud.',
          );
          return;
        }

        this.toast.error(
          `Solicitud ${actual.codigo} rechazada`,
          'Se registró el motivo de rechazo y se notificó al colaborador.',
        );
      },
      error: (err) => {
        this.toast.error(
          'No se pudo registrar la decisión',
          err?.error?.message || 'Error al comunicarse con el servidor.',
        );
      },
    });
  }
}
