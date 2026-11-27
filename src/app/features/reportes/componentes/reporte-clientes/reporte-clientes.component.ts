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
  ClienteProyecto,
  ClienteResumen,
  FiltroEstado,
} from '../../modelos/reporte-historial.model';
import { OrdenTabla, ordenarLista, textoFecha, textoHoras } from '../../utils/reporte-historial.utils';

type VistaClientes = 'clientes' | 'proyectos' | 'colaboradores';

const ALIAS_ORDEN: Record<string, string> = {
  duracion: 'diasTrabajados',
  finTexto: 'fechaFin',
  horasTexto: 'horasRegistradas',
};

/**
 * Reporte Por Cliente: cuántos y cuáles proyectos tiene cada cliente, cuántos colaboradores tiene cada proyecto
 * y quiénes son (con sus fechas en el proyecto). El filtro de estado se aplica a los proyectos.
 */
@Component({
  selector: 'app-reporte-clientes',
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
  templateUrl: './reporte-clientes.component.html',
  styleUrls: ['../reporte-fechas/reporte-fechas.component.scss', '../reporte-historial.scss'],
})
export class ReporteClientesComponent {
  private reportesService = inject(ReportesService);
  private descargas = inject(DescargaProgresoService);

  readonly columnasClientes: ColumnDefinition[] = [
    { header: 'Cliente', property: 'cliente', type: 'text', sortable: true },
    { header: 'Identificación', property: 'identificacionTexto', type: 'text', sortable: true },
    { header: 'Proyectos', property: 'totalProyectos', type: 'text', sortable: true },
    { header: 'Proy. activos', property: 'proyectosActivos', type: 'text', sortable: true },
    { header: 'Colaboradores', property: 'colaboradores', type: 'text', sortable: true },
    { header: 'Colab. vigentes', property: 'colaboradoresVigentes', type: 'text', sortable: true },
    { header: 'Estado', property: 'estadoCliente', type: 'badge-estado', sortable: true },
  ];

  readonly columnasProyectos: ColumnDefinition[] = [
    { header: 'Cliente', property: 'cliente', type: 'text', sortable: true },
    { header: 'Código', property: 'codigo', type: 'text', sortable: true },
    { header: 'Proyecto', property: 'proyecto', type: 'text', sortable: true },
    { header: 'Estado', property: 'estadoTexto', type: 'badge-estado', sortable: true },
    { header: 'Inicio', property: 'fechaInicio', type: 'fecha', dateFormat: 'dd/MM/yyyy', sortable: true },
    { header: 'Fin', property: 'fechaFin', type: 'fecha', dateFormat: 'dd/MM/yyyy', sortable: true },
    { header: 'Colaboradores', property: 'totalColaboradores', type: 'text', sortable: true },
    { header: 'Vigentes', property: 'colaboradoresVigentes', type: 'text', sortable: true },
  ];

  readonly columnasColaboradores: ColumnDefinition[] = [
    { header: 'Cliente', property: 'cliente', type: 'text', sortable: true },
    { header: 'Proyecto', property: 'proyecto', type: 'text', sortable: true },
    { header: 'Colaborador', property: 'colaborador', type: 'text', sortable: true },
    { header: 'Rol', property: 'rolTexto', type: 'text', sortable: true },
    { header: 'Inicio', property: 'fechaInicio', type: 'fecha', dateFormat: 'dd/MM/yyyy', sortable: true },
    { header: 'Fin', property: 'finTexto', type: 'text', sortable: true },
    { header: 'Tiempo', property: 'duracion', type: 'text', sortable: true },
    { header: 'Horas', property: 'horasTexto', type: 'text', sortable: true },
    { header: 'Asignación', property: 'estadoAsignacion', type: 'text', sortable: true },
  ];

  // ── Datos ─────────────────────────────────────────────
  private clientes = signal<ClienteResumen[]>([]);
  private proyectos = signal<ClienteProyecto[]>([]);
  private asignaciones = signal<AsignacionHistorial[]>([]);
  cargando = signal(true);
  error = signal(false);

  // ── Filtros ───────────────────────────────────────────
  busquedaCliente = signal('');
  busquedaTexto = signal('');
  estado = signal<FiltroEstado>('Todos');
  readonly opcionesEstado: FiltroEstado[] = ['Todos', 'Activo', 'Inactivo'];

  // ── Vista, orden y paginación ─────────────────────────
  vista = signal<VistaClientes>('clientes');
  private orden = signal<OrdenTabla | null>(null);
  paginaActual = signal(1);
  readonly porPagina = 10;

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(false);
    this.reportesService.getReporteClientes().subscribe({
      next: (res) => {
        this.clientes.set(res.clientes);
        // Estado mostrado: el del catálogo (En Progreso, Cancelado...) o, si no hay, Activo/Inactivo.
        this.proyectos.set(res.proyectos.map(p => ({ ...p, estadoTexto: p.estadoProyecto || p.estadoProyectoActivo })));
        this.asignaciones.set(res.colaboradores.map(a => ({
          ...a,
          horasTexto: textoHoras(a.horasRegistradas),
          rolTexto: a.rol || a.cargo || '—',
        })));
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar el reporte por cliente:', err);
        this.cargando.set(false);
        this.error.set(true);
      },
    });
  }

  // ── Filtrado (sobre la lista completa) ────────────────
  private cumpleEstado(proyectoActivo: boolean): boolean {
    const estado = this.estado();
    return estado === 'Todos' || (estado === 'Activo') === proyectoActivo;
  }

  proyectosFiltrados = computed(() => {
    const texto = this.busquedaTexto();
    return this.proyectos().filter(p =>
      coincideBusqueda(p.cliente, this.busquedaCliente())
      && this.cumpleEstado(p.proyectoActivo)
      && (coincideBusqueda(p.proyecto, texto) || coincideBusqueda(p.codigo, texto) || coincideBusqueda(p.nombresColaboradores, texto)));
  });

  colaboradoresFiltrados = computed(() => {
    const texto = this.busquedaTexto();
    return this.asignaciones().filter(a =>
      coincideBusqueda(a.cliente, this.busquedaCliente())
      && this.cumpleEstado(a.proyectoActivo)
      && (coincideBusqueda(a.proyecto, texto) || coincideBusqueda(a.codigoProyecto, texto)
        || coincideBusqueda(a.colaborador, texto) || coincideBusqueda(a.identificacion, texto)));
  });

  /**
   * Resumen por cliente recalculado con los proyectos y colaboradores filtrados, para que los conteos respeten el
   * filtro de estado. Con "Todos" y sin búsqueda de proyecto se muestran también los clientes sin proyectos.
   */
  clientesFiltrados = computed(() => {
    const proyectos = this.proyectosFiltrados();
    const asignaciones = this.colaboradoresFiltrados();
    const incluirSinProyectos = this.estado() === 'Todos' && !this.busquedaTexto();

    return this.clientes()
      .filter(c => coincideBusqueda(c.cliente, this.busquedaCliente()))
      .map(c => {
        const suyos = proyectos.filter(p => p.idCliente === c.idCliente);
        const equipo = asignaciones.filter(a => a.idCliente === c.idCliente);
        return {
          ...c,
          identificacionTexto: c.identificacion ?? '—',
          totalProyectos: suyos.length,
          proyectosActivos: suyos.filter(p => p.proyectoActivo).length,
          nombresProyectos: suyos.map(p => p.proyecto).sort((a, b) => a.localeCompare(b, 'es')).join(', '),
          colaboradores: new Set(equipo.map(a => a.idEmpleado)).size,
          colaboradoresVigentes: new Set(equipo.filter(a => a.vigente).map(a => a.idEmpleado)).size,
        };
      })
      .filter(c => incluirSinProyectos || c.totalProyectos > 0);
  });

  private filasVista = computed<any[]>(() => {
    const lista: any[] = this.vista() === 'clientes'
      ? this.clientesFiltrados()
      : this.vista() === 'proyectos' ? this.proyectosFiltrados() : this.colaboradoresFiltrados();
    return ordenarLista(lista, this.orden(), ALIAS_ORDEN);
  });

  totalFilas = computed(() => this.filasVista().length);
  totalPaginas = computed(() => Math.max(1, Math.ceil(this.totalFilas() / this.porPagina)));
  filasPaginadas = computed(() => {
    const inicio = (this.paginaActual() - 1) * this.porPagina;
    return this.filasVista().slice(inicio, inicio + this.porPagina);
  });

  // ── Tarjetas ──────────────────────────────────────────
  totalClientes = computed(() => this.clientesFiltrados().filter(c => c.totalProyectos > 0).length);
  totalProyectos = computed(() => this.proyectosFiltrados().length);
  totalProyectosActivos = computed(() => this.proyectosFiltrados().filter(p => p.proyectoActivo).length);
  totalColaboradores = computed(() => new Set(this.colaboradoresFiltrados().map(a => a.idEmpleado)).size);

  // ── Acciones ──────────────────────────────────────────
  cambiarVista(vista: VistaClientes): void {
    if (this.vista() === vista) return;
    this.vista.set(vista);
    this.orden.set(null);
    this.paginaActual.set(1);
  }

  onTexto(campo: 'cliente' | 'texto', valor: string): void {
    (campo === 'cliente' ? this.busquedaCliente : this.busquedaTexto).set(valor.trimStart());
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

  /** Clic en un cliente: muestra sus proyectos. */
  verProyectosDe(fila: ClienteResumen): void {
    this.busquedaCliente.set(fila.cliente);
    this.cambiarVista('proyectos');
  }

  /** Clic en un proyecto: muestra los colaboradores de ese proyecto. */
  verColaboradoresDe(fila: ClienteProyecto): void {
    this.busquedaCliente.set(fila.cliente);
    this.busquedaTexto.set(fila.codigo || fila.proyecto);
    this.cambiarVista('colaboradores');
  }

  // ── Descargas ─────────────────────────────────────────
  private ordenDe(vista: VistaClientes): OrdenTabla | null {
    return this.vista() === vista ? this.orden() : null;
  }

  private configClientes(): ReporteTabularConfig {
    return {
      titulo: 'Reporte por Cliente — Proyectos por cliente',
      nombreArchivo: 'Clientes',
      nombreHoja: 'Clientes',
      columnas: [
        { encabezado: 'Cliente', anchoExcel: 32, anchoPdf: 40 },
        { encabezado: 'Identificación', anchoExcel: 16, anchoPdf: 22 },
        { encabezado: 'Estado', anchoExcel: 12, anchoPdf: 16, alineacion: 'center' },
        { encabezado: 'N.º Proyectos', anchoExcel: 12, anchoPdf: 16, alineacion: 'center' },
        { encabezado: 'Proyectos activos', anchoExcel: 14, anchoPdf: 18, alineacion: 'center' },
        { encabezado: 'Proyectos', anchoExcel: 60, anchoPdf: 80 },
        { encabezado: 'Colaboradores', anchoExcel: 14, anchoPdf: 18, alineacion: 'center' },
        { encabezado: 'Colaboradores vigentes', anchoExcel: 16, anchoPdf: 20, alineacion: 'center' },
      ],
      filas: ordenarLista(this.clientesFiltrados(), this.ordenDe('clientes'), ALIAS_ORDEN).map(c => [
        c.cliente,
        c.identificacion ?? '',
        c.estadoCliente,
        c.totalProyectos,
        c.proyectosActivos,
        c.nombresProyectos,
        c.colaboradores,
        c.colaboradoresVigentes,
      ]),
      columnaEstado: 2,
      orientacionPdf: 'landscape',
    };
  }

  private configProyectos(): ReporteTabularConfig {
    return {
      titulo: 'Reporte por Cliente — Proyectos y colaboradores',
      nombreArchivo: 'Clientes',
      nombreHoja: 'Proyectos',
      columnas: [
        { encabezado: 'Cliente', anchoExcel: 28, anchoPdf: 32 },
        { encabezado: 'Código', anchoExcel: 12, anchoPdf: 14 },
        { encabezado: 'Proyecto', anchoExcel: 32, anchoPdf: 36 },
        { encabezado: 'Tipo', anchoExcel: 18, anchoPdf: 20 },
        { encabezado: 'Estado', anchoExcel: 16, anchoPdf: 18 },
        { encabezado: 'Activo', anchoExcel: 10, anchoPdf: 12, alineacion: 'center' },
        { encabezado: 'Fecha inicio', anchoExcel: 14, anchoPdf: 16, alineacion: 'center' },
        { encabezado: 'Fecha fin', anchoExcel: 14, anchoPdf: 16, alineacion: 'center' },
        { encabezado: 'Colaboradores', anchoExcel: 14, anchoPdf: 16, alineacion: 'center' },
        { encabezado: 'Vigentes', anchoExcel: 10, anchoPdf: 12, alineacion: 'center' },
        { encabezado: 'Colaboradores en el proyecto', anchoExcel: 60, anchoPdf: 70 },
      ],
      filas: ordenarLista(this.proyectosFiltrados(), this.ordenDe('proyectos'), ALIAS_ORDEN).map(p => [
        p.cliente,
        p.codigo ?? '',
        p.proyecto,
        p.tipo ?? '',
        p.estadoProyecto ?? '',
        p.estadoProyectoActivo,
        textoFecha(p.fechaInicio),
        textoFecha(p.fechaFin),
        p.totalColaboradores,
        p.colaboradoresVigentes,
        p.nombresColaboradores,
      ]),
      columnaEstado: 5,
      orientacionPdf: 'landscape',
    };
  }

  private configColaboradores(): ReporteTabularConfig {
    return {
      titulo: 'Reporte por Cliente — Colaboradores en proyectos',
      nombreArchivo: 'Clientes',
      nombreHoja: 'Colaboradores',
      columnas: [
        { encabezado: 'Cliente', anchoExcel: 28, anchoPdf: 30 },
        { encabezado: 'Código', anchoExcel: 12, anchoPdf: 14 },
        { encabezado: 'Proyecto', anchoExcel: 32, anchoPdf: 34 },
        { encabezado: 'Colaborador', anchoExcel: 30, anchoPdf: 34 },
        { encabezado: 'Identificación', anchoExcel: 16, anchoPdf: 20 },
        { encabezado: 'Rol / Cargo', anchoExcel: 24, anchoPdf: 26 },
        { encabezado: 'Líder', anchoExcel: 26, anchoPdf: 28 },
        { encabezado: 'Fecha inicio', anchoExcel: 14, anchoPdf: 16, alineacion: 'center' },
        { encabezado: 'Fecha fin', anchoExcel: 14, anchoPdf: 16, alineacion: 'center' },
        { encabezado: 'Tiempo', anchoExcel: 18, anchoPdf: 20 },
        { encabezado: 'Horas registradas', anchoExcel: 14, anchoPdf: 16, alineacion: 'right' },
        { encabezado: 'Asignación', anchoExcel: 12, anchoPdf: 16, alineacion: 'center' },
      ],
      filas: ordenarLista(this.colaboradoresFiltrados(), this.ordenDe('colaboradores'), ALIAS_ORDEN).map(a => [
        a.cliente,
        a.codigoProyecto ?? '',
        a.proyecto,
        a.colaborador,
        a.identificacion,
        a.rol || a.cargo || '',
        a.lider ?? '',
        textoFecha(a.fechaInicio),
        a.finTexto,
        a.duracion,
        a.horasRegistradas,
        a.estadoAsignacion,
      ]),
      orientacionPdf: 'landscape',
    };
  }

  /** Excel: las tres vistas en hojas separadas, con los filtros actuales. */
  async exportarExcel(): Promise<void> {
    if (this.totalFilas() === 0) return;
    await this.descargas.ejecutar('xlsx', async ctx => {
      await exportarReporteExcelMultihoja(
        [this.configClientes(), this.configProyectos(), this.configColaboradores()], 'Clientes', ctx);
    }).catch(err => console.error('Error al exportar Excel:', err));
  }

  /** PDF: la vista que se está viendo. */
  async exportarPDF(): Promise<void> {
    if (this.totalFilas() === 0) return;
    const config = this.vista() === 'clientes'
      ? this.configClientes()
      : this.vista() === 'proyectos' ? this.configProyectos() : this.configColaboradores();
    await this.descargas.ejecutar('pdf', async ctx => {
      await exportarReportePdf(config, ctx);
    }).catch(err => console.error('Error al exportar PDF:', err));
  }
}
