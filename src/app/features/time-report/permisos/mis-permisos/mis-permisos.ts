import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
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
  calcularDiasLaborablesIso,
  calcularRangoPreset,
  calcularSiguienteDiaLaborableIso,
  coincideBusquedaInteligente,
  cumpleRangoFechas,
  isoADmy,
} from '../filtro-fechas.util';
import { PermisosPdfService } from '../permisos-pdf.service';
import {
  PermisoItemApi,
  PermisosApiService,
  TipoPermisoCatalogoApi,
} from '../permisos-api.service';

export interface SolicitudColaboradorMock {
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
    RouterLink,
    HeaderComponent,
    TarjetaResumenComponent,
    ModalBase,
    FormularioPermisoOficialComponent,
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
  readonly solicitudSeleccionada = signal<SolicitudColaboradorMock | null>(null);
  readonly guardandoSolicitud = signal(false);

  // Datos del colaborador leídos exclusivamente desde PostgreSQL (RF-001)
  readonly colaboradorNombre = signal('');
  readonly colaboradorCedula = signal('');
  readonly colaboradorCargo = signal('');
  readonly esNomina = signal(true);

  readonly opcionesCliente = signal<OpcionClienteProyecto[]>([]);
  readonly opcionesLider = signal<OpcionLiderFormulario[]>([]);
  readonly tiposPermisoCatalogo = signal<TipoPermisoCatalogoApi[]>([]);

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
  readonly horarioSeleccionado = signal<HorarioPermisoOficial>('COMPLETA');
  readonly detalleHorarioForm = signal('Jornada completa (08:30 - 17:30)');
  readonly fechaInicioForm = signal(new Date().toISOString().slice(0, 10));
  readonly fechaFinForm = signal(new Date().toISOString().slice(0, 10));
  readonly fechaRegresoForm = signal(
    calcularSiguienteDiaLaborableIso(new Date().toISOString().slice(0, 10)) ||
      new Date().toISOString().slice(0, 10),
  );
  readonly motivoForm = signal('');
  readonly archivoEvidencia = signal<File | null>(null);

  readonly hoyDia = String(new Date().getDate()).padStart(2, '0');
  readonly hoyMes = String(new Date().getMonth() + 1).padStart(2, '0');
  readonly hoyAnio = String(new Date().getFullYear());

  readonly diasCalculadosForm = computed(() => {
    const horario = this.horarioSeleccionado();
    if (horario === 'MANANA' || horario === 'TARDE') {
      return 0.5;
    }
    return calcularDiasLaborablesIso(this.fechaInicioForm(), this.fechaFinForm());
  });

  readonly horasCalculadasForm = computed(() => {
    const horario = this.horarioSeleccionado();
    if (horario === 'MANANA' || horario === 'TARDE') {
      return 4;
    }
    return this.diasCalculadosForm() * 8;
  });

  // RF-004: Colaborador en nómina con licencia por enfermedad > 1 día requiere certificado médico obligatorio
  readonly requiereCertificadoMedicoObligatorio = computed(
    () =>
      this.esNomina() &&
      this.tipoSeleccionado() === 'LICENCIA_ENFERMEDAD' &&
      this.diasCalculadosForm() > 1,
  );

  readonly textoDiasForm = computed(() => {
    const d = this.diasCalculadosForm();
    return d === 1 ? '1 día laborable' : `${d} días laborables`;
  });

  readonly textoHorasForm = computed(() => `${this.horasCalculadasForm()} horas`);

  readonly solicitudes = signal<SolicitudColaboradorMock[]>([]);

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
      if (estado && s.estadoClase !== estado) return false;
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
        this.kpiDisponibles.set(`${ctx.diasDisponibles ?? 0} días`);
        this.kpiPorHoras.set(`${ctx.horasAcumuladas ?? 0} h`);

        if (Array.isArray(ctx.tiposPermiso) && ctx.tiposPermiso.length > 0) {
          this.tiposPermisoCatalogo.set(ctx.tiposPermiso);
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
          const opciones = ctx.proyectosAsignados.map((p, idx) => {
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
          err?.error?.message || 'Verifica tu sesión o la conexión con el backend.',
        );
      },
    });

    this.permisosApi.obtenerMisPermisos().subscribe({
      next: (res) => {
        if (res?.success && Array.isArray(res.data)) {
          this.solicitudes.set(res.data.map((item) => this.mapearApiAMock(item)));
        }
      },
      error: (err) => {
        this.toast.error(
          'Error al consultar tus solicitudes',
          err?.error?.message || 'No se pudieron obtener tus solicitudes desde el servidor.',
        );
      },
    });
  }

  private mapearApiAMock(item: PermisoItemApi): SolicitudColaboradorMock {
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

  abrirNuevaSolicitud(): void {
    this.archivoEvidencia.set(null);
    this.comboboxClienteAbierto.set(false);
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
      this.busquedaClienteProyecto.set('');
    }, 150);
  }

  alTeclaBuscadorCliente(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.comboboxClienteAbierto.set(false);
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

  cambiarFechaInicioForm(valor: string): void {
    this.fechaInicioForm.set(valor);
    if (this.fechaFinForm() < valor) {
      this.fechaFinForm.set(valor);
    }
    const regreso = calcularSiguienteDiaLaborableIso(this.fechaFinForm());
    if (regreso) this.fechaRegresoForm.set(regreso);
  }

  cambiarFechaFinForm(valor: string): void {
    this.fechaFinForm.set(valor);
    if (valor < this.fechaInicioForm()) {
      this.fechaInicioForm.set(valor);
    }
    const regreso = calcularSiguienteDiaLaborableIso(valor);
    if (regreso) this.fechaRegresoForm.set(regreso);
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
      this.detalleHorarioForm.set('Horario específico');
    }
  }

  alSeleccionarArchivoEvidencia(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0] ?? null;
    if (!file) return;

    const ext = file.name.includes('.')
      ? file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
      : '';
    const permitidas = ['.pdf', '.png', '.jpg', '.jpeg'];
    if (!permitidas.includes(ext)) {
      this.toast.error(
        'Formato no permitido',
        'Solo se aceptan archivos PDF, PNG, JPG o JPEG (RNF-003).',
      );
      input.value = '';
      return;
    }

    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      this.toast.error('Archivo demasiado grande', 'El tamaño máximo permitido es 5 MB (RNF-003).');
      input.value = '';
      return;
    }

    this.archivoEvidencia.set(file);
  }

  quitarArchivoEvidencia(): void {
    this.archivoEvidencia.set(null);
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

  verFormulario(item: SolicitudColaboradorMock): void {
    this.solicitudSeleccionada.set(item);
    this.modalFormularioVisible.set(true);
  }

  obtenerDatosFormulario(item: SolicitudColaboradorMock): DatosFormularioOficial {
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

  obtenerDatosBorradorFormulario(): DatosFormularioOficial {
    const clienteOpt = this.clienteActualForm();
    const liderNombre = this.obtenerNombreLiderActualForm();
    const liderTipo = this.obtenerTipoLiderActualForm();

    return {
      folio: `PER-${this.hoyAnio}-NUEVO`,
      diaSolicitud: this.hoyDia,
      mesSolicitud: this.hoyMes,
      anioSolicitud: this.hoyAnio,
      apellidosNombres: this.colaboradorNombre(),
      numeroCedula: this.colaboradorCedula(),
      cargo: this.colaboradorCargo(),
      cliente: clienteOpt?.etiqueta ?? '',
      jefeInmediato: liderNombre,
      tipoPermiso: this.tipoSeleccionado(),
      motivos: this.motivoForm(),
      evidenciaNombre: this.archivoEvidencia()?.name,
      fechaInicio: isoADmy(this.fechaInicioForm()),
      fechaFinalizacion: isoADmy(this.fechaFinForm()),
      fechaRegreso: isoADmy(this.fechaRegresoForm()),
      fechaAprobacion: 'Pendiente',
      diasSolicitados: this.textoDiasForm(),
      horario: this.horarioSeleccionado(),
      detalleHorario: this.detalleHorarioForm(),
      horasSolicitadas: this.textoHorasForm(),
      aprobacionLider: {
        aprobado: false,
        responsable: liderNombre,
        metodo: liderTipo === 'EXT' ? 'Magic Link Externo' : 'Cuenta TMR Líder',
      },
      aprobacionTalentoHumano: {
        aprobado: false,
        responsable: 'Talento Humano',
      },
      comentarios: 'En espera de aprobación del Jefe Inmediato y confirmación de Talento Humano.',
    };
  }

  async descargarPdfSeleccionado(item: SolicitudColaboradorMock): Promise<void> {
    await this.pdfService.descargarFormularioPdf(this.obtenerDatosFormulario(item));
    this.toast.exito(
      `PDF ${item.codigo} descargado`,
      'Se descargó el Formulario Oficial de Solicitud de Permisos, Licencias y Vacaciones.',
    );
  }

  async descargarVistaPreviaNuevaSolicitud(): Promise<void> {
    await this.pdfService.descargarFormularioPdf(this.obtenerDatosBorradorFormulario());
    this.toast.exito(
      'Vista previa PDF descargada',
      'Se generó el documento oficial PDF con los datos ingresados en el formulario.',
    );
  }

  guardarNuevaSolicitud(): void {
    if (!this.motivoForm().trim()) {
      this.toast.error('Campo requerido', 'Por favor ingresa el motivo del permiso o vacación.');
      return;
    }

    const clienteOpt = this.clienteActualForm();
    if (!clienteOpt) {
      this.toast.error(
        'Cliente / Proyecto requerido',
        'Selecciona un Cliente / Proyecto activo desde la base de datos.',
      );
      return;
    }

    const archivo = this.archivoEvidencia();
    if (this.requiereCertificadoMedicoObligatorio() && !archivo) {
      this.toast.error(
        'Certificado médico obligatorio',
        'Para colaboradores en nómina con licencia por enfermedad mayor a 1 día debes adjuntar el certificado médico (RF-004).',
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
        },
        archivo,
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

          const nuevo = this.mapearApiAMock(res.data);
          this.solicitudes.update((lista) => [nuevo, ...lista]);
          this.archivoEvidencia.set(null);
          this.motivoForm.set('');
          this.modalNuevaVisible.set(false);
          this.toast.exito(
            `Solicitud ${nuevo.codigo} registrada`,
            archivo
              ? 'Tu solicitud y el adjunto en MinIO fueron guardados, y se enviaron las notificaciones correspondientes.'
              : 'Tu solicitud fue registrada y notificada a tu Jefe Inmediato y a Talento Humano.',
          );
        },
        error: (err) => {
          this.guardandoSolicitud.set(false);
          const detalle =
            err?.error?.message ||
            (Array.isArray(err?.error?.errors) && err.error.errors[0]) ||
            'Error al comunicarse con el servidor o el almacenamiento MinIO.';
          this.toast.error('No se pudo registrar la solicitud', detalle);
        },
      });
  }
}
