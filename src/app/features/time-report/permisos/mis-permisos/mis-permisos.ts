import { conectarEnlaceSolicitud } from '../solicitud-enlace.util';
import { ResumenSolicitudComponent } from '../resumen-solicitud/resumen-solicitud';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
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
  PeriodoPreset,
  calcularDiasLaborablesIso,
  calcularRangoPreset,
  calcularSiguienteDiaLaborableIso,
  coincideBusquedaInteligente,
  cumpleRangoFechas,
} from '../filtro-fechas.util';
import { PermisosPdfService } from '../permisos-pdf.service';
import {
  AdjuntoPermisoApi,
  PermisoItemApi,
  PermisosApiService,
  TipoPermisoCatalogoApi,
  RrhhDisponiblePermisoApi,
  obtenerMensajeAmigablePermisos,
} from '../permisos-api.service';

export interface SolicitudColaborador {
  id?: number;
  codigo: string;
  colaborador?: string;
  cedula?: string;
  cargo?: string;
  diaSolicitud?: string;
  mesSolicitud?: string;
  anioSolicitud?: string;
  tipo: string;
  tipoOficial: TipoPermisoOficial;
  motivo: string;
  fechas: string;
  fechaInicio: string;
  fechaFin: string;
  fechaRegreso: string;
  fechaAprobacion: string;
  diasSolicitados: string;
  horario: HorarioPermisoOficial;
  detalleHorario?: string;
  horasSolicitadas: string;
  duracion: string;
  cliente: string;
  proyecto: string;
  lider: string;
  tipoLider: 'INT' | 'EXT';
  metodoLider?: string;
  responsableRrhh?: string;
  evidencia: string | null;
  evidenciaUrl?: string | null;
  adjuntos?: AdjuntoPermisoApi[];
  aprobadoLider: boolean;
  confirmadoRrhh: boolean;
  estadoClase: 'pendiente' | 'rrhh' | 'confirmado' | 'observado' | 'rechazado';
  estadoTexto: string;
  comentarios?: string;
}

export interface OpcionClienteProyecto {
  indiceOriginal: number;
  idProyecto: number | null;
  idCliente: number | null;
  cliente: string;
  proyecto: string;
  etiqueta: string;
  idLider: number | null;
  liderNombre: string;
  tipoLider: 'INT' | 'EXT';
  esAsignacionPropia: boolean;
}

export interface OpcionLiderFormulario {
  idLider: number | null;
  nombre: string;
  tipo: 'INT' | 'EXT';
  etiqueta: string;
}

@Component({
  selector: 'app-mis-permisos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HeaderComponent,
    TarjetaResumenComponent,
    ModalBase,
    ResumenSolicitudComponent,
  ],
  templateUrl: './mis-permisos.html',
  styleUrl: './mis-permisos.scss',
})
export class MisPermisosComponent implements OnInit {
  private readonly toast = inject(NotificacionToastService);
  private readonly pdfService = inject(PermisosPdfService);
  private readonly permisosApi = inject(PermisosApiService);

  readonly busqueda = signal('');
  readonly periodoPreset = signal<PeriodoPreset>('TODOS');
  readonly fechaDesde = signal('');
  readonly fechaHasta = signal('');
  readonly tipoFiltro = signal('');
  readonly estadoFiltro = signal('');

  readonly modalNuevaVisible = signal(false);
  readonly modalFormularioVisible = signal(false);
  readonly solicitudSeleccionada = signal<SolicitudColaborador | null>(null);
  readonly guardandoSolicitud = signal(false);

  // Datos del colaborador leídos exclusivamente desde PostgreSQL (RF-001)
  readonly colaboradorNombre = signal('');
  readonly colaboradorCedula = signal('');
  readonly colaboradorCargo = signal('');
  readonly esNomina = signal(true);

  readonly opcionesCliente = signal<OpcionClienteProyecto[]>([]);
  readonly opcionesLider = signal<OpcionLiderFormulario[]>([]);
  readonly tiposPermisoCatalogo = signal<TipoPermisoCatalogoApi[]>([]);
  readonly opcionesRrhh = signal<RrhhDisponiblePermisoApi[]>([]);
  readonly idUsuarioRrhhForm = signal<number | null>(null);
  readonly selectorRrhhAbierto = signal(false);

  // Buscador interactivo de Cliente / Proyecto y autocompletado consiguiente de Jefe Inmediato
  readonly indiceClienteForm = signal(0);
  readonly indiceLiderForm = signal(0);
  readonly busquedaClienteProyecto = signal('');
  readonly comboboxClienteAbierto = signal(false);

  readonly clienteActualForm = computed<OpcionClienteProyecto | null>(
    () => this.opcionesCliente()[this.indiceClienteForm()] ?? null,
  );

  readonly opcionesClienteFiltradas = computed<OpcionClienteProyecto[]>(() => {
    const termino = this.busquedaClienteProyecto().trim();
    const todas = this.opcionesCliente();
    if (!termino) return todas;

    return todas.filter((opt) =>
      coincideBusquedaInteligente(termino, [
        opt.cliente,
        opt.proyecto,
        opt.etiqueta,
        opt.liderNombre,
      ]),
    );
  });

  readonly valorInputClienteProyecto = computed(() => {
    if (this.comboboxClienteAbierto()) {
      return this.busquedaClienteProyecto();
    }
    return this.clienteActualForm()?.etiqueta ?? '';
  });

  readonly tipoSeleccionado = signal<TipoPermisoOficial>('VACACIONES');
  readonly opcionesHorario: ReadonlyArray<{ codigo: HorarioPermisoOficial; nombre: string }> = [
    { codigo: 'MANANA', nombre: 'Mañana' },
    { codigo: 'TARDE', nombre: 'Tarde' },
    { codigo: 'COMPLETA', nombre: 'Completa' },
    { codigo: 'OTROS', nombre: 'Otros' },
  ];
  readonly horarioSeleccionado = signal<HorarioPermisoOficial>('COMPLETA');
  readonly detalleHorarioForm = signal('Jornada completa (08:30 - 17:30)');
  readonly horaInicioOtrosForm = signal('09:00');
  readonly horaFinOtrosForm = signal('11:00');
  readonly diasDisponiblesNumero = signal(15);
  readonly fechaInicioForm = signal(new Date().toISOString().slice(0, 10));
  readonly fechaFinForm = signal(new Date().toISOString().slice(0, 10));
  readonly fechaRegresoForm = signal(
    calcularSiguienteDiaLaborableIso(new Date().toISOString().slice(0, 10)) ||
      new Date().toISOString().slice(0, 10),
  );
  readonly motivoForm = signal('');
  readonly archivosEvidencia = signal<File[]>([]);
  readonly archivoEvidencia = computed(() => this.archivosEvidencia()[0] ?? null);

  readonly hoyDia = String(new Date().getDate()).padStart(2, '0');
  readonly hoyMes = String(new Date().getMonth() + 1).padStart(2, '0');
  readonly hoyAnio = String(new Date().getFullYear());
  readonly hoyIso = `${this.hoyAnio}-${this.hoyMes}-${this.hoyDia}`;
  readonly fechaHaceSesentaDiasIso = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 60);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  readonly fechaMinimaInicioForm = computed(() =>
    this.permiteFechaRetroactiva(this.tipoSeleccionado())
      ? this.fechaHaceSesentaDiasIso
      : this.hoyIso,
  );

  readonly fechaMinimaRegresoForm = computed(
    () => calcularSiguienteDiaLaborableIso(this.fechaFinForm()) || this.fechaFinForm(),
  );

  readonly horasPorDiaOtrosForm = computed(() => {
    const detalle = this.detalleHorarioForm().trim();
    const match = detalle.match(/(\d{1,2}):(\d{2})\s*(?:[-–—]|a)\s*(\d{1,2}):(\d{2})/i);
    const iniStr = match ? `${match[1].padStart(2, '0')}:${match[2]}` : this.horaInicioOtrosForm();
    const finStr = match ? `${match[3].padStart(2, '0')}:${match[4]}` : this.horaFinOtrosForm();

    const [hIni, mIni] = (iniStr || '09:00').split(':').map(Number);
    const [hFin, mFin] = (finStr || '11:00').split(':').map(Number);
    if (
      Number.isNaN(hIni) ||
      Number.isNaN(mIni) ||
      Number.isNaN(hFin) ||
      Number.isNaN(mFin)
    ) {
      return 0;
    }

    const minInicio = hIni * 60 + mIni;
    const minFin = hFin * 60 + mFin;
    if (minFin <= minInicio) {
      return 0;
    }

    let minutosEfectivos = minFin - minInicio;
    // Si el rango cruza el horario completo de almuerzo (12:30 - 13:30) y supera 4.5h, descontar 60 min de almuerzo
    if (minInicio <= 12 * 60 + 30 && minFin >= 13 * 60 + 30 && minutosEfectivos > 270) {
      minutosEfectivos -= 60;
    }

    const horas = Math.round((minutosEfectivos / 60) * 100) / 100;
    return horas >= 0.5 && horas < 8 ? horas : 0;
  });

  readonly diasCalculadosForm = computed(() => {
    const horario = this.horarioSeleccionado();
    if (horario === 'MANANA' || horario === 'TARDE') {
      return 0.5;
    }
    const diasBase = calcularDiasLaborablesIso(this.fechaInicioForm(), this.fechaFinForm());
    if (horario === 'OTROS') {
      const horasPorDia = this.horasPorDiaOtrosForm();
      return Math.round(((horasPorDia * diasBase) / 8) * 100) / 100;
    }
    return diasBase;
  });

  readonly horasCalculadasForm = computed(() => {
    const horario = this.horarioSeleccionado();
    if (horario === 'MANANA' || horario === 'TARDE') {
      return 4;
    }
    const diasBase = calcularDiasLaborablesIso(this.fechaInicioForm(), this.fechaFinForm());
    if (horario === 'OTROS') {
      return Math.round(this.horasPorDiaOtrosForm() * diasBase * 100) / 100;
    }
    return diasBase * 8;
  });

  readonly excedeSaldoVacacionesForm = computed(
    () =>
      this.tipoSeleccionado() === 'VACACIONES' &&
      this.diasCalculadosForm() > this.diasDisponiblesNumero(),
  );

  // RF-004: Colaborador en nómina con licencia por enfermedad > 1 día requiere certificado médico obligatorio
  readonly requiereCertificadoMedicoObligatorio = computed(
    () =>
      this.esNomina() &&
      this.tipoSeleccionado() === 'LICENCIA_ENFERMEDAD' &&
      this.diasCalculadosForm() > 1,
  );

  private formatearDuracionEnHoras(horas: number): string {
    const minutos = Math.round(horas * 60);
    const horasEnteras = Math.floor(minutos / 60);
    const minutosRestantes = minutos % 60;
    if (horasEnteras === 0) return `${minutosRestantes} minutos`;
    if (minutosRestantes === 0) return `${horasEnteras} ${horasEnteras === 1 ? 'hora' : 'horas'}`;
    return `${horasEnteras} ${horasEnteras === 1 ? 'hora' : 'horas'} y ${minutosRestantes} minutos`;
  }

  readonly textoDuracionForm = computed(() => {
    const jornada = this.horarioSeleccionado();
    if (jornada === 'MANANA' || jornada === 'TARDE') return 'Medio día laborable · 4 horas';
    const dias = calcularDiasLaborablesIso(this.fechaInicioForm(), this.fechaFinForm());
    const horas = this.horasCalculadasForm();
    const textoDias = dias === 1 ? '1 día laborable' : `${dias} días laborables`;
    if (jornada === 'OTROS') return `${this.formatearDuracionEnHoras(horas)} en ${textoDias}`;
    return `${textoDias} · ${this.formatearDuracionEnHoras(horas)}`;
  });

  readonly textoHorasPorDiaOtrosForm = computed(() =>
    this.formatearDuracionEnHoras(this.horasPorDiaOtrosForm()),
  );

  readonly solicitudes = signal<SolicitudColaborador[]>([]);

  readonly kpiDisponibles = signal('0 días');
  readonly kpiEnProceso = computed(
    () =>
      this.solicitudes().filter(
        (s) =>
          s.estadoClase === 'pendiente' ||
          s.estadoClase === 'rrhh' ||
          s.estadoClase === 'observado',
      ).length,
  );
  readonly kpiAprobados = computed(
    () => this.solicitudes().filter((s) => s.estadoClase === 'confirmado').length,
  );
  readonly kpiPorHoras = signal('0 h');

  readonly solicitudesFiltradas = computed(() => {
    const q = this.busqueda();
    const desde = this.fechaDesde();
    const hasta = this.fechaHasta();
    const tipo = this.tipoFiltro();
    const estado = this.estadoFiltro();

    return this.solicitudes().filter((s) => {
      if (!cumpleRangoFechas(s.fechaInicio, s.fechaFin, desde, hasta)) return false;
      if (tipo && s.tipoOficial !== tipo) return false;
      if (estado === 'proceso' && !['pendiente', 'rrhh'].includes(s.estadoClase)) return false;
      if (estado === 'finalizado' && !['confirmado', 'observado', 'rechazado'].includes(s.estadoClase)) return false;
      if (
        !coincideBusquedaInteligente(q, [
          s.codigo,
          s.tipo,
          s.tipoOficial,
          s.cliente,
          s.proyecto,
          s.lider,
          s.tipoLider === 'EXT' ? 'Externo EXT' : 'Interno INT',
          s.fechas,
          s.fechaInicio,
          s.fechaFin,
          s.fechaRegreso,
          s.diasSolicitados,
          s.horasSolicitadas,
          s.duracion,
          s.horario,
          s.estadoTexto,
          s.motivo,
          s.evidencia,
          s.comentarios,
        ])
      ) {
        return false;
      }
      return true;
    });
  });

  constructor() {
    conectarEnlaceSolicitud(item => { this.verFormulario(this.mapearDesdeApi(item)); });
  }

  ngOnInit(): void {
    this.cargarDatosBackend();
  }

  private cargarDatosBackend(): void {
    this.permisosApi.obtenerContexto().subscribe({
      next: (res) => {
        if (!res?.success || !res.data) return;
        const ctx = res.data;

        this.colaboradorNombre.set(ctx.apellidosNombres ?? '');
        this.colaboradorCedula.set(ctx.numeroCedula ?? '');
        this.colaboradorCargo.set(ctx.cargo ?? '');
        this.esNomina.set(ctx.esNomina ?? true);
        this.diasDisponiblesNumero.set(Number(ctx.diasDisponibles ?? 0));
        this.kpiDisponibles.set(`${ctx.diasDisponibles ?? 0} días`);
        this.kpiPorHoras.set(`${ctx.horasAcumuladas ?? 0} h`);

        if (Array.isArray(ctx.tiposPermiso) && ctx.tiposPermiso.length > 0) {
          this.tiposPermisoCatalogo.set(ctx.tiposPermiso);
        }
        if (Array.isArray(ctx.rrhhDisponibles) && ctx.rrhhDisponibles.length > 0) {
          this.opcionesRrhh.set(ctx.rrhhDisponibles);
          const principal =
            ctx.rrhhDisponibles.find((r) => r.esPrincipal) ?? ctx.rrhhDisponibles[0];
          if (principal && !this.idUsuarioRrhhForm()) {
            this.idUsuarioRrhhForm.set(principal.idUsuario);
          }
        }

        if (Array.isArray(ctx.lideresDisponibles)) {
          this.opcionesLider.set(
            ctx.lideresDisponibles.map((l) => ({
              idLider: l.idLider,
              nombre: l.nombre,
              tipo: l.tipo,
              etiqueta: `${l.nombre} (${l.tipo === 'EXT' ? 'Líder Externo' : 'Líder Interno'})`,
            })),
          );
        }

        if (Array.isArray(ctx.proyectosAsignados)) {
          const soloPropios = ctx.proyectosAsignados.filter((p) => p.esAsignacionPropia !== false);
          const opciones = soloPropios.map((p, idx) => {
            const cli = (p.clienteNombre ?? '').trim();
            const proy = (p.proyectoNombre ?? '').trim();
            const etiqueta =
              cli && proy ? `${cli} (${proy})` : proy || cli || `Proyecto #${p.idProyecto}`;

            return {
              indiceOriginal: idx,
              idProyecto: p.idProyecto > 0 ? p.idProyecto : null,
              idCliente: p.idCliente,
              cliente: cli,
              proyecto: proy,
              etiqueta,
              idLider: p.idLider,
              liderNombre: (p.liderNombre ?? '').trim(),
              tipoLider: p.liderTipo,
              esAsignacionPropia: !!p.esAsignacionPropia,
            } satisfies OpcionClienteProyecto;
          });

          this.opcionesCliente.set(opciones);
          if (opciones.length > 0) {
            this.seleccionarClienteForm('0');
          }
        }
      },
      error: (err) => {
        this.toast.error(
          'No se pudo cargar el contexto',
          obtenerMensajeAmigablePermisos(err, 'No pudimos cargar tu información en este momento. Recarga la página e inténtalo nuevamente.'),
        );
      },
    });

    this.permisosApi.obtenerMisPermisos().subscribe({
      next: (res) => {
        if (res?.success && Array.isArray(res.data)) {
          this.solicitudes.set(res.data.map((item) => this.mapearDesdeApi(item)));
        }
      },
      error: (err) => {
        this.toast.error(
          'Error al consultar tus solicitudes',
          obtenerMensajeAmigablePermisos(err, 'No pudimos consultar tus solicitudes en este momento.'),
        );
      },
    });
  }

  private mapearDesdeApi(item: PermisoItemApi): SolicitudColaborador {
    return {
      id: item.id,
      codigo: item.codigo,
      colaborador: item.colaborador,
      cedula: item.cedula,
      cargo: item.cargo,
      diaSolicitud: item.diaSolicitud,
      mesSolicitud: item.mesSolicitud,
      anioSolicitud: item.anioSolicitud,
      tipo: item.tipo,
      tipoOficial: item.tipoOficial,
      motivo: item.motivo,
      fechas: item.fechas,
      fechaInicio: item.fechaInicio,
      fechaFin: item.fechaFin,
      fechaRegreso: item.fechaRegreso,
      fechaAprobacion: item.fechaAprobacion,
      diasSolicitados: item.diasSolicitados,
      horario: item.horario,
      detalleHorario: item.detalleHorario ?? undefined,
      horasSolicitadas: item.horasSolicitadas,
      duracion: item.duracion,
      cliente: item.cliente,
      proyecto: item.proyecto,
      lider: item.liderNombre,
      tipoLider: item.liderTipo,
      metodoLider: item.metodoLider,
      responsableRrhh: item.responsableRrhh ?? undefined,
      evidencia: item.evidenciaNombre ?? null,
      evidenciaUrl: item.tieneEvidencia ? this.permisosApi.obtenerUrlEvidencia(item.id) : null,
      adjuntos: Array.isArray(item.adjuntos) ? item.adjuntos : [],
      aprobadoLider: item.aprobadoLider,
      confirmadoRrhh: item.confirmadoRrhh,
      estadoClase: item.estadoClase,
      estadoTexto: item.estadoTexto,
      comentarios: item.comentarios ?? undefined,
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

  readonly tieneFiltrosActivos = computed(
    () =>
      Boolean(this.busqueda().trim()) ||
      this.periodoPreset() !== 'TODOS' ||
      Boolean(this.fechaDesde()) ||
      Boolean(this.fechaHasta()) ||
      Boolean(this.tipoFiltro()) ||
      Boolean(this.estadoFiltro()),
  );

  limpiarFiltros(): void {
    this.busqueda.set('');
    this.periodoPreset.set('TODOS');
    this.fechaDesde.set('');
    this.fechaHasta.set('');
    this.tipoFiltro.set('');
    this.estadoFiltro.set('');
  }

  obtenerRangoFechasLimpio(item: SolicitudColaborador): string {
    return item.fechaInicio === item.fechaFin
      ? item.fechaInicio
      : `${item.fechaInicio} – ${item.fechaFin}`;
  }

  obtenerEtiquetaHorario(item: SolicitudColaborador): string {
    if (item.horario === 'MANANA') return 'Media jornada · Mañana';
    if (item.horario === 'TARDE') return 'Media jornada · Tarde';
    if (item.horario === 'OTROS') return item.detalleHorario || 'Horario por horas';
    return 'Jornada completa';
  }

  abrirNuevaSolicitud(): void {
    this.archivosEvidencia.set([]);
    this.comboboxClienteAbierto.set(false);
    this.selectorRrhhAbierto.set(false);
    this.busquedaClienteProyecto.set('');
    if (this.opcionesCliente().length === 0) {
      this.cargarDatosBackend();
    }
    this.modalNuevaVisible.set(true);
  }

  abrirBuscadorCliente(): void {
    this.busquedaClienteProyecto.set('');
    this.comboboxClienteAbierto.set(true);
  }

  alEscribirBusquedaCliente(valor: string): void {
    this.busquedaClienteProyecto.set(valor);
    if (!this.comboboxClienteAbierto()) {
      this.comboboxClienteAbierto.set(true);
    }
  }

  cerrarBuscadorClienteConRetardo(): void {
    setTimeout(() => {
      this.comboboxClienteAbierto.set(false);
    this.selectorRrhhAbierto.set(false);
      this.busquedaClienteProyecto.set('');
    }, 150);
  }

  alTeclaBuscadorCliente(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.comboboxClienteAbierto.set(false);
    this.selectorRrhhAbierto.set(false);
      this.busquedaClienteProyecto.set('');
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const primera = this.opcionesClienteFiltradas()[0];
      if (primera) {
        this.elegirOpcionCliente(primera);
      }
    }
  }

  elegirOpcionCliente(opt: OpcionClienteProyecto, event?: MouseEvent): void {
    event?.preventDefault();
    this.seleccionarClienteForm(String(opt.indiceOriginal));
    this.comboboxClienteAbierto.set(false);
    this.selectorRrhhAbierto.set(false);
    this.busquedaClienteProyecto.set('');
  }

  seleccionarClienteForm(indexStr: string): void {
    const idx = Number(indexStr) || 0;
    this.indiceClienteForm.set(idx);
    const clienteOpt = this.opcionesCliente()[idx];
    if (clienteOpt) {
      const liderIdx = this.opcionesLider().findIndex(
        (l) =>
          (clienteOpt.idLider && l.idLider === clienteOpt.idLider) ||
          (clienteOpt.liderNombre && l.nombre === clienteOpt.liderNombre),
      );
      if (liderIdx >= 0) {
        this.indiceLiderForm.set(liderIdx);
      }
    }
  }

  permiteFechaRetroactiva(tipo: string = this.tipoSeleccionado()): boolean {
    const cod = (tipo || '').trim().toUpperCase();
    return (
      cod !== 'VACACIONES' &&
      cod !== 'MATRIMONIO' &&
      cod !== 'MATERNIDAD' &&
      cod !== 'PERMISO_ESTUDIOS'
    );
  }

  cambiarTipoPermisoForm(tipo: TipoPermisoOficial): void {
    this.tipoSeleccionado.set(tipo);
    if (!this.permiteFechaRetroactiva(tipo) && this.fechaInicioForm() < this.hoyIso) {
      this.cambiarFechaInicioForm(this.hoyIso);
    }
  }

  cambiarFechaInicioForm(valor: string): void {
    const minInicio = this.fechaMinimaInicioForm();
    const inicioValido = valor && valor < minInicio ? minInicio : valor;
    if (valor && valor < minInicio) {
      this.toast.warning(
        'Fecha de inicio ajustada',
        'Para este tipo de solicitud la fecha de inicio no puede ser anterior a la permitida.',
      );
    }
    this.fechaInicioForm.set(inicioValido);
    if (
      this.fechaFinForm() < inicioValido ||
      this.horarioSeleccionado() === 'MANANA' ||
      this.horarioSeleccionado() === 'TARDE'
    ) {
      this.fechaFinForm.set(inicioValido);
    }
    const regreso = calcularSiguienteDiaLaborableIso(this.fechaFinForm());
    if (regreso) this.fechaRegresoForm.set(regreso);
  }

  cambiarFechaFinForm(valor: string): void {
    const inicio = this.fechaInicioForm();
    const esMediaJornada =
      this.horarioSeleccionado() === 'MANANA' || this.horarioSeleccionado() === 'TARDE';
    if (esMediaJornada || (valor && valor < inicio)) {
      if (valor && valor < inicio) {
        this.toast.warning(
          'Fecha de fin ajustada',
          'La fecha de finalización no puede ser anterior a la fecha de inicio.',
        );
      }
      this.fechaFinForm.set(inicio);
      const regresoAjustado = calcularSiguienteDiaLaborableIso(inicio);
      if (regresoAjustado) this.fechaRegresoForm.set(regresoAjustado);
      return;
    }
    this.fechaFinForm.set(valor);
    const regreso = calcularSiguienteDiaLaborableIso(valor);
    if (regreso) this.fechaRegresoForm.set(regreso);
  }

  cambiarFechaRegresoForm(valor: string): void {
    const minRegreso = this.fechaMinimaRegresoForm();
    if (valor && valor <= this.fechaFinForm()) {
      this.toast.warning(
        'Fecha de regreso ajustada',
        'La fecha de regreso debe ser posterior a la fecha de finalización.',
      );
      this.fechaRegresoForm.set(minRegreso);
      return;
    }
    this.fechaRegresoForm.set(valor || minRegreso);
  }

  seleccionarHorarioForm(horario: HorarioPermisoOficial): void {
    this.horarioSeleccionado.set(horario);
    if (horario === 'MANANA') {
      this.detalleHorarioForm.set('08:30 - 12:30');
      this.fechaFinForm.set(this.fechaInicioForm());
    } else if (horario === 'TARDE') {
      this.detalleHorarioForm.set('13:30 - 17:30');
      this.fechaFinForm.set(this.fechaInicioForm());
    } else if (horario === 'COMPLETA') {
      this.detalleHorarioForm.set('Jornada completa (08:30 - 17:30)');
    } else {
      this.detalleHorarioForm.set(`${this.horaInicioOtrosForm()} - ${this.horaFinOtrosForm()}`);
      this.fechaFinForm.set(this.fechaInicioForm());
    }
    if (horario === 'MANANA' || horario === 'TARDE' || horario === 'OTROS') {
      const regreso = calcularSiguienteDiaLaborableIso(this.fechaFinForm());
      if (regreso) this.fechaRegresoForm.set(regreso);
    }
  }

  cambiarHoraInicioOtros(valor: string): void {
    const limpio = valor || '09:00';
    this.horaInicioOtrosForm.set(limpio);
    this.detalleHorarioForm.set(`${limpio} - ${this.horaFinOtrosForm()}`);
  }

  cambiarHoraFinOtros(valor: string): void {
    const limpio = valor || '11:00';
    this.horaFinOtrosForm.set(limpio);
    this.detalleHorarioForm.set(`${this.horaInicioOtrosForm()} - ${limpio}`);
  }

  alSeleccionarArchivoEvidencia(event: Event): void {
    const input = event.target as HTMLInputElement;
    const seleccionados = input?.files ? Array.from(input.files) : [];
    if (seleccionados.length === 0) return;

    const permitidas = ['.pdf', '.png', '.jpg', '.jpeg'];
    const maxBytes = 15 * 1024 * 1024; // 15 MB por archivo (certificados médicos, radiografías, etc.)
    const actuales = [...this.archivosEvidencia()];

    for (const file of seleccionados) {
      if (actuales.length >= 5) {
        this.toast.warning(
          'Límite de archivos alcanzado',
          'Puedes adjuntar hasta 5 documentos por solicitud.',
        );
        break;
      }

      const ext = file.name.includes('.')
        ? file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
        : '';
      if (!permitidas.includes(ext)) {
        this.toast.error(
          'Formato no permitido',
          `El archivo "${file.name}" no es válido. Usa PDF, PNG, JPG o JPEG.`,
        );
        continue;
      }

      if (file.size > maxBytes) {
        this.toast.error(
          'Archivo demasiado pesado',
          `El archivo "${file.name}" supera el límite de 15 MB por documento.`,
        );
        continue;
      }

      const yaExiste = actuales.some(
        (f) => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified,
      );
      if (!yaExiste) {
        actuales.push(file);
      }
    }

    this.archivosEvidencia.set(actuales);
    input.value = '';
  }

  quitarArchivoEvidencia(index?: number): void {
    if (index === undefined) {
      this.archivosEvidencia.set([]);
      return;
    }
    this.archivosEvidencia.update((lista) => lista.filter((_, i) => i !== index));
  }

  descargarAdjunto(item: SolicitudColaborador, adjunto?: AdjuntoPermisoApi): void {
    if (!item.id) return;
    const nombreDescarga = adjunto?.nombreOriginal || item.evidencia || `respaldo_${item.codigo}.pdf`;
    this.permisosApi.descargarEvidenciaBlob(item.id, adjunto?.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = nombreDescarga;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: (err) => {
        this.toast.error(
          'No se pudo descargar el adjunto',
          obtenerMensajeAmigablePermisos(err, 'No pudimos descargar el documento adjunto.'),
        );
      },
    });
  }

  obtenerNombreLiderActualForm(): string {
    const cli = this.clienteActualForm();
    if (cli?.liderNombre) {
      return cli.liderNombre;
    }
    return this.opcionesLider()[this.indiceLiderForm()]?.nombre ?? 'Sin jefe asignado en BD';
  }

  obtenerTipoLiderActualForm(): 'INT' | 'EXT' {
    const cli = this.clienteActualForm();
    if (cli?.idLider) {
      return cli.tipoLider;
    }
    return this.opcionesLider()[this.indiceLiderForm()]?.tipo ?? 'INT';
  }

  obtenerIdLiderActualForm(): number | null {
    const cli = this.clienteActualForm();
    if (cli?.idLider) {
      return cli.idLider;
    }
    return this.opcionesLider()[this.indiceLiderForm()]?.idLider ?? null;
  }

  obtenerRrhhActualForm(): RrhhDisponiblePermisoApi | null {
    const lista = this.opcionesRrhh();
    if (lista.length === 0) return null;
    const idSel = this.idUsuarioRrhhForm();
    return (
      lista.find((r) => r.idUsuario === idSel) ??
      lista.find((r) => r.esPrincipal) ??
      lista[0] ??
      null
    );
  }

  obtenerNombreRrhhActualForm(): string {
    return this.obtenerRrhhActualForm()?.nombre || 'Talento Humano';
  }

  obtenerCargoRrhhActualForm(): string {
    const actual = this.obtenerRrhhActualForm();
    if (!actual?.cargo) {
      return 'Confirmación final tras aprobación del líder';
    }
    return actual.cargo;
  }

  alternarSelectorRrhh(): void {
    this.selectorRrhhAbierto.update((v) => !v);
  }

  elegirResponsableRrhh(item: RrhhDisponiblePermisoApi): void {
    this.idUsuarioRrhhForm.set(item.idUsuario);
    this.selectorRrhhAbierto.set(false);
  }

  verFormulario(item: SolicitudColaborador): void {
    this.solicitudSeleccionada.set(item);
    this.modalFormularioVisible.set(true);
  }

  obtenerDatosFormulario(item: SolicitudColaborador): DatosFormularioOficial {
    const etiquetaCliente =
      item.cliente && item.proyecto
        ? `${item.cliente} (${item.proyecto})`
        : item.proyecto || item.cliente;

    return {
      idPermiso: item.id,
      folio: item.codigo,
      diaSolicitud: item.diaSolicitud || this.hoyDia,
      mesSolicitud: item.mesSolicitud || this.hoyMes,
      anioSolicitud: item.anioSolicitud || this.hoyAnio,
      apellidosNombres: item.colaborador || this.colaboradorNombre(),
      numeroCedula: item.cedula || this.colaboradorCedula(),
      cargo: item.cargo || this.colaboradorCargo(),
      cliente: etiquetaCliente,
      jefeInmediato: item.lider,
      tipoPermiso: item.tipoOficial,
      motivos: item.motivo,
      evidenciaNombre: item.evidencia ?? undefined,
      evidenciaUrlDescarga: item.evidenciaUrl ?? undefined,
      fechaInicio: item.fechaInicio,
      fechaFinalizacion: item.fechaFin,
      fechaRegreso: item.fechaRegreso,
      fechaAprobacion: item.fechaAprobacion,
      diasSolicitados: item.diasSolicitados,
      horario: item.horario,
      detalleHorario: item.detalleHorario,
      horasSolicitadas: item.horasSolicitadas,
      aprobacionLider: {
        aprobado: item.aprobadoLider,
        responsable: item.lider,
        metodo:
          item.metodoLider ||
          (item.tipoLider === 'EXT' ? 'Magic Link Externo' : 'Cuenta TMR Líder'),
      },
      aprobacionTalentoHumano: {
        aprobado: item.confirmadoRrhh,
        responsable: item.responsableRrhh || 'Talento Humano',
        fecha: item.confirmadoRrhh ? item.fechaAprobacion : undefined,
      },
      comentarios: item.comentarios,
    };
  }

  async descargarPdfSeleccionado(item: SolicitudColaborador): Promise<void> {
    await this.pdfService.descargarFormularioPdf(this.obtenerDatosFormulario(item));
    this.toast.exito(
      `PDF ${item.codigo} descargado`,
      'Se descargó el Formulario Oficial de Solicitud de Permisos, Licencias y Vacaciones.',
    );
  }

  guardarNuevaSolicitud(): void {
    if (!this.motivoForm().trim()) {
      this.toast.error('Campo requerido', 'Por favor ingresa el motivo del permiso o vacación.');
      return;
    }

    if (!this.permiteFechaRetroactiva() && this.fechaInicioForm() < this.hoyIso) {
      this.toast.error(
        'Fecha de inicio no permitida',
        'Este tipo de permiso debe solicitarse desde la fecha actual en adelante.',
      );
      return;
    }

    if (this.fechaFinForm() < this.fechaInicioForm()) {
      this.toast.error(
        'Rango de fechas inválido',
        'La fecha de finalización no puede ser anterior a la fecha de inicio.',
      );
      return;
    }

    if (this.fechaRegresoForm() <= this.fechaFinForm()) {
      this.toast.error(
        'Fecha de regreso inválida',
        'La fecha de regreso debe ser posterior a la fecha de finalización.',
      );
      return;
    }

    if (this.horarioSeleccionado() === 'OTROS' && this.horasPorDiaOtrosForm() <= 0) {
      this.toast.error(
        'Horario por horas inválido',
        'Revisa el horario: elige horas dentro de la jornada laboral, con la hora de fin posterior al inicio. El permiso debe durar entre 30 minutos y 7 horas y 30 minutos.',
      );
      return;
    }

    if (this.excedeSaldoVacacionesForm()) {
      this.toast.error(
        'Saldo de vacaciones insuficiente',
        `Solicitas ${this.diasCalculadosForm()} día(s), pero tu saldo disponible actual es de ${this.diasDisponiblesNumero()} día(s).`,
      );
      return;
    }

    const clienteOpt = this.clienteActualForm();
    if (!clienteOpt) {
      this.toast.error(
        'Cliente / Proyecto requerido',
        'Selecciona un Cliente / Proyecto activo para continuar.',
      );
      return;
    }

    const archivos = this.archivosEvidencia();
    if (this.requiereCertificadoMedicoObligatorio() && archivos.length === 0) {
      this.toast.error(
        'Certificado médico obligatorio',
        'Para licencias por enfermedad mayores a 1 día es necesario adjuntar el certificado médico.',
      );
      return;
    }

    this.guardandoSolicitud.set(true);

    this.permisosApi
      .crearSolicitud(
        {
          idProyecto: clienteOpt.idProyecto,
          idCliente: clienteOpt.idCliente,
          idLider: this.obtenerIdLiderActualForm(),
          tipoOficial: this.tipoSeleccionado(),
          fechaInicio: this.fechaInicioForm(),
          fechaFin: this.fechaFinForm(),
          fechaRegreso: this.fechaRegresoForm(),
          horario: this.horarioSeleccionado(),
          detalleHorario: this.detalleHorarioForm(),
          totalDias: this.diasCalculadosForm(),
          totalHoras: this.horasCalculadasForm(),
          motivo: this.motivoForm().trim(),
          idUsuarioRrhh: this.obtenerRrhhActualForm()?.idUsuario ?? null,
        },
        archivos,
      )
      .subscribe({
        next: (res) => {
          this.guardandoSolicitud.set(false);
          if (!res?.success || !res.data) {
            this.toast.error(
              'No se pudo registrar la solicitud',
              res?.message || 'El servidor no devolvió los datos de la solicitud.',
            );
            return;
          }

          const nuevo = this.mapearDesdeApi(res.data);
          this.solicitudes.update((lista) => [nuevo, ...lista]);
          this.archivosEvidencia.set([]);
          this.motivoForm.set('');
          this.modalNuevaVisible.set(false);
          this.cargarDatosBackend();
          if (res.data.avisoNotificacion) {
            this.toast.warning(`Solicitud ${nuevo.codigo} guardada`, res.data.avisoNotificacion);
            return;
          }
          this.toast.exito(
            `Solicitud ${nuevo.codigo} registrada`,
            archivos.length > 0
              ? `Tu solicitud y ${archivos.length === 1 ? 'el documento de respaldo quedaron guardados' : 'los ' + archivos.length + ' documentos de respaldo quedaron guardados'} y los avisos quedaron pendientes de envío.`
              : 'Tu solicitud fue registrada. Los avisos quedaron pendientes de envío.',
          );
        },
        error: (err) => {
          this.guardandoSolicitud.set(false);
          void err;



          this.toast.error(
            'No pudimos guardar tu solicitud',
            obtenerMensajeAmigablePermisos(err, 'No pudimos guardar tu solicitud en este momento. Por favor inténtalo nuevamente.'),
          );
        },
      });
  }
}
