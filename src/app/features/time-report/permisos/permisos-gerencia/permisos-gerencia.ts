import { MatMenuModule } from '@angular/material/menu';
import { exportarReporteExcel, exportarReportePdf, ReporteTabularConfig } from '../../../../shared/utils/reporte-export.utils';
import { ResumenSolicitudComponent } from '../resumen-solicitud/resumen-solicitud';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
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
  DatosFormularioOficial,  HorarioPermisoOficial,
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
  AdjuntoPermisoApi,
  PermisoItemApi,
  PermisosApiService,
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
    ResumenSolicitudComponent,  ],
  templateUrl: './permisos-gerencia.html',
  styleUrl: './permisos-gerencia.scss',
})
export class PermisosGerenciaComponent implements OnInit {
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
  readonly seleccionadosIds = signal<ReadonlySet<number>>(new Set<number>());
  readonly exportandoReporte = signal(false);
  readonly cargando = signal(false);
  readonly errorCarga = signal(false);

  ngOnInit(): void {
    this.cargarHistorialDesdeApi();
  }

  cargarHistorialDesdeApi(): void {
    this.cargando.set(true);
    this.errorCarga.set(false);
    this.apiService.obtenerHistorialGerencia().subscribe({
      next: (res) => {
        this.cargando.set(false);
        this.errorCarga.set(!res?.success || !Array.isArray(res.data));
        if (res?.success && Array.isArray(res.data)) {
          this.solicitudes.set(
            res.data.map((item: PermisoItemApi) => ({
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
              diasSolicitados: `${item.totalDias} días`,
              totalDiasNumero: Number(item.totalDias ?? 0),
              horario: item.horario,
              detalleHorario: item.detalleHorario ?? undefined,
              horasSolicitadas: `${item.totalHoras} h`,
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
            })),
          );
        }
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

  readonly solicitudesFiltradas = computed(() => {
    const q = this.busqueda();
    const desde = this.fechaDesde();
    const hasta = this.fechaHasta();
    const tipo = this.filtroTipo();
    const estado = this.filtroEstado();

    return this.solicitudes().filter((s) => {
      if (!cumpleRangoFechas(s.fechaInicio, s.fechaFin, desde, hasta)) return false;
      if (tipo !== 'TODOS' && s.tipoOficial !== tipo) return false;
      if (estado === 'proceso' && !['pendiente', 'rrhh', 'observado'].includes(s.estadoClase)) return false;
      if (estado === 'finalizado' && !['confirmado', 'rechazado'].includes(s.estadoClase)) return false;
      if (
        !coincideBusquedaInteligente(q, [
          s.folio,
          s.anio,
          s.colaborador,
          s.cedula,
          s.cargo,
          s.cliente,
          s.proyecto,
          s.liderNombre,
          s.liderTipo,
          s.tipo,
          s.fechas,
          s.fechaInicio,
          s.fechaFin,
          s.diasSolicitados,
          s.horasSolicitadas,
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

  readonly solicitudesSeleccionadasFiltradas = computed(() => {
    const ids = this.seleccionadosIds();
    return this.solicitudesFiltradas().filter((s) => ids.has(s.id));
  });

  readonly cantidadSeleccionados = computed(() => this.solicitudesSeleccionadasFiltradas().length);

  readonly todosSeleccionados = computed(() => {
    const visibles = this.solicitudesFiltradas();
    return visibles.length > 0 && this.cantidadSeleccionados() === visibles.length;
  });

  readonly algunosSeleccionados = computed(() => {
    const cant = this.cantidadSeleccionados();
    return cant > 0 && cant < this.solicitudesFiltradas().length;
  });

  readonly totalHistorico = computed(() => this.solicitudesFiltradas().length);
  readonly totalConfirmados = computed(
    () => this.solicitudesFiltradas().filter((s) => s.estadoClase === 'confirmado').length,
  );
  readonly totalEnProceso = computed(
    () =>
      this.solicitudesFiltradas().filter(
        (s) => s.estadoClase === 'pendiente' || s.estadoClase === 'rrhh' || s.estadoClase === 'observado',
      ).length,
  );
  readonly totalRechazados = computed(
    () => this.solicitudesFiltradas().filter((s) => s.estadoClase === 'rechazado').length,
  );

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
    return this.seleccionadosIds().has(id);
  }

  alternarSeleccion(id: number, event?: Event): void {
    event?.stopPropagation();
    const copia = new Set(this.seleccionadosIds());
    if (copia.has(id)) {
      copia.delete(id);
    } else {
      copia.add(id);
    }
    this.seleccionadosIds.set(copia);
  }

  alternarSeleccionarTodos(): void {
    const visibles = this.solicitudesFiltradas();
    if (visibles.length === 0) return;

    const copia = new Set(this.seleccionadosIds());
    if (this.todosSeleccionados()) {
      for (const item of visibles) {
        copia.delete(item.id);
      }
    } else {
      for (const item of visibles) {
        copia.add(item.id);
      }
    }
    this.seleccionadosIds.set(copia);
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

  async generarReporte(formato: 'xlsx' | 'pdf'): Promise<void> {
    if (this.exportandoReporte()) return;
    const registros = [...this.solicitudesSeleccionadasFiltradas()];
    if (!registros.length) return;
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
      await this.descargas.ejecutar(formato, ctx => formato === 'xlsx' ? exportarReporteExcel(config,ctx) : exportarReportePdf(config,ctx));
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
