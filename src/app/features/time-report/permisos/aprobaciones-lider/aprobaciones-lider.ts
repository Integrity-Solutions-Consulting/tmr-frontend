import { conectarEnlaceSolicitud } from '../solicitud-enlace.util';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { TarjetaResumenComponent } from '../../../../shared/components/tarjeta-resumen/tarjeta-resumen.component';
import { ModalBase } from '../../../../shared/components/modal-base/modal-base';
import { NotificacionToastService } from '../../../../shared/services/notificacion-toast.service';
import {
  DatosFormularioOficial,  HorarioPermisoOficial,
  TipoPermisoOficial,
} from '../formulario-permiso-oficial/formulario-permiso-oficial';
import {
  PeriodoPreset,
  calcularRangoPreset,
  coincideBusquedaInteligente,
  cumpleRangoFechas,
} from '../filtro-fechas.util';
import { PermisosPdfService } from '../permisos-pdf.service';
import { ResumenSolicitudComponent } from '../resumen-solicitud/resumen-solicitud';
import {
  AdjuntoPermisoApi,
  PermisoItemApi,
  PermisosApiService,
  obtenerMensajeAmigablePermisos,
} from '../permisos-api.service';

export interface SolicitudEquipo {
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
  adjuntos?: AdjuntoPermisoApi[];
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
    ModalBase,    ResumenSolicitudComponent,
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
  readonly solicitudActiva = signal<SolicitudEquipo | null>(null);
  readonly comentarioLider = signal('');
  readonly verDetalle = signal(false);
  readonly descargandoRespaldo = signal(false);
  readonly procesandoDecision = signal(false);

  readonly solicitudesEquipo = signal<SolicitudEquipo[]>([]);

  readonly kpiPendientes = computed(
    () => this.solicitudesEquipo().filter((s) => s.estado === 'Pendiente').length,
  );
  readonly kpiAusentesHoy = computed(() => { const hoy = new Date().toISOString().slice(0, 10); return this.solicitudesEquipo().filter((s) => s.estado === 'Aprobado' && cumpleRangoFechas(s.fechaInicio, s.fechaFin, hoy, hoy)).length; }); readonly proyectosDisponibles = computed(() => Array.from(new Set(this.solicitudesEquipo().map((s) => s.proyecto).filter(Boolean))).sort());
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
      if (est === 'proceso' && s.estado !== 'Pendiente') return false;
      if (est === 'finalizado' && s.estado === 'Pendiente') return false;
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

  constructor() {
    conectarEnlaceSolicitud(item => { this.abrirRevision(this.mapearDesdeApi(item)); });
  }

  ngOnInit(): void {
    this.permisosApi.obtenerEquipo().subscribe({
      next: (res) => {
        if (res?.success && Array.isArray(res.data)) {
          this.solicitudesEquipo.set(res.data.map((i) => this.mapearDesdeApi(i)));
        }
      },
      error: (err) => {
        this.toast.error(
          'No se pudo cargar la bandeja de equipo',
          obtenerMensajeAmigablePermisos(
            err,
            'No pudimos cargar las solicitudes de tu equipo en este momento.',
          ),
        );
      },
    });
  }

  private mapearDesdeApi(item: PermisoItemApi): SolicitudEquipo {
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
      adjuntos: item.adjuntos ?? [],
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

  aprobarDesdeTabla(item: SolicitudEquipo): void {
    if (this.procesandoDecision() || item.estado !== 'Pendiente') return;
    this.solicitudActiva.set(item);
    this.comentarioLider.set('');
    this.registrarDecisionLider('aprobar');
  }

  abrirRevision(item: SolicitudEquipo): void {
    this.verDetalle.set(false);
    this.solicitudActiva.set(item);
    this.comentarioLider.set('');
    this.modalRevisorVisible.set(true);
  }

  obtenerClaseEstado(estado: SolicitudEquipo['estado']): string {
    if (estado === 'Aprobado') return 'status-badge status-badge--confirmado';
    if (estado === 'Rechazado') return 'status-badge status-badge--rechazado';
    if (estado === 'Observado') return 'status-badge status-badge--observado';
    return 'status-badge status-badge--pendiente';
  }

  obtenerDatosFormulario(item: SolicitudEquipo): DatosFormularioOficial {
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

  async descargarPdf(item: SolicitudEquipo): Promise<void> {
    await this.pdfService.descargarFormularioPdf(this.obtenerDatosFormulario(item));
    this.toast.exito(
      `PDF ${item.codigo} descargado`,
      'Se descargó el documento oficial PDF de la solicitud.',
    );
  }


  descargarRespaldo(item: SolicitudEquipo, adjunto?: AdjuntoPermisoApi): void {
    if (!item.id || this.descargandoRespaldo()) return;
    this.descargandoRespaldo.set(true);
    this.permisosApi.descargarEvidenciaBlob(item.id, adjunto?.id).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = adjunto?.nombreOriginal || item.evidencia || 'respaldo';
        enlace.click();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        this.descargandoRespaldo.set(false);
      },
      error: () => {
        this.descargandoRespaldo.set(false);
        this.toast.error('No se pudo descargar', 'Intenta descargar el respaldo nuevamente.');
      }
    });
  }

  registrarDecisionLider(accion: 'aprobar' | 'observar' | 'rechazar'): void {
    const actual = this.solicitudActiva();
    if (!actual || !actual.id || this.procesandoDecision()) return;

    const comentario = this.comentarioLider().trim();
    if ((accion === 'observar' || accion === 'rechazar') && !comentario) {
      this.toast.warning(
        'Motivo necesario',
        'Por favor indica el motivo en los comentarios para continuar.',
      );
      return;
    }

    this.procesandoDecision.set(true);
    this.permisosApi.registrarDecisionLider(actual.id, accion, comentario).subscribe({
      next: (res) => {
        this.procesandoDecision.set(false);
        if (res?.success && res.data) {
          const actualizada = this.mapearDesdeApi(res.data);
          this.solicitudesEquipo.update((lista) =>
            lista.map((s) => (s.id === actual.id ? actualizada : s)),
          );
        }
        this.modalRevisorVisible.set(false);

        if (res?.data?.avisoNotificacion) {
          this.toast.warning(`Decisión guardada (${actual.codigo})`, res.data.avisoNotificacion);
          return;
        }

        if (accion === 'aprobar') {
          this.toast.exito(
            `Solicitud ${actual.codigo} aprobada`,
            'La solicitud pasó a validación de Talento Humano y ya avisamos al colaborador.',
          );
          return;
        }

        if (accion === 'observar') {
          this.toast.warning(
            `Solicitud ${actual.codigo} con observación`,
            'El colaborador recibió tu comentario para subsanar la solicitud.',
          );
          return;
        }

        this.toast.info(
          `Solicitud ${actual.codigo} rechazada`,
          'Registramos tu decisión. Los avisos quedaron pendientes de envío.',
        );
      },
      error: (err) => {
        this.procesandoDecision.set(false);
        this.toast.error(
          'No pudimos guardar tu decisión',
          obtenerMensajeAmigablePermisos(
            err,
            'No pudimos guardar tu decisión en este momento. Inténtalo nuevamente.',
          ),
        );
      },
    });
  }
}
