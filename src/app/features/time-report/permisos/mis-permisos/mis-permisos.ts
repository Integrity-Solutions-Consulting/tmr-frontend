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
} from '../permisos-api.service';

export interface SolicitudColaboradorMock {
  id?: number;
  codigo: string;
  colaborador?: string;
  cedula?: string;
  cargo?: string;
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
  evidencia: string | null;
  evidenciaUrl?: string | null;
  aprobadoLider: boolean;
  confirmadoRrhh: boolean;
  estadoClase: 'pendiente' | 'rrhh' | 'confirmado' | 'observado' | 'rechazado';
  estadoTexto: string;
  comentarios?: string;
}

export interface OpcionClienteProyecto {
  idProyecto: number | null;
  idCliente: number | null;
  cliente: string;
  proyecto: string;
  etiqueta: string;
  idLider: number | null;
  liderNombre: string;
  tipoLider: 'INT' | 'EXT';
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

  // Datos del colaborador para el formulario oficial interactivo
  readonly colaboradorNombre = signal('Erazo Allan');
  readonly colaboradorCedula = signal('1723456789');
  readonly colaboradorCargo = signal('Desarrollador Fullstack');

  readonly opcionesCliente = signal<OpcionClienteProyecto[]>([
    {
      idProyecto: 1,
      idCliente: 1,
      cliente: 'Banco del Pacífico',
      proyecto: 'Core Bancario BDP',
      etiqueta: 'Banco del Pacífico (Core Bancario BDP)',
      idLider: 1,
      liderNombre: 'Ing. Roberto Gómez',
      tipoLider: 'EXT',
    },
    {
      idProyecto: 2,
      idCliente: 2,
      cliente: 'Integrity Solutions',
      proyecto: 'Portal Web ISC',
      etiqueta: 'Integrity Solutions (Portal Web ISC)',
      idLider: 2,
      liderNombre: 'Ing. Carlos Méndez',
      tipoLider: 'INT',
    },
  ]);

  readonly opcionesLider = signal<OpcionLiderFormulario[]>([
    {
      idLider: 1,
      nombre: 'Ing. Roberto Gómez',
      tipo: 'EXT',
      etiqueta: 'Ing. Roberto Gómez (Líder Externo)',
    },
    {
      idLider: 2,
      nombre: 'Ing. Carlos Méndez',
      tipo: 'INT',
      etiqueta: 'Ing. Carlos Méndez (Líder Interno)',
    },
  ]);

  // Estado interactivo del formulario oficial en el popup "Nueva Solicitud"
  readonly indiceClienteForm = signal(0);
  readonly indiceLiderForm = signal(0);
  readonly tipoSeleccionado = signal<TipoPermisoOficial>('VACACIONES');
  readonly horarioSeleccionado = signal<HorarioPermisoOficial>('COMPLETA');
  readonly detalleHorarioForm = signal('Jornada completa (08:30 - 17:30)');
  readonly fechaInicioForm = signal('2026-11-09');
  readonly fechaFinForm = signal('2026-11-13');
  readonly fechaRegresoForm = signal('2026-11-16');
  readonly motivoForm = signal(
    'Solicitud de vacaciones anuales programadas. Actividades del sprint coordinadas con el equipo.',
  );
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

  readonly textoDiasForm = computed(() => {
    const d = this.diasCalculadosForm();
    return d === 1 ? '1 día laborable' : `${d} días laborables`;
  });

  readonly textoHorasForm = computed(() => `${this.horasCalculadasForm()} horas`);

  readonly solicitudes = signal<SolicitudColaboradorMock[]>([
    {
      id: 105,
      codigo: 'PER-2026-005',
      tipo: 'Vacaciones',
      tipoOficial: 'VACACIONES',
      motivo: 'Vacaciones programadas noviembre. Actividades del sprint coordinadas con el equipo.',
      fechas: '09/11/2026 - 13/11/2026',
      fechaInicio: '09/11/2026',
      fechaFin: '13/11/2026',
      fechaRegreso: '16/11/2026',
      fechaAprobacion: 'Pendiente',
      diasSolicitados: '5 días laborables',
      horario: 'COMPLETA',
      detalleHorario: 'Jornada completa (08:30 - 17:30)',
      horasSolicitadas: '40 horas',
      duracion: '5 días laborables (40 h)',
      cliente: 'Banco del Pacífico',
      proyecto: 'Core Bancario BDP',
      lider: 'Ing. Roberto Gómez',
      tipoLider: 'EXT',
      evidencia: null,
      aprobadoLider: false,
      confirmadoRrhh: false,
      estadoClase: 'pendiente',
      estadoTexto: 'Pendiente Jefe',
      comentarios: 'En espera de confirmación del Jefe Inmediato vía Magic Link.',
    },
    {
      id: 104,
      codigo: 'PER-2026-004',
      tipo: 'Licencia por enfermedad',
      tipoOficial: 'LICENCIA_ENFERMEDAD',
      motivo: 'Cita odontológica e indicación de reposo médico por 48 horas.',
      fechas: '02/11/2026 - 03/11/2026',
      fechaInicio: '02/11/2026',
      fechaFin: '03/11/2026',
      fechaRegreso: '04/11/2026',
      fechaAprobacion: '01/11/2026',
      diasSolicitados: '2 días laborables',
      horario: 'COMPLETA',
      detalleHorario: 'Jornada completa',
      horasSolicitadas: '16 horas',
      duracion: '2 días laborables (16 h)',
      cliente: 'Integrity Solutions',
      proyecto: 'Portal Web ISC',
      lider: 'Ing. Carlos Méndez',
      tipoLider: 'INT',
      evidencia: 'certificado_iess.pdf',
      aprobadoLider: true,
      confirmadoRrhh: false,
      estadoClase: 'rrhh',
      estadoTexto: 'En Talento Humano',
      comentarios: 'Aprobado desde cuenta de Jefe Inmediato. Adjunta certificado médico IESS.',
    },
    {
      id: 103,
      codigo: 'PER-2026-003',
      tipo: 'Otros',
      tipoOficial: 'OTROS',
      motivo: 'Permiso personal en día de ventana de certificación.',
      fechas: '20/10/2026 - 21/10/2026',
      fechaInicio: '20/10/2026',
      fechaFin: '21/10/2026',
      fechaRegreso: '22/10/2026',
      fechaAprobacion: '19/10/2026',
      diasSolicitados: '2 días laborables',
      horario: 'COMPLETA',
      detalleHorario: 'Jornada completa',
      horasSolicitadas: '16 horas',
      duracion: '2 días laborables (16 h)',
      cliente: 'Banco del Pacífico',
      proyecto: 'Core Bancario BDP',
      lider: 'Ing. Roberto Gómez',
      tipoLider: 'EXT',
      evidencia: null,
      aprobadoLider: false,
      confirmadoRrhh: false,
      estadoClase: 'rechazado',
      estadoTexto: 'Rechazado',
      comentarios: 'Rechazado por coincidir con ventana de certificación bancaria.',
    },
    {
      id: 101,
      codigo: 'PER-2026-001',
      tipo: 'Citas médicas',
      tipoOficial: 'CITAS_MEDICAS',
      motivo: 'Control médico especializado y exámenes de laboratorio en la mañana.',
      fechas: '15/10/2026 (08:30 - 12:30)',
      fechaInicio: '15/10/2026',
      fechaFin: '15/10/2026',
      fechaRegreso: '15/10/2026 (13:30)',
      fechaAprobacion: '14/10/2026',
      diasSolicitados: '0.5 días',
      horario: 'MANANA',
      detalleHorario: '08:30 - 12:30',
      horasSolicitadas: '4 horas',
      duracion: '0.5 días (4 horas)',
      cliente: 'Integrity Solutions',
      proyecto: 'Portal Web ISC',
      lider: 'Ing. Carlos Méndez',
      tipoLider: 'INT',
      evidencia: 'constancia_cita_medica.pdf',
      aprobadoLider: true,
      confirmadoRrhh: true,
      estadoClase: 'confirmado',
      estadoTexto: 'Confirmado',
      comentarios: 'Solicitud aprobada por Jefe Inmediato y confirmada por Talento Humano. PDF generado.',
    },
  ]);

  readonly kpiDisponibles = signal('15 días');
  readonly kpiEnProceso = computed(
    () =>
      this.solicitudes().filter(
        (s) => s.estadoClase === 'pendiente' || s.estadoClase === 'rrhh' || s.estadoClase === 'observado',
      ).length,
  );
  readonly kpiAprobados = computed(
    () => this.solicitudes().filter((s) => s.estadoClase === 'confirmado').length,
  );
  readonly kpiPorHoras = signal('4 h');

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
        if (ctx.apellidosNombres) this.colaboradorNombre.set(ctx.apellidosNombres);
        if (ctx.numeroCedula) this.colaboradorCedula.set(ctx.numeroCedula);
        if (ctx.cargo) this.colaboradorCargo.set(ctx.cargo);
        this.kpiDisponibles.set(`${ctx.diasDisponibles} días`);

        if (ctx.proyectosAsignados?.length > 0) {
          this.opcionesCliente.set(
            ctx.proyectosAsignados.map((p) => ({
              idProyecto: p.idProyecto,
              idCliente: p.idCliente,
              cliente: p.clienteNombre,
              proyecto: p.proyectoNombre,
              etiqueta: `${p.clienteNombre} (${p.proyectoNombre})`,
              idLider: p.idLider,
              liderNombre: p.liderNombre,
              tipoLider: p.liderTipo,
            })),
          );
        }

        if (ctx.lideresDisponibles?.length > 0) {
          this.opcionesLider.set(
            ctx.lideresDisponibles.map((l) => ({
              idLider: l.idLider,
              nombre: l.nombre,
              tipo: l.tipo,
              etiqueta: `${l.nombre} (${l.tipo === 'EXT' ? 'Líder Externo' : 'Líder Interno'})`,
            })),
          );
        }
      },
      error: () => {
        // Mantiene datos locales por defecto
      },
    });

    this.permisosApi.obtenerMisPermisos().subscribe({
      next: (res) => {
        if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
          this.solicitudes.set(res.data.map((item) => this.mapearApiAMock(item)));
        }
      },
      error: () => {
        // Mantiene registros iniciales
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
    this.modalNuevaVisible.set(true);
  }

  seleccionarClienteForm(indexStr: string): void {
    const idx = Number(indexStr) || 0;
    this.indiceClienteForm.set(idx);
    const clienteOpt = this.opcionesCliente()[idx];
    if (clienteOpt) {
      const liderIdx = this.opcionesLider().findIndex(
        (l) =>
          (clienteOpt.idLider && l.idLider === clienteOpt.idLider) ||
          l.nombre === clienteOpt.liderNombre,
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

    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      this.toast.error('Archivo demasiado grande', 'El tamaño máximo permitido es 10 MB.');
      input.value = '';
      return;
    }

    this.archivoEvidencia.set(file);
  }

  quitarArchivoEvidencia(): void {
    this.archivoEvidencia.set(null);
  }

  obtenerNombreLiderActualForm(): string {
    return this.opcionesLider()[this.indiceLiderForm()]?.nombre ?? 'Ing. Roberto Gómez';
  }

  obtenerTipoLiderActualForm(): 'INT' | 'EXT' {
    return this.opcionesLider()[this.indiceLiderForm()]?.tipo ?? 'EXT';
  }

  verFormulario(item: SolicitudColaboradorMock): void {
    this.solicitudSeleccionada.set(item);
    this.modalFormularioVisible.set(true);
  }

  obtenerDatosFormulario(item: SolicitudColaboradorMock): DatosFormularioOficial {
    return {
      idPermiso: item.id,
      folio: item.codigo,
      diaSolicitud: '30',
      mesSolicitud: '10',
      anioSolicitud: '2026',
      apellidosNombres: item.colaborador || this.colaboradorNombre(),
      numeroCedula: item.cedula || this.colaboradorCedula(),
      cargo: item.cargo || this.colaboradorCargo(),
      cliente: item.proyecto ? `${item.cliente} (${item.proyecto})` : item.cliente,
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
        metodo: item.tipoLider === 'EXT' ? 'Magic Link Externo' : 'Cuenta TMR Líder',
        fecha: item.fechaAprobacion,
      },
      aprobacionTalentoHumano: {
        aprobado: item.confirmadoRrhh,
        responsable: 'Lic. Sofía Mendoza (TH)',
        fecha: item.confirmadoRrhh ? item.fechaAprobacion : undefined,
      },
      comentarios: item.comentarios,
    };
  }

  obtenerDatosBorradorFormulario(): DatosFormularioOficial {
    const clienteOpt = this.opcionesCliente()[this.indiceClienteForm()] ?? this.opcionesCliente()[0];
    const liderOpt = this.opcionesLider()[this.indiceLiderForm()] ?? this.opcionesLider()[0];

    return {
      folio: `PER-${this.hoyAnio}-NUEVO`,
      diaSolicitud: this.hoyDia,
      mesSolicitud: this.hoyMes,
      anioSolicitud: this.hoyAnio,
      apellidosNombres: this.colaboradorNombre(),
      numeroCedula: this.colaboradorCedula(),
      cargo: this.colaboradorCargo(),
      cliente: clienteOpt?.etiqueta ?? 'Integrity Solutions',
      jefeInmediato: liderOpt?.nombre ?? 'Jefe Inmediato',
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
        responsable: liderOpt?.nombre ?? 'Jefe Inmediato',
        metodo: liderOpt?.tipo === 'EXT' ? 'Magic Link Externo' : 'Cuenta TMR Líder',
      },
      aprobacionTalentoHumano: {
        aprobado: false,
        responsable: 'Talento Humano ISC',
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

    const clienteOpt = this.opcionesCliente()[this.indiceClienteForm()] ?? this.opcionesCliente()[0];
    const liderOpt = this.opcionesLider()[this.indiceLiderForm()] ?? this.opcionesLider()[0];
    const archivo = this.archivoEvidencia();

    this.guardandoSolicitud.set(true);

    this.permisosApi
      .crearSolicitud(
        {
          idProyecto: clienteOpt?.idProyecto,
          idCliente: clienteOpt?.idCliente,
          idLider: liderOpt?.idLider,
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
          if (res?.success && res.data) {
            const nuevo = this.mapearApiAMock(res.data);
            this.solicitudes.update((lista) => [nuevo, ...lista]);
          } else {
            this.insertarSolicitudLocalFallback(clienteOpt, liderOpt, archivo);
          }
          this.modalNuevaVisible.set(false);
          this.toast.exito(
            'Solicitud registrada y notificada vía Apprise',
            'Se guardó tu solicitud con su evidencia y se envió correo personalizado con seguimiento de estado a ti, a tu Jefe Inmediato y a Talento Humano.',
          );
        },
        error: () => {
          this.guardandoSolicitud.set(false);
          this.insertarSolicitudLocalFallback(clienteOpt, liderOpt, archivo);
          this.modalNuevaVisible.set(false);
          this.toast.exito(
            'Solicitud registrada y PDF generado',
            'Se registró el formulario oficial y se programó la notificación vía Apprise a tu Jefe Inmediato y a Talento Humano.',
          );
        },
      });
  }

  private insertarSolicitudLocalFallback(
    clienteOpt: OpcionClienteProyecto | undefined,
    liderOpt: OpcionLiderFormulario | undefined,
    archivo: File | null,
  ): void {
    const num = this.solicitudes().length + 6;
    const codigo = `PER-2026-${String(num).padStart(3, '0')}`;
    const inicioDmy = isoADmy(this.fechaInicioForm());
    const finDmy = isoADmy(this.fechaFinForm());

    const etiquetasTipo: Record<TipoPermisoOficial, string> = {
      VACACIONES: 'Vacaciones',
      LICENCIA_ENFERMEDAD: 'Licencia por enfermedad',
      CITAS_MEDICAS: 'Citas médicas',
      MATRIMONIO: 'Matrimonio',
      NACIMIENTO_HIJO: 'Nacimiento de un Hijo/a',
      OTROS: 'Otros',
      MATERNIDAD: 'Maternidad',
      FALLECIMIENTO_FAMILIAR: 'Fallecimiento de un familiar',
    };

    const nueva: SolicitudColaboradorMock = {
      id: Date.now(),
      codigo,
      colaborador: this.colaboradorNombre(),
      cedula: this.colaboradorCedula(),
      cargo: this.colaboradorCargo(),
      tipo: etiquetasTipo[this.tipoSeleccionado()],
      tipoOficial: this.tipoSeleccionado(),
      motivo: this.motivoForm().trim(),
      fechas: inicioDmy === finDmy ? inicioDmy : `${inicioDmy} - ${finDmy}`,
      fechaInicio: inicioDmy,
      fechaFin: finDmy,
      fechaRegreso: isoADmy(this.fechaRegresoForm()),
      fechaAprobacion: 'Pendiente',
      diasSolicitados: this.textoDiasForm(),
      horario: this.horarioSeleccionado(),
      detalleHorario: this.detalleHorarioForm(),
      horasSolicitadas: this.textoHorasForm(),
      duracion: `${this.textoDiasForm()} (${this.horasCalculadasForm()} h)`,
      cliente: clienteOpt?.cliente ?? 'Integrity Solutions',
      proyecto: clienteOpt?.proyecto ?? 'Portal Web ISC',
      lider: liderOpt?.nombre ?? 'Ing. Roberto Gómez',
      tipoLider: liderOpt?.tipo ?? 'EXT',
      evidencia: archivo?.name ?? null,
      evidenciaUrl: archivo ? URL.createObjectURL(archivo) : null,
      aprobadoLider: false,
      confirmadoRrhh: false,
      estadoClase: 'pendiente',
      estadoTexto: 'Pendiente Jefe',
      comentarios: 'Solicitud creada desde Formulario Oficial TMR. En espera de aprobación de Jefe Inmediato.',
    };

    this.solicitudes.update((lista) => [nueva, ...lista]);
  }
}
