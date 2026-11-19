import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { TablaComponent } from '../../../../shared/components/tabla-colega/tabla.component';
import { ColumnDefinition } from '../../../../shared/components/tabla-colega/tabla.types';
import { TarjetaResumenComponent } from '../../../../shared/components/tarjeta-resumen/tarjeta-resumen.component';
import { DescargarMenuComponent } from '../../../colaboradores/componentes/descargar-menu/descargar-menu.component';
import { DescargaProgresoService } from '../../../../shared/services/descarga-progreso.service';
import {
  exportarReporteExcelMultihoja,
  exportarReportePdf,
  ReporteTabularConfig,
} from '../../../../shared/utils/reporte-export.utils';
import { coincideBusqueda } from '../../../../shared/utils/texto.utils';

import { ReportesService } from '../../servicios/reportes.service';
import {
  AsignacionHistorial,
  ColaboradorClienteResumen,
  FiltroEstado,
} from '../../modelos/reporte-historial.model';
import { OrdenTabla, ordenarLista, textoFecha, textoHoras } from '../../utils/reporte-historial.utils';

type VistaColaboradores = 'resumen' | 'historial';

/** Columnas de texto que se ordenan por otro campo (número o fecha). */
const ALIAS_ORDEN: Record<string, string> = {
  duracion: 'diasTrabajados',
  finTexto: 'fechaFin',
  horasTexto: 'horasRegistradas',
};

/**
 * Reporte Por Colaborador: con qué clientes trabajó cada colaborador, cuánto tiempo (por fechas de asignación y
 * por horas registradas), desde y hasta cuándo, y el historial completo de sus asignaciones a proyectos.
 */
@Component({
  selector: 'app-reporte-colaboradores',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    HeaderComponent,
    TablaComponent,
    TarjetaResumenComponent,
    DescargarMenuComponent,
  ],
  templateUrl: './reporte-colaboradores.component.html',
  styleUrls: ['../reporte-fechas/reporte-fechas.component.scss', '../reporte-historial.scss'],
})
export class ReporteColaboradoresComponent {
  private reportesService = inject(ReportesService);
  private descargas = inject(DescargaProgresoService);

  readonly columnasResumen: ColumnDefinition[] = [
    { header: 'Colaborador', property: 'colaborador', type: 'text', sortable: true },
    { header: 'Identificación', property: 'identificacion', type: 'text', sortable: true },
    { header: 'Cliente', property: 'cliente', type: 'text', sortable: true },
    { header: 'Proyectos', property: 'proyectos', type: 'text', sortable: true },
    { header: 'Inicio', property: 'fechaInicio', type: 'fecha', dateFormat: 'dd/MM/yyyy', sortable: true },
    { header: 'Fin', property: 'finTexto', type: 'text', sortable: true },
    { header: 'Tiempo', property: 'duracion', type: 'text', sortable: true },
    { header: 'Horas', property: 'horasTexto', type: 'text', sortable: true },
    { header: 'Estado', property: 'estadoColaborador', type: 'badge-estado', sortable: true },
  ];

  readonly columnasHistorial: ColumnDefinition[] = [
    { header: 'Colaborador', property: 'colaborador', type: 'text', sortable: true },
    { header: 'Cliente', property: 'cliente', type: 'text', sortable: true },
    { header: 'Proyecto', property: 'proyecto', type: 'text', sortable: true },
    { header: 'Rol', property: 'rolTexto', type: 'text', sortable: true },
    { header: 'Inicio', property: 'fechaInicio', type: 'fecha', dateFormat: 'dd/MM/yyyy', sortable: true },
    { header: 'Fin', property: 'finTexto', type: 'text', sortable: true },
    { header: 'Tiempo', property: 'duracion', type: 'text', sortable: true },
    { header: 'Horas', property: 'horasTexto', type: 'text', sortable: true },
    { header: 'Asignación', property: 'estadoAsignacion', type: 'text', sortable: true },
  ];

  // ── Datos ─────────────────────────────────────────────
  private resumen = signal<ColaboradorClienteResumen[]>([]);
  private asignaciones = signal<AsignacionHistorial[]>([]);
  cargando = signal(true);
  error = signal(false);

  // ── Filtros ───────────────────────────────────────────
  busquedaColaborador = signal('');
  busquedaCliente = signal('');
  estado = signal<FiltroEstado>('Todos');
  readonly opcionesEstado: FiltroEstado[] = ['Todos', 'Activo', 'Inactivo'];

  // ── Vista, orden y paginación ─────────────────────────
  vista = signal<VistaColaboradores>('resumen');
  private orden = signal<OrdenTabla | null>(null);
  paginaActual = signal(1);
  readonly porPagina = 10;

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(false);
    this.reportesService.getReporteColaboradores().subscribe({
      next: (res) => {
        this.resumen.set(res.resumen.map(r => ({ ...r, horasTexto: textoHoras(r.horasRegistradas) })));
        this.asignaciones.set(res.asignaciones.map(a => ({
          ...a,
          horasTexto: textoHoras(a.horasRegistradas),
          rolTexto: a.rol || a.cargo || '—',
        })));
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar el reporte por colaborador:', err);
        this.cargando.set(false);
        this.error.set(true);
      },
    });
  }

  // ── Filtrado (sobre la lista completa) ────────────────
  private cumpleFiltros(item: { colaborador: string; identificacion: string; cliente: string; colaboradorActivo: boolean }): boolean {
    const texto = this.busquedaColaborador();
    const cliente = this.busquedaCliente();
    const estado = this.estado();
    return (coincideBusqueda(item.colaborador, texto) || coincideBusqueda(item.identificacion, texto))
      && coincideBusqueda(item.cliente, cliente)
      && (estado === 'Todos' || (estado === 'Activo') === item.colaboradorActivo);
  }

  resumenFiltrado = computed(() => this.resumen().filter(r => this.cumpleFiltros(r)));
  historialFiltrado = computed(() => this.asignaciones().filter(a => this.cumpleFiltros(a)));

  /** Filas de la vista activa, ya ordenadas (la lista completa, antes de paginar). */
  private filasVista = computed<any[]>(() => {
    const lista: any[] = this.vista() === 'resumen' ? this.resumenFiltrado() : this.historialFiltrado();
    return ordenarLista(lista, this.orden(), ALIAS_ORDEN);
  });

  totalFilas = computed(() => this.filasVista().length);
  totalPaginas = computed(() => Math.max(1, Math.ceil(this.totalFilas() / this.porPagina)));
  filasPaginadas = computed(() => {
    const inicio = (this.paginaActual() - 1) * this.porPagina;
    return this.filasVista().slice(inicio, inicio + this.porPagina);
  });

  // ── Tarjetas ──────────────────────────────────────────
  totalColaboradores = computed(() => new Set(this.historialFiltrado().map(a => a.idEmpleado)).size);
  totalClientes = computed(() => new Set(this.historialFiltrado().map(a => a.cliente)).size);
  totalAsignaciones = computed(() => this.historialFiltrado().length);
  totalHoras = computed(() => textoHoras(this.resumenFiltrado().reduce((t, r) => t + r.horasRegistradas, 0)));

  // ── Acciones ──────────────────────────────────────────
  cambiarVista(vista: VistaColaboradores): void {
    if (this.vista() === vista) return;
    this.vista.set(vista);
    this.orden.set(null);
    this.paginaActual.set(1);
  }

  onTexto(campo: 'colaborador' | 'cliente', valor: string): void {
    (campo === 'colaborador' ? this.busquedaColaborador : this.busquedaCliente).set(valor.trimStart());
    this.paginaActual.set(1);
  }

  onEstado(valor: FiltroEstado): void {
    this.estado.set(valor);
    this.paginaActual.set(1);
  }

  onOrden(orden: OrdenTabla): void {
    this.orden.set(orden);
    this.paginaActual.set(1);
  }

  /** Clic en una fila del resumen: abre el historial de ese colaborador con ese cliente. */
  verHistorial(fila: ColaboradorClienteResumen): void {
    if (this.vista() !== 'resumen') return;
    this.busquedaColaborador.set(fila.identificacion || fila.colaborador);
    this.busquedaCliente.set(fila.cliente);
    this.cambiarVista('historial');
  }

  // ── Descargas ─────────────────────────────────────────
  private configResumen(): ReporteTabularConfig {
    return {
      titulo: 'Reporte por Colaborador — Tiempo por cliente',
      nombreArchivo: 'Colaboradores',
      nombreHoja: 'Tiempo por cliente',
      columnas: [
        { encabezado: 'Colaborador', anchoExcel: 30, anchoPdf: 38 },
        { encabezado: 'Identificación', anchoExcel: 16, anchoPdf: 22 },
        { encabezado: 'Cargo', anchoExcel: 24, anchoPdf: 28 },
        { encabezado: 'Estado', anchoExcel: 12, anchoPdf: 16, alineacion: 'center' },
        { encabezado: 'Cliente', anchoExcel: 28, anchoPdf: 34 },
        { encabezado: 'N.º Proyectos', anchoExcel: 12, anchoPdf: 14, alineacion: 'center' },
        { encabezado: 'Proyectos', anchoExcel: 40, anchoPdf: 50 },
        { encabezado: 'Fecha inicio', anchoExcel: 14, anchoPdf: 18, alineacion: 'center' },
        { encabezado: 'Fecha fin', anchoExcel: 14, anchoPdf: 18, alineacion: 'center' },
        { encabezado: 'Tiempo', anchoExcel: 18, anchoPdf: 24 },
        { encabezado: 'Días', anchoExcel: 10, anchoPdf: 12, alineacion: 'center' },
        { encabezado: 'Horas registradas', anchoExcel: 14, anchoPdf: 18, alineacion: 'right' },
      ],
      filas: ordenarLista(this.resumenFiltrado(), this.vista() === 'resumen' ? this.orden() : null, ALIAS_ORDEN).map(r => [
        r.colaborador,
        r.identificacion,
        r.cargo ?? '',
        r.estadoColaborador,
        r.cliente,
        r.proyectos,
        r.nombresProyectos,
        textoFecha(r.fechaInicio),
        r.finTexto,
        r.duracion,
        r.diasTrabajados,
        r.horasRegistradas,
      ]),
      columnaEstado: 3,
      orientacionPdf: 'landscape',
    };
  }

  private configHistorial(): ReporteTabularConfig {
    return {
      titulo: 'Reporte por Colaborador — Historial de asignaciones',
      nombreArchivo: 'Colaboradores',
      nombreHoja: 'Historial de asignaciones',
      columnas: [
        { encabezado: 'Colaborador', anchoExcel: 30, anchoPdf: 36 },
        { encabezado: 'Identificación', anchoExcel: 16, anchoPdf: 20 },
        { encabezado: 'Cliente', anchoExcel: 28, anchoPdf: 30 },
        { encabezado: 'Código', anchoExcel: 12, anchoPdf: 14 },
        { encabezado: 'Proyecto', anchoExcel: 32, anchoPdf: 36 },
        { encabezado: 'Estado proyecto', anchoExcel: 16, anchoPdf: 18 },
        { encabezado: 'Rol / Cargo', anchoExcel: 24, anchoPdf: 26 },
        { encabezado: 'Líder', anchoExcel: 26, anchoPdf: 28 },
        { encabezado: 'Fecha inicio', anchoExcel: 14, anchoPdf: 16, alineacion: 'center' },
        { encabezado: 'Fecha fin', anchoExcel: 14, anchoPdf: 16, alineacion: 'center' },
        { encabezado: 'Tiempo', anchoExcel: 18, anchoPdf: 20 },
        { encabezado: 'Días', anchoExcel: 10, anchoPdf: 10, alineacion: 'center' },
        { encabezado: 'Horas registradas', anchoExcel: 14, anchoPdf: 16, alineacion: 'right' },
        { encabezado: 'Asignación', anchoExcel: 12, anchoPdf: 16, alineacion: 'center' },
      ],
      filas: ordenarLista(this.historialFiltrado(), this.vista() === 'historial' ? this.orden() : null, ALIAS_ORDEN).map(a => [
        a.colaborador,
        a.identificacion,
        a.cliente,
        a.codigoProyecto ?? '',
        a.proyecto,
        a.estadoProyecto ?? '',
        a.rol || a.cargo || '',
        a.lider ?? '',
        textoFecha(a.fechaInicio),
        a.finTexto,
        a.duracion,
        a.diasTrabajados,
        a.horasRegistradas,
        a.estadoAsignacion,
      ]),
      orientacionPdf: 'landscape',
    };
  }

  /** Excel: las dos vistas en hojas separadas, con los filtros actuales. */
  async exportarExcel(): Promise<void> {
    if (this.totalFilas() === 0) return;
    await this.descargas.ejecutar('xlsx', async ctx => {
      await exportarReporteExcelMultihoja([this.configResumen(), this.configHistorial()], 'Colaboradores', ctx);
    }).catch(err => console.error('Error al exportar Excel:', err));
  }

  /** PDF: la vista que se está viendo. */
  async exportarPDF(): Promise<void> {
    if (this.totalFilas() === 0) return;
    const config = this.vista() === 'resumen' ? this.configResumen() : this.configHistorial();
    await this.descargas.ejecutar('pdf', async ctx => {
      await exportarReportePdf(config, ctx);
    }).catch(err => console.error('Error al exportar PDF:', err));
  }
}
