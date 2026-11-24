import { conectarEnlaceSolicitud } from '../solicitud-enlace.util';
import { ResumenSolicitudComponent } from '../resumen-solicitud/resumen-solicitud';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { Subscription, switchMap, timer } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { TarjetaResumenComponent } from '../../../../shared/components/tarjeta-resumen/tarjeta-resumen.component';
import { ModalBase } from '../../../../shared/components/modal-base/modal-base';
import { NotificacionToastService } from '../../../../shared/services/notificacion-toast.service';
import {
  DatosFormularioOficial,
  HorarioPermisoOficial,
  TipoPermisoOficial,
} from '../formulario-permiso-oficial/formulario-permiso-oficial';
import {
  calcularDiasCalendarioIso,
  calcularRangoPreset,
  calcularSiguienteDiaLaborableIso,
  coincideBusquedaInteligente,
  cumpleRangoFechas,
  dmyAIso,
  PeriodoPreset,
} from '../filtro-fechas.util';
import { PermisosPdfService } from '../permisos-pdf.service';
import {
  AdjuntoPermisoApi,
  ColaboradorSelectorPermisoApi,
  GuardarPermisoRrhhPayload,
  PermisoItemApi,
  PermisosApiService,
  SaldoVacacionesColaboradorApi,
  obtenerMensajeAmigablePermisos,
} from '../permisos-api.service';

export interface SolicitudRrhh {
  versionSolicitud?: string | null;
  id: number;
  idEmpleado: number;
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
  totalDias: number;
  horario: HorarioPermisoOficial;
  detalleHorario?: string;
  duracion: string;
  horasSolicitadas: string;
  horasEquivalentes: number;
  liderNombre: string;
  liderTipo: 'Interno' | 'Externo';
  liderEmpresa?: string;
  liderCorreo?: string;
  metodoConfirmacionLider: string;
  fechaConfirmacionLider: string;
  comentarioLider: string;
  motivo: string;
  adjuntos?: AdjuntoPermisoApi[];
  evidencia?: string;
  evidenciaUrl?: string;
  goceSueldo: string;
  impactoTimeReport: 'RESTA_META' | 'SUMA_REPORTADAS' | 'SIN_IMPACTO';
  aprobadoLider: boolean;
  confirmadoRrhh: boolean;
  estado: 'CONFIRMADO_LIDER' | 'PENDIENTE_LIDER_EXT' | 'APROBADO_RRHH' | 'OBSERVADO_RRHH' | 'RECHAZADO';
  estadoCodigo: string;
  estadoClase: 'confirmado' | 'pendiente' | 'rrhh' | 'observado' | 'rechazado';
  estadoTexto: string;
  fechaConfirmacionRrhh?: string;
  responsableRrhh?: string;
  descuentaVacaciones: boolean;
  esRecuperable: boolean;
  esAnticipada: boolean;
  esHistorico: boolean;
  verificadoRrhh: boolean;
  observacionMigracion?: string;
}

export type VistaRrhh = 'VALIDACION' | 'HISTORIAL_EDITABLE' | 'SALDOS';

const TIPOS_PERMISO_OPCIONES: ReadonlyArray<{ codigo: TipoPermisoOficial; nombre: string }> = [
  { codigo: 'VACACIONES', nombre: 'Vacaciones' },
  { codigo: 'LICENCIA_ENFERMEDAD', nombre: 'Licencia por enfermedad' },
  { codigo: 'CITAS_MEDICAS', nombre: 'Citas médicas' },
  { codigo: 'MATRIMONIO', nombre: 'Matrimonio' },
  { codigo: 'NACIMIENTO_HIJO', nombre: 'Nacimiento de un Hijo/a' },
  { codigo: 'MATERNIDAD', nombre: 'Maternidad' },
  { codigo: 'FALLECIMIENTO_FAMILIAR', nombre: 'Fallecimiento de un familiar' },
  { codigo: 'CALAMIDAD_DOMESTICA', nombre: 'Calamidad doméstica' },
  { codigo: 'ACCIDENTE', nombre: 'Accidente' },
  { codigo: 'OTROS', nombre: 'Otros' },
];

@Component({
  selector: 'app-gestion-rrhh',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HeaderComponent,
    TarjetaResumenComponent,
    ModalBase,
    ResumenSolicitudComponent,
  ],
  templateUrl: './gestion-rrhh.html',
  styleUrl: './gestion-rrhh.scss',
})
export class GestionRrhhComponent implements OnInit {
  private readonly toast = inject(NotificacionToastService);
  private readonly pdfService = inject(PermisosPdfService);
  private readonly apiService = inject(PermisosApiService);

  readonly tiposPermisoOpciones = TIPOS_PERMISO_OPCIONES;

  // Navegación principal del módulo RRHH
  readonly vistaActiva = signal<VistaRrhh>('HISTORIAL_EDITABLE');

  // --- Estado vista VALIDACION ---
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

  // --- Estado vista HISTORIAL EDITABLE ---
  readonly historialRegistros = signal<SolicitudRrhh[]>([]);
  private readonly destroyRef = inject(DestroyRef);
  private peticionHistorial?: Subscription;
  private peticionSaldos?: Subscription;
  private peticionBandeja?: Subscription;
  private selectorCargado = false;
  private cargandoSelector = false;
  readonly paginaHistorial = signal(1);
  readonly totalFiltrado = signal(0);
  readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.totalFiltrado() / 25)));
  readonly aniosDisponiblesHistorial = signal<number[]>([]);
  readonly totalHistorialRegistros = signal(0);
  readonly totalPorVerificar = signal(0);
  readonly totalPorConfirmar = signal(0);
  readonly totalConfirmadasMes = signal(0);
  readonly errorHistorial = signal(false);
  readonly cargandoHistorial = signal(false);
  readonly colaboradoresSelector = signal<ColaboradorSelectorPermisoApi[]>([]);
  readonly busquedaHistorial = signal('');
  readonly filtroAnioHistorial = signal('TODOS');
  readonly filtroTipoHistorial = signal('TODOS');
  readonly filtroEmpleadoHistorial = signal('TODOS');
  readonly soloPendientesVerificar = signal(false);

  // Modal Crear / Editar registro del historial
  readonly modalEdicionAbierto = signal(false);
  readonly editandoId = signal<number | null>(null);
  readonly guardandoEdicion = signal(false);
  readonly formIdEmpleado = signal<number>(0);
  readonly formTipoOficial = signal<TipoPermisoOficial>('VACACIONES');
  readonly formFechaInicio = signal('');
  readonly formFechaFin = signal('');
  readonly formFechaRegreso = signal('');
  readonly formTotalDias = signal<number>(1);
  readonly formMotivo = signal('');
  readonly formDescuentaVacaciones = signal(true);
  readonly formEsRecuperable = signal(false);
  readonly formEsAnticipada = signal(false);
  readonly formEsHistorico = signal(true);
  readonly formVerificadoRrhh = signal(true);
  /** El registro abierto en el popup estaba pendiente de verificación al abrirlo. */
  readonly registroPendienteVerificar = signal(false);
  readonly formEstadoCodigo = signal('APROBADA');
  readonly formObservacionMigracion = signal('');

  // --- Estado vista SALDOS DE VACACIONES ---
  readonly saldosColaboradores = signal<SaldoVacacionesColaboradorApi[]>([]);
  readonly cargandoSaldos = signal(false);
  readonly busquedaSaldos = signal('');
  readonly filtroRegimenSaldos = signal<'TODOS' | 'AFILIADO' | 'MIXTO' | 'FACTURA'>('TODOS');
  readonly soloSaldoNegativo = signal(false);

  // Modal Ajuste de Saldo / Excepción Factura
  readonly modalAjusteAbierto = signal(false);
  readonly colaboradorSaldoActivo = signal<SaldoVacacionesColaboradorApi | null>(null);
  readonly ajusteTipo = signal<'AJUSTE_DIAS' | 'EXCEPCION_FACTURA' | 'FECHA_AFILIACION'>('AJUSTE_DIAS');
  readonly ajusteFechaAfiliacion = signal('');
  readonly ajusteDias = signal<number>(0);
  readonly ajustePermiteVacaciones = signal<boolean>(true);
  readonly ajusteMotivo = signal('');
  readonly guardandoAjuste = signal(false);

  constructor() {
    conectarEnlaceSolicitud((item) => {
      const sol = this.mapearDesdeApi(item);
      this.cambiarVista('VALIDACION');
      if (item.estadoClase === 'rrhh') this.abrirModalValidacion(sol);
      else this.abrirVistaFormulario(sol);
    });
  }

  ngOnInit(): void {
    this.cambiarVista(this.vistaActiva());
  }

  cambiarVista(vista: VistaRrhh): void {
    this.vistaActiva.set(vista);
    if (vista === 'HISTORIAL_EDITABLE') this.cargarHistorialEditable();
    if (vista === 'SALDOS') this.cargarSaldosVacaciones();
    if (vista === 'VALIDACION') this.cargarBandejaDesdeApi();
  }

  cargarBandejaDesdeApi(): void {
    this.peticionBandeja?.unsubscribe();
    this.peticionBandeja = this.apiService.obtenerBandejaRrhh().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        if (res?.success && Array.isArray(res.data)) {
          const mapeadas = res.data.map((item) => this.mapearDesdeApi(item));
          this.solicitudes.set(mapeadas);
          this.totalPorConfirmar.set(mapeadas.filter(s => s.estado === 'CONFIRMADO_LIDER').length);
          this.totalConfirmadasMes.set(mapeadas.filter(s => s.estado === 'APROBADO_RRHH').length);
          this.totalHistorialRegistros.set(mapeadas.length);
          this.totalPorVerificar.set(mapeadas.filter(s => !s.verificadoRrhh).length);
          if (
            this.tabActiva() === 'POR_CONFIRMAR' &&
            !mapeadas.some((s) => s.estado === 'CONFIRMADO_LIDER') &&
            mapeadas.some((s) => s.estado !== 'CONFIRMADO_LIDER' && s.estado !== 'PENDIENTE_LIDER_EXT')
          ) {
            this.tabActiva.set('HISTORIAL');
          }
        }
      },
      error: (err) => {
        this.toast.error(
          'No se pudo cargar la bandeja de Talento Humano',
          obtenerMensajeAmigablePermisos(err, 'No pudimos consultar las solicitudes en este momento.'),
        );
      },
    });
  }

  cargarHistorialEditable(pagina = this.paginaHistorial(), demora = 0): void {
    this.peticionHistorial?.unsubscribe();
    this.paginaHistorial.set(pagina);
    this.errorHistorial.set(false);
    this.cargandoHistorial.set(true);
    const params: Record<string, string | number | boolean> = { pagina };
    if (this.busquedaHistorial().trim()) params['buscar'] = this.busquedaHistorial().trim();
    if (this.filtroEmpleadoHistorial() !== 'TODOS') params['idEmpleado'] = this.filtroEmpleadoHistorial();
    if (this.filtroTipoHistorial() !== 'TODOS') params['tipo'] = this.filtroTipoHistorial();
    if (this.filtroAnioHistorial() !== 'TODOS') params['anio'] = this.filtroAnioHistorial();
    if (this.soloPendientesVerificar()) params['soloPendientesVerificar'] = true;
    this.peticionHistorial = timer(demora).pipe(
      switchMap(() => this.apiService.obtenerPaginaHistorialRrhh(params)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: ({ data }) => {
        this.cargandoHistorial.set(false);
        if (!data) { this.errorHistorial.set(true); return; }
        this.totalFiltrado.set(data.total);
        this.totalHistorialRegistros.set(data.resumen?.registros ?? 0);
        this.totalPorVerificar.set(data.resumen?.porVerificar ?? 0);
        this.totalPorConfirmar.set(data.resumen?.porConfirmar ?? 0);
        this.totalConfirmadasMes.set(data.resumen?.confirmados ?? 0);
        this.aniosDisponiblesHistorial.set(data.anios);
        if (pagina > this.totalPaginas()) {
          this.cargarHistorialEditable(this.totalPaginas());
          return;
        }
        this.historialRegistros.set(data.items.map(item => this.mapearDesdeApi(item)));
      },
      error: (err) => {
        this.cargandoHistorial.set(false);
        this.errorHistorial.set(true);
        this.toast.error('No se pudo cargar el historial', obtenerMensajeAmigablePermisos(err));
      },
    });
  }

  cargarColaboradoresSelector(): void {
    if (this.selectorCargado || this.cargandoSelector) return;
    this.cargandoSelector = true;
    this.apiService.obtenerColaboradoresRrhh().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ data }) => {
        this.cargandoSelector = false;
        if (data) {
          this.colaboradoresSelector.set(data);
          this.selectorCargado = true;
        }
      },
      error: err => {
        this.cargandoSelector = false;
        this.toast.error('No se pudo cargar el selector de colaboradores', obtenerMensajeAmigablePermisos(err));
      },
    });
  }

  cargarSaldosVacaciones(): void {
    this.cargandoSaldos.set(true);
    this.peticionSaldos?.unsubscribe();
    this.peticionSaldos = this.apiService.obtenerSaldosVacacionesRrhh().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.cargandoSaldos.set(false);
        if (res?.success && Array.isArray(res.data)) {
          this.saldosColaboradores.set(res.data);
          const activo = this.colaboradorSaldoActivo();
          if (activo) {
            const actualizado = res.data.find((x) => x.idEmpleado === activo.idEmpleado) ?? null;
            this.colaboradorSaldoActivo.set(actualizado);
          }
        }
      },
      error: (err) => {
        this.cargandoSaldos.set(false);
        this.toast.error(
          'No se pudieron cargar los saldos de vacaciones',
          obtenerMensajeAmigablePermisos(err, 'Inténtalo nuevamente en unos segundos.'),
        );
      },
    });
  }

  private mapearDesdeApi(item: PermisoItemApi): SolicitudRrhh {
    return {
      id: item.id,
      idEmpleado: item.idEmpleado,
      versionSolicitud: item.versionSolicitud,
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
      totalDias: Number(item.totalDias ?? 0),
      horario: item.horario,
      detalleHorario: item.detalleHorario ?? undefined,
      duracion: item.duracion,
      horasSolicitadas: item.horasSolicitadas || `${item.totalHoras} horas`,
      horasEquivalentes: item.totalHoras,
      liderNombre: item.liderNombre,
      liderTipo: item.liderTipo === 'EXT' ? 'Externo' : 'Interno',
      liderEmpresa: item.liderEmpresa ?? item.cliente,
      liderCorreo: item.liderCorreo ?? undefined,
      metodoConfirmacionLider: item.metodoLider,
      fechaConfirmacionLider: item.fechaAprobacionLider ?? 'Pendiente',
      comentarioLider: item.comentarioLider ?? '',
      motivo: item.motivo,
      adjuntos: item.adjuntos ?? [],
      evidencia: item.evidenciaNombre ?? undefined,
      evidenciaUrl: item.tieneEvidencia ? this.apiService.obtenerUrlEvidencia(item.id) : undefined,
      goceSueldo: item.tipoOficial === 'VACACIONES' ? 'Con goce de sueldo (Vacaciones)' : 'Con goce de sueldo',
      impactoTimeReport: item.impactoTimeReport ?? 'RESTA_META',
      aprobadoLider: item.aprobadoLider,
      confirmadoRrhh: item.confirmadoRrhh,
      estado: item.estadoRrhh,
      estadoCodigo: item.estadoCodigo,
      estadoClase: item.estadoClase,
      estadoTexto: item.estadoTexto,
      fechaConfirmacionRrhh: item.fechaConfirmacionRrhh ?? undefined,
      responsableRrhh: item.responsableRrhh ?? undefined,
      descuentaVacaciones: item.descuentaVacaciones ?? item.tipoOficial === 'VACACIONES',
      esRecuperable: item.esRecuperable ?? false,
      esAnticipada: item.esAnticipada ?? false,
      esHistorico: item.esHistorico ?? false,
      verificadoRrhh: item.verificadoRrhh ?? true,
      observacionMigracion: item.observacionMigracion ?? undefined,
    };
  }

  // --- KPIs ---
  readonly totalPendientesExternos = computed(
    () => this.solicitudes().filter((s) => s.estado === 'PENDIENTE_LIDER_EXT').length,
  );
  // --- Filtros Saldos ---
  readonly saldosFiltrados = computed(() => {
    const q = this.busquedaSaldos();
    const reg = this.filtroRegimenSaldos();
    const soloNeg = this.soloSaldoNegativo();

    return this.saldosColaboradores().filter((c) => {
      if (reg !== 'TODOS' && c.regimen !== reg) return false;
      if (soloNeg && c.saldoDisponible >= 0) return false;
      if (
        !coincideBusquedaInteligente(q, [
          c.apellidosNombres,
          c.cedula,
          c.codigoEmpleado,
          c.cargo,
          c.empresa,
          c.tipoContrato,
          c.regimen,
        ])
      ) {
        return false;
      }
      return true;
    });
  });

  // --- Filtros Bandeja Validación ---
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

  // --- Acciones CRUD del Historial Editable ---
  abrirNuevoRegistroHistorial(idEmpleadoPreseleccionado?: number): void {
    this.registroPendienteVerificar.set(false);
    this.cargarColaboradoresSelector();
    const hoyIso = new Date().toISOString().slice(0, 10);
    this.editandoId.set(null);
    this.formIdEmpleado.set(idEmpleadoPreseleccionado ?? 0);
    this.formTipoOficial.set('VACACIONES');
    this.formFechaInicio.set(hoyIso);
    this.formFechaFin.set(hoyIso);
    this.formFechaRegreso.set(calcularSiguienteDiaLaborableIso(hoyIso));
    this.formTotalDias.set(1);
    this.formMotivo.set('VACACIONES');
    this.formDescuentaVacaciones.set(true);
    this.formEsRecuperable.set(false);
    this.formEsAnticipada.set(false);
    this.formEsHistorico.set(true);
    this.formVerificadoRrhh.set(true);
    this.formEstadoCodigo.set('APROBADA');
    this.formObservacionMigracion.set('');
    this.modalEdicionAbierto.set(true);
  }

  abrirEditarRegistro(item: SolicitudRrhh): void {
    this.cargarColaboradoresSelector();
    this.editandoId.set(item.id);
    this.formIdEmpleado.set(item.idEmpleado);
    this.formTipoOficial.set(item.tipoOficial);
    this.formFechaInicio.set(dmyAIso(item.fechaInicio));
    this.formFechaFin.set(dmyAIso(item.fechaFin));
    this.formFechaRegreso.set(dmyAIso(item.fechaRegreso));
    this.formTotalDias.set(item.totalDias || 1);
    this.formMotivo.set(item.motivo);
    this.formDescuentaVacaciones.set(item.descuentaVacaciones);
    this.formEsRecuperable.set(item.esRecuperable);
    this.formEsAnticipada.set(item.esAnticipada);
    this.formEsHistorico.set(item.esHistorico);
    this.formVerificadoRrhh.set(item.verificadoRrhh);
    this.formEstadoCodigo.set(this.mapearEstadoACodigoBd(item.estadoCodigo));
    this.formObservacionMigracion.set(item.observacionMigracion ?? '');
    this.registroPendienteVerificar.set(!item.verificadoRrhh);
    this.modalEdicionAbierto.set(true);
  }

  /** Verificación desde el mismo popup de edición: marca el registro como verificado y guarda. */
  verificarYGuardarRegistro(): void {
    this.formVerificadoRrhh.set(true);
    this.guardarRegistroHistorial();
  }

  private mapearEstadoACodigoBd(codigoCorto: string): string {
    switch (codigoCorto) {
      case 'PEN':
        return 'PENDIENTE_JEFE';
      case 'RRH':
        return 'PENDIENTE_TH';
      case 'OBS':
        return 'OBSERVADA';
      case 'REC':
        return 'RECHAZADA';
      default:
        return 'APROBADA';
    }
  }

  alCambiarTipoEnModal(tipo: TipoPermisoOficial): void {
    this.formTipoOficial.set(tipo);
    if (tipo === 'VACACIONES') {
      this.formDescuentaVacaciones.set(true);
      this.formEsRecuperable.set(false);
    } else if (tipo === 'CITAS_MEDICAS' || tipo === 'OTROS') {
      this.formDescuentaVacaciones.set(false);
      this.formEsRecuperable.set(true);
    } else {
      this.formDescuentaVacaciones.set(false);
    }
    this.recalcularDiasEnModal();
  }

  alCambiarFechasEnModal(inicio: string, fin: string): void {
    this.formFechaInicio.set(inicio);
    const finEfectivo = fin && fin >= inicio ? fin : inicio;
    this.formFechaFin.set(finEfectivo);
    if (finEfectivo) {
      this.formFechaRegreso.set(calcularSiguienteDiaLaborableIso(finEfectivo));
    }
    this.recalcularDiasEnModal();
  }

  private recalcularDiasEnModal(): void {
    const ini = this.formFechaInicio();
    const fin = this.formFechaFin();
    if (!ini || !fin) return;
    this.formTotalDias.set(calcularDiasCalendarioIso(ini, fin));
  }

  guardarRegistroHistorial(): void {
    if (this.guardandoEdicion()) return;
    if (!this.formIdEmpleado()) {
      this.toast.warning('Colaborador requerido', 'Selecciona un colaborador para guardar el registro.');
      return;
    }
    if (!this.formFechaInicio() || !this.formFechaFin()) {
      this.toast.warning('Fechas requeridas', 'Debes indicar fecha de inicio y fecha de fin.');
      return;
    }
    if (!this.formMotivo().trim()) {
      this.toast.warning('Motivo requerido', 'Escribe el motivo del permiso o vacación.');
      return;
    }

    const payload: GuardarPermisoRrhhPayload = {
      idEmpleado: Number(this.formIdEmpleado()),
      tipoOficial: this.formTipoOficial(),
      fechaInicio: this.formFechaInicio(),
      fechaFin: this.formFechaFin(),
      fechaRegreso: this.formFechaRegreso() || null,
      totalDias: Number(this.formTotalDias()) > 0 ? Number(this.formTotalDias()) : null,
      horario: 'COMPLETA',
      detalleHorario: this.formTipoOficial() === 'VACACIONES' ? 'Días calendario' : '08:30 - 17:30',
      motivo: this.formMotivo().trim(),
      descuentaVacaciones: this.formDescuentaVacaciones(),
      esRecuperable: this.formEsRecuperable(),
      esAnticipada: this.formEsAnticipada(),
      esHistorico: this.formEsHistorico(),
      verificadoRrhh: this.formVerificadoRrhh(),
      observacionMigracion: this.formObservacionMigracion().trim() || null,
      estadoCodigo: this.formEstadoCodigo(),
      impactoTimeReport: this.formEsHistorico() ? 'SIN_IMPACTO' : 'RESTA_META',
    };

    this.guardandoEdicion.set(true);
    const idEdit = this.editandoId();
    const req$ = idEdit
      ? this.apiService.actualizarRegistroRrhh(idEdit, payload)
      : this.apiService.crearRegistroRrhh(payload);

    req$.subscribe({
      next: (res) => {
        this.guardandoEdicion.set(false);
        this.modalEdicionAbierto.set(false);
        if (res?.success && res.data) {
          this.cambiarVista(this.vistaActiva());
        }
        this.toast.exito(
          idEdit ? 'Registro actualizado' : 'Registro creado',
          idEdit
            ? 'Los cambios fueron guardados y el saldo de vacaciones se actualizó automáticamente.'
            : 'El permiso quedó registrado en el historial y el saldo fue recalculado.',
        );
      },
      error: (err) => {
        this.guardandoEdicion.set(false);
        this.toast.error(
          'No se pudo guardar el registro',
          obtenerMensajeAmigablePermisos(err, 'Revisa los datos ingresados e inténtalo nuevamente.'),
        );
      },
    });
  }

  anularRegistroHistorial(item: SolicitudRrhh): void {
    const ok = window.confirm(
      `¿Seguro que deseas anular el registro ${item.folio} (${item.colaborador}, ${item.fechaInicio} - ${item.fechaFin})? Esto recalculará su saldo de vacaciones.`,
    );
    if (!ok) return;

    this.apiService.anularRegistroRrhh(item.id).subscribe({
      next: () => {
        this.cambiarVista(this.vistaActiva());
        this.toast.exito('Registro anulado', `${item.folio} fue anulado y los saldos fueron recalculados.`);
      },
      error: (err) => {
        this.toast.error('No se pudo anular el registro', obtenerMensajeAmigablePermisos(err));
      },
    });
  }

  verHistorialDeColaborador(col: SaldoVacacionesColaboradorApi): void {
    this.filtroEmpleadoHistorial.set(String(col.idEmpleado));
    this.filtroAnioHistorial.set('TODOS');
    this.filtroTipoHistorial.set('TODOS');
    this.soloPendientesVerificar.set(false);
    this.busquedaHistorial.set('');
    this.vistaActiva.set('HISTORIAL_EDITABLE');
    this.cargarColaboradoresSelector();
    this.cargarHistorialEditable(1);
  }

  // --- Acciones Modal Ajuste / Excepción Factura ---
  abrirModalAjusteSaldo(col: SaldoVacacionesColaboradorApi): void {
    this.colaboradorSaldoActivo.set(col);
    this.ajusteTipo.set(col.regimen === 'FACTURA' ? 'EXCEPCION_FACTURA' : 'AJUSTE_DIAS');
    this.ajusteDias.set(0);
    this.ajustePermiteVacaciones.set(!col.excepcionFacturaActiva);
    const fechaRegistrada = col.ajustes.find(a => a.tipoAjuste === 'FECHA_AFILIACION' && a.fechaAfiliacionBase);
    this.ajusteFechaAfiliacion.set(dmyAIso(fechaRegistrada?.fechaAfiliacionBase ?? ''));
    this.ajusteMotivo.set('');
    this.modalAjusteAbierto.set(true);
  }

  guardarAjusteSaldo(): void {
    const col = this.colaboradorSaldoActivo();
    if (!col || this.guardandoAjuste()) return;

    const motivo = this.ajusteMotivo().trim();
    if (!motivo) {
      this.toast.warning('Motivo obligatorio', 'Debes escribir el motivo del ajuste o excepción.');
      return;
    }

    if (this.ajusteTipo() === 'AJUSTE_DIAS' && Number(this.ajusteDias()) === 0) {
      this.toast.warning('Días requeridos', 'Ingresa una cantidad de días distinta de 0 (positiva para sumar o negativa para descontar).');
      return;
    }

    const fechaAfiliacion = this.ajusteFechaAfiliacion().trim();
    if (this.ajusteTipo() === 'FECHA_AFILIACION' && !/^\d{4}-\d{2}-\d{2}$/.test(fechaAfiliacion)) {
      this.toast.warning('Fecha requerida', 'Ingresa la fecha real de afiliación al IESS.');
      return;
    }

    this.guardandoAjuste.set(true);
    this.apiService
      .crearAjusteVacacionesRrhh(col.idEmpleado, {
        tipoAjuste: this.ajusteTipo(),
        diasAjuste: this.ajusteTipo() === 'AJUSTE_DIAS' ? Number(this.ajusteDias()) : 0,
        permiteVacaciones:
          this.ajusteTipo() === 'EXCEPCION_FACTURA' ? this.ajustePermiteVacaciones() : null,
        motivo,
        fechaAfiliacionBase: this.ajusteTipo() === 'FECHA_AFILIACION' ? fechaAfiliacion : null,
      })
      .subscribe({
        next: () => {
          this.guardandoAjuste.set(false);
          this.ajusteDias.set(0);
          this.ajusteMotivo.set('');
          this.cargarSaldosVacaciones();
          this.toast.exito(
            'Ajuste aplicado',
            `Se actualizó la configuración de vacaciones de ${col.apellidosNombres}.`,
          );
        },
        error: (err) => {
          this.guardandoAjuste.set(false);
          this.toast.error('No se pudo guardar el ajuste', obtenerMensajeAmigablePermisos(err));
        },
      });
  }

  anularAjusteSaldo(idAjuste: number): void {
    this.apiService.anularAjusteVacacionesRrhh(idAjuste).subscribe({
      next: () => {
        this.cargarSaldosVacaciones();
        this.toast.exito('Ajuste anulado', 'El ajuste fue revertido y el saldo recalculado.');
      },
      error: (err) => {
        this.toast.error('Error al anular ajuste', obtenerMensajeAmigablePermisos(err));
      },
    });
  }

  // --- Métodos existentes de la bandeja de Validación RRHH ---
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
    if (item.estado === 'PENDIENTE_LIDER_EXT' && !item.liderCorreo?.trim()) {
      this.toast.info(
        'Líder sin correo registrado',
        `El líder externo ${item.liderNombre || 'asignado'} no tiene un correo registrado.`,
        7000,
      );
    }
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
      horasSolicitadas: sol.horasSolicitadas || `${sol.horasEquivalentes} horas`,
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
    if (!item.liderCorreo?.trim()) {
      this.toast.info(
        'Líder sin correo registrado',
        `El líder externo ${item.liderNombre || 'asignado'} no tiene un correo registrado.`,
        7000,
      );
      return;
    }
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
        actual.versionSolicitud,
      )
      .subscribe({
        next: (res) => {
          this.procesandoAccion.set(false);
          if (res?.success && res.data) {
            const mapeada = this.mapearDesdeApi(res.data);
            this.solicitudes.update((lista) => lista.map((s) => (s.id === actual.id ? mapeada : s)));
            this.cambiarVista(this.vistaActiva());
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
        actual.versionSolicitud,
      )
      .subscribe({
        next: (res) => {
          this.procesandoAccion.set(false);
          if (res?.success && res.data) {
            const mapeada = this.mapearDesdeApi(res.data);
            this.solicitudes.update((lista) => lista.map((s) => (s.id === actual.id ? mapeada : s)));
            this.cambiarVista(this.vistaActiva());
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
