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
  readonly comentarioLider = signal(
    'Aprobado. Las tareas del sprint quedan cubiertas por el equipo.',
  );

  readonly solicitudesEquipo = signal<SolicitudEquipoMock[]>([
    {
      id: 106,
      codigo: 'PER-2026-006',
      colaborador: 'Flores Jonathan',
      cedula: '1719283746',
      cargo: 'Desarrollador Fullstack',
      cliente: 'Integrity Solutions',
      proyecto: 'Portal Web ISC',
      liderNombre: 'Ing. Carlos Méndez',
      tipo: 'Vacaciones',
      tipoOficial: 'VACACIONES',
      motivo: 'Vacaciones anuales programadas con el equipo de desarrollo.',
      fechas: '04/11/2026 - 06/11/2026',
      fechaInicio: '04/11/2026',
      fechaFin: '06/11/2026',
      fechaRegreso: '09/11/2026',
      diasSolicitados: '3 días laborables',
      horario: 'COMPLETA',
      horasSolicitadas: '24 horas',
      duracion: '3 días laborables (24 h)',
      evidencia: null,
      traslapeAlerta:
        'Coincide el 05/11 con ausencia aprobada de Silvia Pazmiño en Portal Web ISC',
      estado: 'Pendiente',
    },
    {
      id: 107,
      codigo: 'PER-2026-007',
      colaborador: 'Paredes Harold',
      cedula: '1720918273',
      cargo: 'Desarrollador Backend',
      cliente: 'Integrity Solutions',
      proyecto: 'Migración Microservicios',
      liderNombre: 'Ing. Carlos Méndez',
      tipo: 'Fallecimiento de un familiar',
      tipoOficial: 'FALLECIMIENTO_FAMILIAR',
      motivo: 'Licencia por fallecimiento de familiar cercano.',
      fechas: '30/10/2026 - 31/10/2026',
      fechaInicio: '30/10/2026',
      fechaFin: '31/10/2026',
      fechaRegreso: '04/11/2026',
      diasSolicitados: '2 días laborables',
      horario: 'COMPLETA',
      horasSolicitadas: '16 horas',
      duracion: '2 días laborables (16 h)',
      evidencia: 'justificante_calamidad.pdf',
      traslapeAlerta: null,
      estado: 'Pendiente',
    },
    {
      id: 104,
      codigo: 'PER-2026-004',
      colaborador: 'Erazo Allan',
      cedula: '1723456789',
      cargo: 'Desarrollador Fullstack',
      cliente: 'Integrity Solutions',
      proyecto: 'Portal Web ISC',
      liderNombre: 'Ing. Carlos Méndez',
      tipo: 'Licencia por enfermedad',
      tipoOficial: 'LICENCIA_ENFERMEDAD',
      motivo: 'Cita odontológica e indicación de reposo médico por 48 horas.',
      fechas: '02/11/2026 - 03/11/2026',
      fechaInicio: '02/11/2026',
      fechaFin: '03/11/2026',
      fechaRegreso: '04/11/2026',
      diasSolicitados: '2 días laborables',
      horario: 'COMPLETA',
      horasSolicitadas: '16 horas',
      duracion: '2 días laborables (16 h)',
      evidencia: 'certificado_iess.pdf',
      traslapeAlerta: null,
      estado: 'Aprobado',
    },
    {
      id: 103,
      codigo: 'PER-2026-003',
      colaborador: 'Vera Cristopher',
      cedula: '0928374651',
      cargo: 'Desarrollador Fullstack',
      cliente: 'Banco Guayaquil',
      proyecto: 'Migración Microservicios',
      liderNombre: 'Ing. Carlos Méndez',
      tipo: 'Otros',
      tipoOficial: 'OTROS',
      motivo: 'Permiso personal en semana de salida a producción.',
      fechas: '20/10/2026 - 22/10/2026',
      fechaInicio: '20/10/2026',
      fechaFin: '22/10/2026',
      fechaRegreso: '23/10/2026',
      diasSolicitados: '3 días laborables',
      horario: 'COMPLETA',
      horasSolicitadas: '24 horas',
      duracion: '3 días laborables (24 h)',
      evidencia: null,
      traslapeAlerta: null,
      estado: 'Rechazado',
    },
  ]);

  readonly kpiPendientes = computed(
    () => this.solicitudesEquipo().filter((s) => s.estado === 'Pendiente').length,
  );
  readonly kpiAusentesHoy = signal(1);
  readonly kpiAprobados = computed(
    () => this.solicitudesEquipo().filter((s) => s.estado === 'Aprobado').length + 13,
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
        if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
          this.solicitudesEquipo.set(res.data.map((i) => this.mapearApiAMock(i)));
        }
      },
      error: () => {
        // Mantiene lista inicial
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
      diaSolicitud: '30',
      mesSolicitud: '10',
      anioSolicitud: '2026',
      apellidosNombres: item.colaborador,
      numeroCedula: item.cedula,
      cargo: item.cargo,
      cliente: `${item.cliente} (${item.proyecto})`,
      jefeInmediato: item.liderNombre || 'Ing. Carlos Méndez',
      tipoPermiso: item.tipoOficial,
      motivos: item.motivo,
      evidenciaNombre: item.evidencia ?? undefined,
      evidenciaUrlDescarga: item.evidenciaUrl ?? undefined,
      fechaInicio: item.fechaInicio,
      fechaFinalizacion: item.fechaFin,
      fechaRegreso: item.fechaRegreso,
      fechaAprobacion: aprobadaPorLider ? '30/10/2026' : 'Pendiente',
      diasSolicitados: item.diasSolicitados,
      horario: item.horario,
      horasSolicitadas: item.horasSolicitadas,
      aprobacionLider: {
        aprobado: aprobadaPorLider,
        responsable: item.liderNombre || 'Ing. Carlos Méndez',
        metodo: 'Cuenta TMR Líder',
        fecha: aprobadaPorLider ? '30/10/2026' : undefined,
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
    if (!actual) return;

    const nuevoEstado: SolicitudEquipoMock['estado'] =
      accion === 'aprobar' ? 'Aprobado' : accion === 'observar' ? 'Observado' : 'Rechazado';

    if (actual.id) {
      this.permisosApi.registrarDecisionLider(actual.id, accion, this.comentarioLider()).subscribe({
        next: () => {},
        error: () => {},
      });
    }

    this.solicitudesEquipo.update((lista) =>
      lista.map((s) => (s.codigo === actual.codigo ? { ...s, estado: nuevoEstado } : s)),
    );
    this.modalRevisorVisible.set(false);

    if (accion === 'aprobar') {
      this.toast.exito(
        `Solicitud ${actual.codigo} aprobada`,
        'Se actualizó el documento PDF oficial y Apprise envió correos personalizados a Talento Humano y al colaborador.',
      );
      return;
    }

    if (accion === 'observar') {
      this.toast.exito(
        `Solicitud ${actual.codigo} observada`,
        'El colaborador recibió un aviso vía Apprise para subsanar la solicitud.',
      );
      return;
    }

    this.toast.error(
      `Solicitud ${actual.codigo} rechazada`,
      'Se registró el motivo de rechazo y se notificó al colaborador y a RRHH por Apprise.',
    );
  }
}
