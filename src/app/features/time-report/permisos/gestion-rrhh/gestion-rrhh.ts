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
  calcularRangoPreset,
  coincideBusquedaInteligente,
  cumpleRangoFechas,
  PeriodoPreset,
} from '../filtro-fechas.util';
import { PermisosPdfService } from '../permisos-pdf.service';
import {
  PermisoItemApi,
  PermisosApiService,
  obtenerMensajeAmigablePermisos,
} from '../permisos-api.service';

export interface SolicitudRrhh {
  id: number;
  folio: string;
  diaSolicitud?: string;
  mesSolicitud?: string;
  anioSolicitud?: string;
  colaborador: string;
  cedula: string;
  codigoColaborador: string;
  cargo: string;
  area: string;
  cliente: string;
  proyecto?: string;
  tipo: string;
  tipoOficial: TipoPermisoOficial;
  periodo: string;
  fechaInicio: string;
  fechaFin: string;
  fechaRegreso: string;
  diasSolicitados: string;
  horario: HorarioPermisoOficial;
  detalleHorario?: string;
  duracion: string;
  horasEquivalentes: number;
  liderNombre: string;
  liderTipo: 'Interno' | 'Externo';
  liderEmpresa?: string;
  liderCorreo?: string;
  metodoConfirmacionLider: string;
  fechaConfirmacionLider: string;
  comentarioLider: string;
  motivo: string;
  evidencia?: string;
  evidenciaUrl?: string;
  goceSueldo: string;
  impactoTimeReport: 'RESTA_META' | 'SUMA_REPORTADAS' | 'SIN_IMPACTO';
  aprobadoLider: boolean;
  confirmadoRrhh: boolean;
  estado: 'CONFIRMADO_LIDER' | 'PENDIENTE_LIDER_EXT' | 'APROBADO_RRHH' | 'OBSERVADO_RRHH' | 'RECHAZADO';
  estadoClase: 'confirmado' | 'pendiente' | 'rrhh' | 'observado' | 'rechazado';
  estadoTexto: string;
  fechaConfirmacionRrhh?: string;
  responsableRrhh?: string;
}

@Component({
  selector: 'app-gestion-rrhh',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HeaderComponent,
    TarjetaResumenComponent,
    ModalBase,
    FormularioPermisoOficialComponent,
  ],
  templateUrl: './gestion-rrhh.html',
  styleUrl: './gestion-rrhh.scss',
})
export class GestionRrhhComponent implements OnInit {
  private readonly toast = inject(NotificacionToastService);
  private readonly pdfService = inject(PermisosPdfService);
  private readonly apiService = inject(PermisosApiService);

  readonly tabActiva = signal<'POR_CONFIRMAR' | 'LIDER_EXTERNO' | 'HISTORIAL'>('POR_CONFIRMAR');
  readonly busqueda = signal('');
  readonly periodoPreset = signal<PeriodoPreset>('TODOS');
  readonly fechaDesde = signal('');
  readonly fechaHasta = signal('');
  readonly filtroTipo = signal('TODOS');

  readonly modalValidacionAbierto = signal(false);
  readonly modalFormularioAbierto = signal(false);
  readonly solicitudActiva = signal<SolicitudRrhh | null>(null);
  readonly procesandoAccion = signal(false);

  readonly observacionesRrhh = signal('');
  readonly impactoSeleccionado = signal<'RESTA_META' | 'SUMA_REPORTADAS' | 'SIN_IMPACTO'>('RESTA_META');

  readonly solicitudes = signal<SolicitudRrhh[]>([]);

  ngOnInit(): void {
    this.cargarBandejaDesdeApi();
  }

  cargarBandejaDesdeApi(): void {
    this.apiService.obtenerBandejaRrhh().subscribe({
      next: (res) => {
        if (res?.success && Array.isArray(res.data)) {
          this.solicitudes.set(res.data.map((item) => this.mapearDesdeApi(item)));
        }
      },
      error: (err) => {
        this.toast.error(
          'No se pudo cargar la bandeja de Talento Humano',
          obtenerMensajeAmigablePermisos(
            err,
            'No pudimos consultar las solicitudes en este momento.',
          ),
        );
      },
    });
  }

  private mapearDesdeApi(item: PermisoItemApi): SolicitudRrhh {
    return {
      id: item.id,
      folio: item.codigo,
      diaSolicitud: item.diaSolicitud,
      mesSolicitud: item.mesSolicitud,
      anioSolicitud: item.anioSolicitud,
      colaborador: item.colaborador,
      cedula: item.cedula,
      codigoColaborador: item.codigoColaborador,
      cargo: item.cargo,
      area: item.area,
      cliente: item.cliente,
      proyecto: item.proyecto,
      tipo: item.tipo,
      tipoOficial: item.tipoOficial,
      periodo: item.fechas,
      fechaInicio: item.fechaInicio,
      fechaFin: item.fechaFin,
      fechaRegreso: item.fechaRegreso,
      diasSolicitados: item.diasSolicitados,
      horario: item.horario,
      detalleHorario: item.detalleHorario ?? undefined,
      duracion: item.duracion,
      horasEquivalentes: item.totalHoras,
      liderNombre: item.liderNombre,
      liderTipo: item.liderTipo === 'EXT' ? 'Externo' : 'Interno',
      liderEmpresa: item.liderEmpresa ?? item.cliente,
      liderCorreo: item.liderCorreo ?? undefined,
      metodoConfirmacionLider: item.metodoLider,
      fechaConfirmacionLider: item.fechaAprobacionLider ?? 'Pendiente',
      comentarioLider: item.comentarioLider ?? '',
      motivo: item.motivo,
      evidencia: item.evidenciaNombre ?? undefined,
      evidenciaUrl: item.tieneEvidencia ? this.apiService.obtenerUrlEvidencia(item.id) : undefined,
      goceSueldo: item.tipoOficial === 'VACACIONES' ? 'Con goce de sueldo (Vacaciones)' : 'Con goce de sueldo',
      impactoTimeReport: item.impactoTimeReport ?? 'RESTA_META',
      aprobadoLider: item.aprobadoLider,
      confirmadoRrhh: item.confirmadoRrhh,
      estado: item.estadoRrhh,
      estadoClase: item.estadoClase,
      estadoTexto: item.estadoTexto,
      fechaConfirmacionRrhh: item.fechaConfirmacionRrhh ?? undefined,
      responsableRrhh: item.responsableRrhh ?? undefined,
    };
  }

  readonly totalPorConfirmar = computed(
    () => this.solicitudes().filter((s) => s.estado === 'CONFIRMADO_LIDER').length,
  );

  readonly totalPendientesExternos = computed(
    () => this.solicitudes().filter((s) => s.estado === 'PENDIENTE_LIDER_EXT').length,
  );

  readonly totalConfirmadasMes = computed(
    () => this.solicitudes().filter((s) => s.estado === 'APROBADO_RRHH').length,
  );

  readonly solicitudesFiltradas = computed(() => {
    const tab = this.tabActiva();
    const q = this.busqueda();
    const desde = this.fechaDesde();
    const hasta = this.fechaHasta();
    const tipo = this.filtroTipo();

    return this.solicitudes().filter((s) => {
      if (!cumpleRangoFechas(s.fechaInicio, s.fechaFin, desde, hasta)) return false;
      if (tab === 'POR_CONFIRMAR' && s.estado !== 'CONFIRMADO_LIDER') return false;
      if (tab === 'LIDER_EXTERNO' && s.estado !== 'PENDIENTE_LIDER_EXT') return false;
      if (tab === 'HISTORIAL' && (s.estado === 'CONFIRMADO_LIDER' || s.estado === 'PENDIENTE_LIDER_EXT'))
        return false;
      if (tipo !== 'TODOS' && !s.tipo.toLowerCase().includes(tipo.toLowerCase())) return false;
      if (
        !coincideBusquedaInteligente(q, [
          s.folio,
          s.colaborador,
          s.cedula,
          s.codigoColaborador,
          s.cargo,
          s.area,
          s.cliente,
          s.proyecto,
          s.tipo,
          s.periodo,
          s.fechaInicio,
          s.fechaFin,
          s.duracion,
          s.diasSolicitados,
          `${s.horasEquivalentes} h`,
          `${s.horasEquivalentes} horas`,
          s.liderNombre,
          s.liderTipo,
          s.motivo,
          s.estadoTexto,
          s.evidencia,
        ])
      ) {
        return false;
      }
      return true;
    });
  });

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

  abrirModalValidacion(item: SolicitudRrhh): void {
    this.solicitudActiva.set(item);
    this.impactoSeleccionado.set(item.impactoTimeReport);
    this.observacionesRrhh.set('');
    this.modalValidacionAbierto.set(true);
  }

  abrirVistaFormulario(item: SolicitudRrhh): void {
    this.solicitudActiva.set(item);
    this.modalFormularioAbierto.set(true);
  }

  async descargarPdf(item: SolicitudRrhh): Promise<void> {
    await this.pdfService.descargarFormularioPdf(this.obtenerDatosFormulario(item));
  }

  obtenerDatosFormulario(sol: SolicitudRrhh): DatosFormularioOficial {
    return {
      idPermiso: sol.id,
      folio: sol.folio,
      diaSolicitud: sol.diaSolicitud || sol.fechaInicio.slice(0, 2) || '01',
      mesSolicitud: sol.mesSolicitud || sol.fechaInicio.slice(3, 5) || '01',
      anioSolicitud: sol.anioSolicitud || sol.fechaInicio.slice(6, 10) || String(new Date().getFullYear()),
      apellidosNombres: sol.colaborador,
      numeroCedula: sol.cedula,
      cargo: sol.cargo,
      cliente: sol.proyecto ? `${sol.cliente} (${sol.proyecto})` : sol.cliente,
      jefeInmediato: sol.liderNombre,
      tipoPermiso: sol.tipoOficial,
      motivos: sol.motivo,
      evidenciaNombre: sol.evidencia,
      evidenciaUrl: sol.evidenciaUrl,
      evidenciaUrlDescarga: sol.evidenciaUrl,
      fechaInicio: sol.fechaInicio,
      fechaFinalizacion: sol.fechaFin,
      fechaRegreso: sol.fechaRegreso,
      fechaAprobacion: sol.fechaConfirmacionRrhh ?? sol.fechaConfirmacionLider,
      diasSolicitados: sol.diasSolicitados,
      horario: sol.horario,
      detalleHorario: sol.detalleHorario,
      horasSolicitadas: `${sol.horasEquivalentes} horas`,
      aprobacionLider: {
        aprobado: sol.aprobadoLider,
        responsable: sol.liderNombre,
        metodo: sol.metodoConfirmacionLider,
        fecha: sol.fechaConfirmacionLider,
      },
      aprobacionTalentoHumano: {
        aprobado: sol.confirmadoRrhh,
        responsable: sol.responsableRrhh ?? 'Talento Humano ISC',
        fecha: sol.fechaConfirmacionRrhh,
      },
      comentarios: sol.comentarioLider
        ? `${sol.comentarioLider}${sol.confirmadoRrhh ? ' · Confirmado por Talento Humano.' : ''}`
        : undefined,
    };
  }

  reenviarEnlaceExterno(item: SolicitudRrhh): void {
    this.apiService.reenviarEnlaceExterno(item.id).subscribe({
      next: (res) => {
        if (res?.data?.avisoNotificacion) {
          this.toast.warning('Enlace renovado', res.data.avisoNotificacion);
          return;
        }
        this.toast.exito(
          'Enlace de revisión reenviado',
          `Enviamos un nuevo correo de aprobación a ${item.liderCorreo || item.liderNombre}.`,
        );
      },
      error: (err) => {
        this.toast.error(
          'No pudimos reenviar el enlace',
          obtenerMensajeAmigablePermisos(
            err,
            'Revisa que el líder externo tenga su correo electrónico registrado.',
          ),
        );
      },
    });
  }

  confirmarDefinitivamenteRrhh(): void {
    const actual = this.solicitudActiva();
    if (!actual || this.procesandoAccion()) return;

    this.procesandoAccion.set(true);
    this.apiService
      .registrarDecisionRrhh(
        actual.id,
        'confirmar',
        this.impactoSeleccionado(),
        this.observacionesRrhh().trim(),
      )
      .subscribe({
        next: (res) => {
          this.procesandoAccion.set(false);
          if (res?.success && res.data) {
            const mapeada = this.mapearDesdeApi(res.data);
            this.solicitudes.update((lista) => lista.map((s) => (s.id === actual.id ? mapeada : s)));
          }
          this.modalValidacionAbierto.set(false);
          if (res?.data?.avisoNotificacion) {
            this.toast.warning(`Solicitud ${actual.folio} confirmada`, res.data.avisoNotificacion);
            return;
          }
          this.toast.exito(
            'Solicitud confirmada por Talento Humano',
            `La solicitud ${actual.folio} quedó validada definitivamente y avisamos al colaborador.`,
          );
        },
        error: (err) => {
          this.procesandoAccion.set(false);
          this.toast.error(
            'No pudimos confirmar la solicitud',
            obtenerMensajeAmigablePermisos(
              err,
              'No pudimos guardar la validación en este momento. Inténtalo nuevamente.',
            ),
          );
        },
      });
  }

  devolverConObservacion(): void {
    const actual = this.solicitudActiva();
    if (!actual || this.procesandoAccion()) return;

    const obs = this.observacionesRrhh().trim();
    if (!obs) {
      this.toast.warning(
        'Observación necesaria',
        'Por favor detalla la observación para que el colaborador pueda subsanar su solicitud.',
      );
      return;
    }

    this.procesandoAccion.set(true);
    this.apiService
      .registrarDecisionRrhh(
        actual.id,
        'devolver',
        this.impactoSeleccionado(),
        obs,
      )
      .subscribe({
        next: (res) => {
          this.procesandoAccion.set(false);
          if (res?.success && res.data) {
            const mapeada = this.mapearDesdeApi(res.data);
            this.solicitudes.update((lista) => lista.map((s) => (s.id === actual.id ? mapeada : s)));
          }
          this.modalValidacionAbierto.set(false);
          if (res?.data?.avisoNotificacion) {
            this.toast.warning(`Observación guardada (${actual.folio})`, res.data.avisoNotificacion);
            return;
          }
          this.toast.warning(
            'Solicitud devuelta con observaciones',
            `Avisamos a ${actual.colaborador} sobre la observación de Talento Humano.`,
          );
        },
        error: (err) => {
          this.procesandoAccion.set(false);
          this.toast.error(
            'No pudimos devolver la solicitud',
            obtenerMensajeAmigablePermisos(
              err,
              'No pudimos guardar la observación en este momento. Inténtalo nuevamente.',
            ),
          );
        },
      });
  }
}
