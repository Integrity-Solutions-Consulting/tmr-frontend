import { MatMenuModule } from '@angular/material/menu';
import { descargarLibroPermisos, type LibroPermisos } from '../libros-permisos';
import { exportarReportePdf, ReporteTabularConfig } from '../../../../shared/utils/reporte-export.utils';
import { ResumenSolicitudComponent } from '../resumen-solicitud/resumen-solicitud';
import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { PaginacionComponent } from '../../../../shared/components/paginacion/paginacion.component';
import { observarListadoPaginado } from '../listado-paginado.util';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { TarjetaResumenComponent } from '../../../../shared/components/tarjeta-resumen/tarjeta-resumen.component';
import { ModalBase } from '../../../../shared/components/modal-base/modal-base';
import { NotificacionToastService } from '../../../../shared/services/notificacion-toast.service';
import {
  DescargaCanceladaError,
  DescargaProgresoService,
} from '../../../../shared/services/descarga-progreso.service';
import {
  fechaArchivo,
} from '../../../../shared/utils/reporte-export.utils';
import {
  DatosFormularioOficial,
  HorarioPermisoOficial,
  TipoPermisoOficial,
} from '../formulario-permiso-oficial/formulario-permiso-oficial';
import {
  calcularRangoPreset,
  PeriodoPreset,
} from '../filtro-fechas.util';
import { PermisosPdfService } from '../permisos-pdf.service';
import {
  AdjuntoPermisoApi,
  PermisoItemApi,
  PermisosApiService,
  ResumenListadoPermisosApi,
  obtenerMensajeAmigablePermisos,
} from '../permisos-api.service';

export interface SolicitudGerencia {
  id: number;
  folio: string;
  anio: string;
  fechaSolicitud: string;
  diaSolicitud?: string;
  mesSolicitud?: string;
  colaborador: string;
  cedula: string;
  cargo: string;
  area: string;
  cliente: string;
  proyecto: string;
  liderNombre: string;
  liderTipo: 'INT' | 'EXT';
  responsableRrhh?: string;
  tipo: string;
  tipoOficial: TipoPermisoOficial;
  fechas: string;
  fechaInicio: string;
  fechaFin: string;
  fechaRegreso: string;
  fechaAprobacion: string;
  diasSolicitados: string;
  descuentaVacaciones?: boolean;
  totalDiasNumero: number;
  horario: HorarioPermisoOficial;
  detalleHorario?: string;
  horasSolicitadas: string;
  totalHorasNumero: number;
  motivo: string;
  adjuntos?: AdjuntoPermisoApi[];
  evidencia?: string;
  evidenciaUrl?: string;
  aprobadoLider: boolean;
  metodoLider: string;
  fechaAprobacionLider?: string;
  comentarioLider?: string;
  confirmadoRrhh: boolean;
  fechaConfirmacionRrhh?: string;
  observacionRrhh?: string;
  impactoTimeReport: string;
  estadoClase: 'confirmado' | 'pendiente' | 'rrhh' | 'observado' | 'rechazado';
  estadoTexto: string;
  comentarios?: string;
}

@Component({
  selector: 'app-permisos-gerencia',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HeaderComponent,
    TarjetaResumenComponent,
    ModalBase,
    MatMenuModule,
    ResumenSolicitudComponent,
    PaginacionComponent,
  ],
  templateUrl: './permisos-gerencia.html',
  styleUrl: './permisos-gerencia.scss',
})
export class PermisosGerenciaComponent {
  private readonly toast = inject(NotificacionToastService);
  private readonly pdfService = inject(PermisosPdfService);
  private readonly apiService = inject(PermisosApiService);
  private readonly descargas = inject(DescargaProgresoService);

  readonly busqueda = signal('');
  readonly periodoPreset = signal<PeriodoPreset>('TODOS');
  readonly fechaDesde = signal('');
  readonly fechaHasta = signal('');
  readonly filtroTipo = signal('TODOS');
  readonly filtroEstado = signal('TODOS');

  readonly modalPdfVisible = signal(false);
  readonly solicitudActiva = signal<SolicitudGerencia | null>(null);

  readonly solicitudes = signal<SolicitudGerencia[]>([]);
  /** Selección para el reporte; se conserva al cambiar de página y se limpia al cambiar los filtros. */
  readonly seleccionados = signal<ReadonlyMap<number, SolicitudGerencia>>(new Map());
  readonly seleccionandoTodos = signal(false);
  readonly exportandoReporte = signal(false);
  readonly cargando = signal(false);
  readonly errorCarga = signal(false);

  /** Indicadores del resultado filtrado (todas las páginas). */
  readonly resumen = signal<ResumenListadoPermisosApi | null>(null);
  readonly porPagina = 10;
  readonly pagina = signal(1);
  readonly totalPaginas = signal(0);
  readonly totalFiltrado = signal(0);
  private readonly destroyRef = inject(DestroyRef);
  private consulta?: Subscription;

  constructor() {
    const leerFiltros = () => this.consultaFiltros();
    observarListadoPaginado(leerFiltros, this.pagina, () => this.cargarHistorialDesdeApi());
    let filtrosPrevios: string | null = null;
    effect(() => {
      const clave = JSON.stringify(leerFiltros());
      untracked(() => {
        if (filtrosPrevios !== null && clave !== filtrosPrevios) this.seleccionados.set(new Map());
        filtrosPrevios = clave;
      });
    });
  }

  private consultaFiltros() {
    return {
      buscar: this.busqueda().trim(),
      tipo: this.filtroTipo(),
      estado: this.filtroEstado(),
      desde: this.fechaDesde(),
      hasta: this.fechaHasta(),
    };
  }

  cargarHistorialDesdeApi(): void {
    this.consulta?.unsubscribe();
    this.cargando.set(true);
    this.errorCarga.set(false);
    this.consulta = this.apiService
      .obtenerHistorialGerencia({ ...this.consultaFiltros(), page: this.pagina(), pageSize: this.porPagina })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.cargando.set(false);
          const pagina = res?.data;
          if (!res?.success || !pagina || !Array.isArray(pagina.items)) {
            this.errorCarga.set(true);
            return;
          }
          this.solicitudes.set(pagina.items.map((item) => this.mapearDesdeApi(item)));
          this.totalFiltrado.set(pagina.totalCount);
          this.totalPaginas.set(pagina.totalPages);
          this.resumen.set(pagina.resumen ?? null);
          if (pagina.totalPages > 0 && this.pagina() > pagina.totalPages) this.pagina.set(pagina.totalPages);
        },
        error: (err) => {
          this.cargando.set(false);
          this.errorCarga.set(true);
          this.toast.error(
            'No se pudo cargar el historial',
            obtenerMensajeAmigablePermisos(
              err,
              'No pudimos consultar el historial general en este momento.',
            ),
          );
        },
      });
  }

  private mapearDesdeApi(item: PermisoItemApi): SolicitudGerencia {
    return {
      id: item.id,
      folio: item.codigo,
      anio: item.anioSolicitud,
      fechaSolicitud: item.fechaSolicitud || `${item.diaSolicitud}/${item.mesSolicitud}/${item.anioSolicitud}`,
      diaSolicitud: item.diaSolicitud,
      mesSolicitud: item.mesSolicitud,
      colaborador: item.colaborador,
      cedula: item.cedula,
      cargo: item.cargo,
      area: item.area || 'Operaciones / Consultoría',
      cliente: item.cliente,
      proyecto: item.proyecto,
      liderNombre: item.liderNombre,
      liderTipo: item.liderTipo,
      responsableRrhh: item.responsableRrhh ?? undefined,
      tipo: item.tipo,
      tipoOficial: item.tipoOficial,
      fechas: item.fechas,
      fechaInicio: item.fechaInicio,
      fechaFin: item.fechaFin,
      fechaRegreso: item.fechaRegreso,
      fechaAprobacion: item.fechaAprobacion,
      diasSolicitados: item.diasSolicitados || `${item.totalDias} días`,
      descuentaVacaciones: item.descuentaVacaciones,
      totalDiasNumero: Number(item.totalDias ?? 0),
      horario: item.horario,
      detalleHorario: item.detalleHorario ?? undefined,
      horasSolicitadas: item.horasSolicitadas || `${item.totalHoras} horas`,
      totalHorasNumero: Number(item.totalHoras ?? 0),
      motivo: item.motivo,
      adjuntos: item.adjuntos ?? [],
      evidencia: item.evidenciaNombre ?? undefined,
      evidenciaUrl: item.tieneEvidencia ? this.apiService.obtenerUrlEvidencia(item.id) : undefined,
      aprobadoLider: Boolean(item.aprobadoLider),
      metodoLider: item.metodoLider || (item.liderTipo === 'EXT' ? 'Magic Link Externo' : 'Cuenta TMR Líder'),
      fechaAprobacionLider: item.fechaAprobacionLider ?? undefined,
      comentarioLider: item.comentarioLider ?? undefined,
      confirmadoRrhh: Boolean(item.confirmadoRrhh),
      fechaConfirmacionRrhh: item.fechaConfirmacionRrhh ?? undefined,
      observacionRrhh: item.observacionRrhh ?? undefined,
      impactoTimeReport: item.impactoTimeReport || 'RESTA_META',
      estadoClase: item.estadoClase,
      estadoTexto: item.estadoTexto,
      comentarios: item.comentarios ?? undefined,
};
  }

  readonly cantidadSeleccionados = computed(() => this.seleccionados().size);

  /** Todo el resultado filtrado está seleccionado (todas las páginas). */
  readonly todosSeleccionados = computed(() => {
    const total = this.totalFiltrado();
    return total > 0 && this.cantidadSeleccionados() >= total;
  });

  readonly todosPaginaSeleccionados = computed(() => {
    const visibles = this.solicitudes();
    const sel = this.seleccionados();
    return visibles.length > 0 && visibles.every((s) => sel.has(s.id));
  });

  readonly algunosPaginaSeleccionados = computed(() => {
    const sel = this.seleccionados();
    return !this.todosPaginaSeleccionados() && this.solicitudes().some((s) => sel.has(s.id));
  });

  readonly totalHistorico = computed(() => this.resumen()?.total ?? 0);
  readonly totalConfirmados = computed(() => this.resumen()?.confirmados ?? 0);
  readonly totalEnProceso = computed(() => this.resumen()?.enProceso ?? 0);
  readonly totalRechazados = computed(() => this.resumen()?.rechazados ?? 0);

  readonly tieneFiltrosActivos = computed(
    () =>
      Boolean(this.busqueda().trim()) ||
      this.periodoPreset() !== 'TODOS' ||
      Boolean(this.fechaDesde()) ||
      Boolean(this.fechaHasta()) ||
      this.filtroTipo() !== 'TODOS' ||
      this.filtroEstado() !== 'TODOS',
  );

  estaSeleccionado(id: number): boolean {
    return this.seleccionados().has(id);
  }

  alternarSeleccion(item: SolicitudGerencia, event?: Event): void {
    event?.stopPropagation();
    const copia = new Map(this.seleccionados());
    if (copia.has(item.id)) {
      copia.delete(item.id);
    } else {
      copia.set(item.id, item);
    }
    this.seleccionados.set(copia);
  }

  /** Casilla de la cabecera: selecciona o quita las filas de la página visible. */
  alternarSeleccionPagina(): void {
    const visibles = this.solicitudes();
    if (visibles.length === 0) return;
    const copia = new Map(this.seleccionados());
    if (this.todosPaginaSeleccionados()) {
      for (const item of visibles) copia.delete(item.id);
    } else {
      for (const item of visibles) copia.set(item.id, item);
    }
    this.seleccionados.set(copia);
  }

  /** Botón de la cabecera: selecciona todo el resultado filtrado (todas las páginas) o lo limpia. */
  alternarSeleccionarTodos(): void {
    if (this.todosSeleccionados()) {
      this.seleccionados.set(new Map());
      return;
    }
    if (this.seleccionandoTodos() || this.totalFiltrado() === 0) return;
    this.seleccionandoTodos.set(true);
    this.apiService
      .obtenerHistorialGerenciaCompleto(this.consultaFiltros())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.seleccionandoTodos.set(false);
          if (!res?.success || !Array.isArray(res.data)) return;
          this.seleccionados.set(new Map(res.data.map((item) => [item.id, this.mapearDesdeApi(item)])));
        },
        error: (err) => {
          this.seleccionandoTodos.set(false);
          this.toast.error(
            'No se pudo seleccionar todo',
            obtenerMensajeAmigablePermisos(err, 'No pudimos obtener todas las solicitudes filtradas.'),
          );
        },
      });
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

  limpiarFiltros(): void {
    this.busqueda.set('');
    this.periodoPreset.set('TODOS');
    this.fechaDesde.set('');
    this.fechaHasta.set('');
    this.filtroTipo.set('TODOS');
    this.filtroEstado.set('TODOS');
  }

  verPdf(item: SolicitudGerencia): void {
    this.solicitudActiva.set(item);
    this.modalPdfVisible.set(true);
  }

  async descargarPdf(item: SolicitudGerencia): Promise<void> {
    await this.pdfService.descargarFormularioPdf(this.obtenerDatosFormulario(item));
  }

  async generarReporte(formato: LibroPermisos | 'pdf'): Promise<void> {
    if (this.exportandoReporte()) return;
    const registros = [...this.seleccionados().values()];
    if (!registros.length) return;
    if (formato !== 'pdf' && !registros.some(s => (s.tipoOficial === 'VACACIONES') === (formato === 'vacaciones'))) {
      this.toast.info('Selección sin registros para este libro', 'Selecciona solicitudes del tipo correspondiente.');
      return;
    }
    const config: ReporteTabularConfig = {
      titulo: 'Permisos y vacaciones', nombreArchivo: 'Permisos_' + fechaArchivo(), nombreHoja: 'Solicitudes',
      orientacionPdf: 'landscape', formatoPdf: 'a4',
      columnas: [
        {encabezado:'Código',anchoExcel:18}, {encabezado:'Colaborador',anchoExcel:30},
        {encabezado:'Cliente / Proyecto',anchoExcel:36}, {encabezado:'Tipo',anchoExcel:28},
        {encabezado:'Período',anchoExcel:25}, {encabezado:'Días',anchoExcel:10,alineacion:'center'},
        {encabezado:'Horas',anchoExcel:10,alineacion:'center'}, {encabezado:'Estado',anchoExcel:20},
        {encabezado:'Líder',anchoExcel:26}
      ],
      filas: registros.map(s => [s.folio,s.colaborador,[s.cliente,s.proyecto].filter(Boolean).join(' / '),s.tipo,
        s.fechaInicio === s.fechaFin ? s.fechaInicio : s.fechaInicio + ' — ' + s.fechaFin,
        s.totalDiasNumero,s.totalHorasNumero,s.estadoTexto,s.liderNombre || '—'])
    };
    this.exportandoReporte.set(true);
    try {
      await this.descargas.ejecutar(formato === 'pdf' ? 'pdf' : 'xlsx', ctx => formato === 'pdf'
        ? exportarReportePdf(config, ctx) : descargarLibroPermisos(formato, registros, ctx));
    } catch(error) {
      if (!(error instanceof DescargaCanceladaError)) this.toast.error('No se pudo generar el reporte','Inténtalo nuevamente.');
    } finally { this.exportandoReporte.set(false); }
  }

  obtenerDatosFormulario(item: SolicitudGerencia): DatosFormularioOficial {
    const aprobadoLider = item.estadoClase === 'rrhh' || item.estadoClase === 'confirmado';
    const confirmadoRrhh = item.estadoClase === 'confirmado';

    return {
      idPermiso: item.id,
      folio: item.folio,
      diaSolicitud: item.diaSolicitud || item.fechaInicio.slice(0, 2),
      mesSolicitud: item.mesSolicitud || item.fechaInicio.slice(3, 5),
      anioSolicitud: item.anio,
      apellidosNombres: item.colaborador,
      numeroCedula: item.cedula,
      cargo: item.cargo,
      cliente: `${item.cliente} (${item.proyecto})`,
      jefeInmediato: item.liderNombre,
      tipoPermiso: item.tipoOficial,
      motivos: item.motivo,
      evidenciaNombre: item.evidencia,
      evidenciaUrl: item.evidenciaUrl,
      evidenciaUrlDescarga: item.evidenciaUrl,
      fechaInicio: item.fechaInicio,
      fechaFinalizacion: item.fechaFin,
      fechaRegreso: item.fechaRegreso,
      fechaAprobacion: item.fechaAprobacion,
      diasSolicitados: item.diasSolicitados,
      horario: item.horario,
      detalleHorario: item.detalleHorario,
      horasSolicitadas: item.horasSolicitadas,
      aprobacionLider: {
        aprobado: aprobadoLider,
        responsable: item.liderNombre,
        metodo: item.liderTipo === 'EXT' ? 'Magic Link Externo' : 'Cuenta TMR Líder',
        fecha: item.fechaAprobacion,
      },
      aprobacionTalentoHumano: {
        aprobado: confirmadoRrhh,
        responsable: item.responsableRrhh || 'Talento Humano ISC',
        fecha: confirmadoRrhh ? item.fechaAprobacion : undefined,
      },
      comentarios: item.comentarios,
    };
  }
}
