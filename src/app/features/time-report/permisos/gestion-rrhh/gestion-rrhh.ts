import { conectarEnlaceSolicitud } from '../solicitud-enlace.util';
import { ResumenSolicitudComponent } from '../resumen-solicitud/resumen-solicitud';
import { Component, OnInit, WritableSignal, computed, effect, inject, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { TarjetaResumenComponent } from '../../../../shared/components/tarjeta-resumen/tarjeta-resumen.component';
import { ModalBase } from '../../../../shared/components/modal-base/modal-base';
import { PaginacionComponent } from '../../../../shared/components/paginacion/paginacion.component';
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
  ResumenGestionRrhhApi,
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
    PaginacionComponent,
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
  readonly cargandoHistorial = signal(false);
  readonly colaboradoresSelector = signal<ColaboradorSelectorPermisoApi[]>([]);
  readonly busquedaHistorial = signal('');
  readonly filtroAnioHistorial = signal('TODOS');
  readonly filtroTipoHistorial = signal('TODOS');
  // --- Paginación en servidor (una página por pestaña) ---
  readonly porPagina = 10;
  readonly resumen = signal<ResumenGestionRrhhApi | null>(null);
  readonly paginaHistorial = signal(1);
  readonly totalHistorialFiltrado = signal(0);
  readonly paginaSaldos = signal(1);
  readonly totalSaldosFiltrado = signal(0);
  readonly paginaBandeja = signal(1);
  readonly totalBandejaFiltrada = signal(0);
  readonly cargandoBandeja = signal(false);
  readonly totalPaginasHistorial = computed(() => Math.max(1, Math.ceil(this.totalHistorialFiltrado() / this.porPagina)));
  readonly totalPaginasSaldos = computed(() => Math.max(1, Math.ceil(this.totalSaldosFiltrado() / this.porPagina)));
  readonly totalPaginasBandeja = computed(() => Math.max(1, Math.ceil(this.totalBandejaFiltrada() / this.porPagina)));
  private readonly temporizadores: Partial<Record<VistaRrhh, ReturnType<typeof setTimeout>>> = {};
  private readonly secuencias: Record<VistaRrhh, number> = { VALIDACION: 0, HISTORIAL_EDITABLE: 0, SALDOS: 0 };
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
      this.vistaActiva.set('VALIDACION');
      if (item.estadoClase === 'rrhh') this.abrirModalValidacion(sol);
      else this.abrirVistaFormulario(sol);
    });

    this.observarFiltros(
      'HISTORIAL_EDITABLE',
      () => [this.busquedaHistorial().trim(), this.filtroAnioHistorial(), this.filtroTipoHistorial(), this.soloPendientesVerificar()],
      this.paginaHistorial,
      () => this.cargarHistorialEditable(),
    );
    this.observarFiltros(
      'SALDOS',
      () => [this.busquedaSaldos().trim(), this.filtroRegimenSaldos(), this.soloSaldoNegativo()],
      this.paginaSaldos,
      () => this.cargarSaldosVacaciones(),
    );
    this.observarFiltros(
      'VALIDACION',
      () => [this.busqueda().trim(), this.tabActiva(), this.filtroTipo(), this.fechaDesde(), this.fechaHasta()],
      this.paginaBandeja,
      () => this.cargarBandejaDesdeApi(),
    );
  }

  /**
   * Recarga la página de una pestaña cuando cambian sus filtros o su número de página.
   * Un cambio de filtros vuelve a la página 1; la búsqueda espera 300 ms para no
   * disparar una petición por cada tecla.
   */
  private observarFiltros(
    vista: VistaRrhh,
    leerFiltros: () => unknown[],
    pagina: WritableSignal<number>,
    cargar: () => void,
  ): void {
    let claveAnterior: string | null = null;
    effect(() => {
      const clave = JSON.stringify(leerFiltros());
      const paginaActual = pagina();
      untracked(() => {
        const primeraCarga = claveAnterior === null;
        const cambiaronFiltros = !primeraCarga && clave !== claveAnterior;
        claveAnterior = clave;
        if (cambiaronFiltros && paginaActual !== 1) {
          pagina.set(1);
          return;
        }
        clearTimeout(this.temporizadores[vista]);
        if (cambiaronFiltros) {
          this.temporizadores[vista] = setTimeout(cargar, 300);
        } else {
          cargar();
        }
      });
    });
  }

  ngOnInit(): void {
    this.cargarResumen();
    this.cargarColaboradoresSelector();
  }

  cambiarVista(vista: VistaRrhh): void {
    this.vistaActiva.set(vista);
  }

  /** Recarga contadores y las páginas visibles tras crear, editar, anular o decidir. */
  refrescarDatos(): void {
    this.cargarResumen();
    this.cargarHistorialEditable();
    this.cargarSaldosVacaciones();
    this.cargarBandejaDesdeApi();
  }

  cargarResumen(): void {
    this.apiService.obtenerResumenRrhh().subscribe({
      next: (res) => {
        if (res?.success && res.data) this.resumen.set(res.data);
      },
    });
  }

  cargarBandejaDesdeApi(): void {
    const secuencia = ++this.secuencias.VALIDACION;
    this.cargandoBandeja.set(true);
    this.apiService
      .obtenerBandejaRrhh({
        page: this.paginaBandeja(),
        pageSize: this.porPagina,
        bandeja: this.tabActiva(),
        buscar: this.busqueda().trim(),
        tipo: this.filtroTipo(),
        desde: this.fechaDesde(),
        hasta: this.fechaHasta(),
      })
      .subscribe({
        next: (res) => {
          if (secuencia !== this.secuencias.VALIDACION) return;
          this.cargandoBandeja.set(false);
          if (res?.success && Array.isArray(res.data?.items)) {
            this.solicitudes.set(res.data.items.map((item) => this.mapearDesdeApi(item)));
            this.totalBandejaFiltrada.set(res.data.totalCount ?? res.data.items.length);
          }
        },
        error: (err) => {
          if (secuencia !== this.secuencias.VALIDACION) return;
          this.cargandoBandeja.set(false);
          this.toast.error(
            'No se pudo cargar la bandeja de Talento Humano',
            obtenerMensajeAmigablePermisos(err, 'No pudimos consultar las solicitudes en este momento.'),
          );
        },
      });
  }

  cargarHistorialEditable(): void {
    const secuencia = ++this.secuencias.HISTORIAL_EDITABLE;
    this.cargandoHistorial.set(true);
    this.apiService
      .obtenerHistorialEditableRrhh({
        page: this.paginaHistorial(),
        pageSize: this.porPagina,
        buscar: this.busquedaHistorial().trim(),
        anio: this.filtroAnioHistorial(),
        tipo: this.filtroTipoHistorial(),
        soloPendientesVerificar: this.soloPendientesVerificar(),
      })
      .subscribe({
        next: (res) => {
          if (secuencia !== this.secuencias.HISTORIAL_EDITABLE) return;
          this.cargandoHistorial.set(false);
          if (res?.success && Array.isArray(res.data?.items)) {
            this.historialRegistros.set(res.data.items.map((item) => this.mapearDesdeApi(item)));
            this.totalHistorialFiltrado.set(res.data.totalCount ?? res.data.items.length);
          }
        },
        error: (err) => {
          if (secuencia !== this.secuencias.HISTORIAL_EDITABLE) return;
          this.cargandoHistorial.set(false);
          this.toast.error(
            'No se pudo cargar el historial de permisos',
            obtenerMensajeAmigablePermisos(err, 'Inténtalo nuevamente en unos segundos.'),
          );
        },
      });
  }

  cargarColaboradoresSelector(): void {
    this.apiService.obtenerColaboradoresRrhh().subscribe({
      next: (res) => {
        if (res?.success && Array.isArray(res.data)) {
          this.colaboradoresSelector.set(res.data);
        }
      },
    });
  }

  cargarSaldosVacaciones(): void {
    const secuencia = ++this.secuencias.SALDOS;
    this.cargandoSaldos.set(true);
    this.apiService
      .obtenerSaldosVacacionesRrhh({
        page: this.paginaSaldos(),
        pageSize: this.porPagina,
        buscar: this.busquedaSaldos().trim(),
        regimen: this.filtroRegimenSaldos(),
        soloSaldoNegativo: this.soloSaldoNegativo(),
      })
      .subscribe({
        next: (res) => {
          if (secuencia !== this.secuencias.SALDOS) return;
          this.cargandoSaldos.set(false);
          if (res?.success && Array.isArray(res.data?.items)) {
            this.saldosColaboradores.set(res.data.items);
            this.totalSaldosFiltrado.set(res.data.totalCount ?? res.data.items.length);
            const activo = this.colaboradorSaldoActivo();
            if (activo) {
              const actualizado = res.data.items.find((x) => x.idEmpleado === activo.idEmpleado);
              if (actualizado) this.colaboradorSaldoActivo.set(actualizado);
            }
          }
        },
        error: (err) => {
          if (secuencia !== this.secuencias.SALDOS) return;
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

  // --- KPIs (resumen ligero del servidor) ---
  readonly totalPorConfirmar = computed(() => this.resumen()?.porConfirmar ?? 0);
  readonly totalPendientesExternos = computed(() => this.resumen()?.pendientesLiderExterno ?? 0);
  readonly totalConfirmadasMes = computed(() => this.resumen()?.confirmadas ?? 0);
  readonly totalHistorialRegistros = computed(() => this.resumen()?.totalHistorial ?? 0);
  readonly totalPorVerificar = computed(() => this.resumen()?.porVerificar ?? 0);
  readonly totalColaboradoresSaldos = computed(() => this.resumen()?.totalColaboradores ?? 0);
  readonly aniosDisponiblesHistorial = computed(() =>
    (this.resumen()?.aniosDisponibles ?? []).map((a) => String(a)),
  );

  // --- Acciones CRUD del Historial Editable ---
  abrirNuevoRegistroHistorial(idEmpleadoPreseleccionado?: number): void {
    const hoyIso = new Date().toISOString().slice(0, 10);
    this.editandoId.set(null);
    this.formIdEmpleado.set(
      idEmpleadoPreseleccionado ?? this.colaboradoresSelector()[0]?.idEmpleado ?? 0,
    );
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

  /** Anulación desde el popup de edición (el registro abierto pertenece a la página actual). */
  anularDesdePopup(): void {
    const id = this.editandoId();
    const item = id ? this.historialRegistros().find((x) => x.id === id) : undefined;
    if (item) this.anularRegistroHistorial(item);
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
          this.refrescarDatos();
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

  marcarVerificadoRapido(item: SolicitudRrhh): void {
    const payload: GuardarPermisoRrhhPayload = {
      idEmpleado: item.idEmpleado,
      tipoOficial: item.tipoOficial,
      fechaInicio: dmyAIso(item.fechaInicio),
      fechaFin: dmyAIso(item.fechaFin),
      fechaRegreso: dmyAIso(item.fechaRegreso),
      totalDias: item.totalDias,
      horario: item.horario,
      detalleHorario: item.detalleHorario ?? null,
      motivo: item.motivo,
      descuentaVacaciones: item.descuentaVacaciones,
      esRecuperable: item.esRecuperable,
      esAnticipada: item.esAnticipada,
      esHistorico: item.esHistorico,
      verificadoRrhh: true,
      observacionMigracion: item.observacionMigracion ?? null,
      estadoCodigo: this.mapearEstadoACodigoBd(item.estadoCodigo),
      impactoTimeReport: item.impactoTimeReport,
    };

    this.apiService.actualizarRegistroRrhh(item.id, payload).subscribe({
      next: (res) => {
        if (res?.success && res.data) {
          this.refrescarDatos();
        }
        this.toast.exito('Registro verificado', `${item.folio} marcado como verificado por Talento Humano.`);
      },
      error: (err) => {
        this.toast.error('Error al verificar', obtenerMensajeAmigablePermisos(err));
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
        if (this.editandoId() === item.id) this.modalEdicionAbierto.set(false);
        this.refrescarDatos();
        this.toast.exito('Registro anulado', `${item.folio} fue anulado y los saldos fueron recalculados.`);
      },
      error: (err) => {
        this.toast.error('No se pudo anular el registro', obtenerMensajeAmigablePermisos(err));
      },
    });
  }

  verHistorialDeColaborador(col: SaldoVacacionesColaboradorApi): void {
    this.filtroAnioHistorial.set('TODOS');
    this.filtroTipoHistorial.set('TODOS');
    this.soloPendientesVerificar.set(false);
    this.busquedaHistorial.set(col.cedula || col.apellidosNombres);
    this.vistaActiva.set('HISTORIAL_EDITABLE');
  }

  // --- Acciones Modal Ajuste / Excepción Factura ---
  abrirModalAjusteSaldo(col: SaldoVacacionesColaboradorApi): void {
    this.colaboradorSaldoActivo.set(col);
    this.ajusteTipo.set(col.regimen === 'FACTURA' ? 'EXCEPCION_FACTURA' : 'AJUSTE_DIAS');
    this.ajusteDias.set(0);
    this.ajustePermiteVacaciones.set(!col.excepcionFacturaActiva);
    this.ajusteFechaAfiliacion.set(dmyAIso(col.fechaInicioVacaciones ?? col.fechaIngresoOriginal ?? ''));
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
    if (this.ajusteTipo() === 'FECHA_AFILIACION' && !/^d{4}-d{2}-d{2}$/.test(fechaAfiliacion)) {
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
            this.refrescarDatos();
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
            this.refrescarDatos();
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
