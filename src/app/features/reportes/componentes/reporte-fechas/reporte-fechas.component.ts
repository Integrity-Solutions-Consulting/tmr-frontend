import { Component, signal, computed, OnInit, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReporteFechas } from '../../modelos/reporte-fechas.model';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { ReportesService } from '../../servicios/reportes.service';

import { TablaComponent } from '../../../../shared/components/tabla-colega/tabla.component';
import { ColumnDefinition } from '../../../../shared/components/tabla-colega/tabla.types';
import { MatIconModule } from '@angular/material/icon';
import { DescargarMenuComponent } from '../../../colaboradores/componentes/descargar-menu/descargar-menu.component';
import { exportarReporteExcel, exportarReportePdf } from '../../../../shared/utils/reporte-export.utils';

@Component({
  selector: 'app-reporte-fechas',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, TablaComponent, MatIconModule, DescargarMenuComponent],
  templateUrl: './reporte-fechas.component.html',
  styleUrl: './reporte-fechas.component.scss'
})
export class ReporteFechasComponent {
  columnasTabla: ColumnDefinition[] = [
    { header: 'Cliente', property: 'cliente', type: 'text' },
    { header: 'Líder', property: 'lider', type: 'text' },
    { header: 'Recurso', property: 'recurso', type: 'text' },
    { header: 'Cargo', property: 'cargo', type: 'text' },
    { header: 'Inicio', property: 'fechaInicio', type: 'fecha', dateFormat: 'dd/MM/yyyy' },
    { header: 'Fin', property: 'fechaFin', type: 'fecha', dateFormat: 'dd/MM/yyyy' }
  ];

  Math = Math;
  busquedaCliente = signal('');
  busquedaLider = signal('');
  fechaInicio = signal('');
  fechaFin = signal('');
  forzarMostrar = signal(false);

  paginaActual = signal(1);
  itemsPorPagina = signal(10);
  totalItems = signal(0);

  private reportesService = inject(ReportesService);
  datos = signal<ReporteFechas[]>([]);

  constructor() {
    effect(() => {
      // Signals we depend on
      const cliente = this.busquedaCliente();
      const lider = this.busquedaLider();
      const fInicio = this.fechaInicio();
      const fFin = this.fechaFin();
      const page = this.paginaActual();
      const pageSize = this.itemsPorPagina();
      const mostrar = this.mostrarDatos();

      if (!mostrar) {
        this.datos.set([]);
        this.totalItems.set(0);
        return;
      }

      const filtros = {
        cliente: cliente || undefined,
        lider: lider || undefined,
        fechaInicio: fInicio ? fInicio + 'T00:00:00' : undefined,
        fechaFin: fFin ? fFin + 'T23:59:59' : undefined
      };

      this.reportesService.getReporteFechas(filtros, page, pageSize).subscribe({
        next: (res) => {
          this.datos.set(res.data || []);
          this.totalItems.set(res.total || 0);
        },
        error: (err) => {
          console.error('Error al cargar reporte de fechas:', err);
        }
      });
    });
  }

  mostrarDatos = computed(() => true);

  datosFiltrados = computed(() => this.datos());

  totalPaginas = computed(() => Math.ceil(this.totalItems() / this.itemsPorPagina()) || 1);
  
  datosPaginados = computed(() => this.datos());

  clientesUnicos = computed(() => new Set(this.datos().map(d => d.cliente)).size);
  lideresUnicos = computed(() => new Set(this.datos().map(d => d.lider)).size);
  recursosUnicos = computed(() => new Set(this.datos().map(d => d.recurso)).size);
  actividadesTotales = computed(() => this.totalItems());

  onInputSanitized(campo: string, event: Event) {
    const input = event.target as HTMLInputElement;
    const valorSanitizado = input.value.replace(/[0-9]/g, '').trimStart();
    input.value = valorSanitizado;

    let valorAnterior = '';
    
    if (campo === 'cliente') {
      valorAnterior = this.busquedaCliente();
      this.busquedaCliente.set(valorSanitizado);
    }
    if (campo === 'lider') {
      valorAnterior = this.busquedaLider();
      this.busquedaLider.set(valorSanitizado);
    }

    this.paginaActual.set(1);
    
    if (valorSanitizado === '' && valorAnterior !== '') {
      this.forzarMostrar.set(false);
    }
  }

  onFiltroChange(campo: string, valor: string) {
    if (campo === 'fechaInicio') this.fechaInicio.set(valor);
    if (campo === 'fechaFin') this.fechaFin.set(valor);
    this.paginaActual.set(1);
  }

  onItemsPorPaginaChange(val: any) {
    this.itemsPorPagina.set(Number(val));
    this.paginaActual.set(1);
  }

  cambiarPagina(delta: number) {
    this.paginaActual.update(p => p + delta);
  }

  verTodo() {
    this.forzarMostrar.set(true);
    this.busquedaCliente.set('');
    this.busquedaLider.set('');
    this.fechaInicio.set('');
    this.fechaFin.set('');
    this.paginaActual.set(1);
  }

  limpiarFiltros() {
    this.busquedaCliente.set('');
    this.busquedaLider.set('');
    this.fechaInicio.set('');
    this.fechaFin.set('');
    this.forzarMostrar.set(false);
    this.paginaActual.set(1);
  }

  async exportarExcel() {
    const filtros = {
      cliente: this.busquedaCliente() || undefined,
      lider: this.busquedaLider() || undefined,
      fechaInicio: this.fechaInicio() ? this.fechaInicio() + 'T00:00:00' : undefined,
      fechaFin: this.fechaFin() ? this.fechaFin() + 'T23:59:59' : undefined
    };

    const total = this.totalItems();
    if (total === 0) return;

    this.reportesService.getReporteFechas(filtros, 1, total).subscribe({
      next: async (res) => {
        const data = res.data || [];
        if (data.length === 0) return;

        await exportarReporteExcel({
          titulo: 'Reporte por Fechas de Asignación',
          nombreArchivo: 'Fechas',
          nombreHoja: 'Reporte de Fechas',
          columnas: [
            { encabezado: 'Código del Proyecto', anchoExcel: 20 },
            { encabezado: 'Proyecto', anchoExcel: 25 },
            { encabezado: 'Líder', anchoExcel: 25 },
            { encabezado: 'Cliente', anchoExcel: 25 },
            { encabezado: 'Estado del Proyecto', anchoExcel: 20 },
            { encabezado: 'Tipo de Proyecto', anchoExcel: 20 },
            { encabezado: 'Recurso', anchoExcel: 25 },
            { encabezado: 'Cargo', anchoExcel: 20 },
            { encabezado: 'Fecha de Inicio', anchoExcel: 15, alineacion: 'center' },
            { encabezado: 'Fecha de Fin Estimada', anchoExcel: 18, alineacion: 'center' },
            { encabezado: 'Fecha Fin Real', anchoExcel: 15, alineacion: 'center' },
            { encabezado: 'Presupuesto', anchoExcel: 15, alineacion: 'right' },
            { encabezado: 'Horas', anchoExcel: 12, alineacion: 'center' },
            { encabezado: 'Fecha Inicio Espera', anchoExcel: 18, alineacion: 'center' },
            { encabezado: 'Fecha Fin Espera', anchoExcel: 18, alineacion: 'center' },
            { encabezado: 'Observaciones', anchoExcel: 30 },
          ],
          filas: data.map((item) => [
            item.codigoProyecto || '',
            item.proyecto || '',
            item.lider,
            item.cliente,
            item.estadoProyecto || '',
            item.tipoProyecto || '',
            item.recurso,
            item.cargo,
            item.fechaInicio ? item.fechaInicio.toLocaleDateString('es-EC') : '',
            item.fechaFin ? item.fechaFin.toLocaleDateString('es-EC') : '',
            item.fechaFinReal ? item.fechaFinReal.toLocaleDateString('es-EC') : '',
            item.presupuesto !== null && item.presupuesto !== undefined ? `$${item.presupuesto.toFixed(2)}` : '',
            item.horas !== null && item.horas !== undefined ? item.horas : '',
            item.fechaInicioEspera ? item.fechaInicioEspera.toLocaleDateString('es-EC') : '',
            item.fechaFinEspera ? item.fechaFinEspera.toLocaleDateString('es-EC') : '',
            item.observaciones || '',
          ]),
          orientacionPdf: 'landscape',
        });
      },
      error: (err) => console.error('Error al exportar Excel:', err)
    });
  }

  async exportarPDF() {
    const filtros = {
      cliente: this.busquedaCliente() || undefined,
      lider: this.busquedaLider() || undefined,
      fechaInicio: this.fechaInicio() ? this.fechaInicio() + 'T00:00:00' : undefined,
      fechaFin: this.fechaFin() ? this.fechaFin() + 'T23:59:59' : undefined
    };

    const total = this.totalItems();
    if (total === 0) return;

    this.reportesService.getReporteFechas(filtros, 1, total).subscribe({
      next: async (res) => {
        const data = res.data || [];
        if (data.length === 0) return;

        await exportarReportePdf({
          titulo: 'Reporte por Fechas de Asignación',
          nombreArchivo: 'Fechas',
          nombreHoja: 'Reporte de Fechas',
          columnas: [
            { encabezado: 'Código del Proyecto', anchoPdf: 25 },
            { encabezado: 'Proyecto', anchoPdf: 30 },
            { encabezado: 'Líder', anchoPdf: 30 },
            { encabezado: 'Cliente', anchoPdf: 30 },
            { encabezado: 'Estado del Proyecto', anchoPdf: 22 },
            { encabezado: 'Tipo de Proyecto', anchoPdf: 22 },
            { encabezado: 'Recurso', anchoPdf: 30 },
            { encabezado: 'Cargo', anchoPdf: 22 },
            { encabezado: 'Fecha de Inicio', anchoPdf: 18, alineacion: 'center' },
            { encabezado: 'Fecha de Fin Estimada', anchoPdf: 20, alineacion: 'center' },
            { encabezado: 'Fecha Fin Real', anchoPdf: 18, alineacion: 'center' },
            { encabezado: 'Presupuesto', anchoPdf: 18, alineacion: 'right' },
            { encabezado: 'Horas', anchoPdf: 12, alineacion: 'center' },
            { encabezado: 'Fecha Inicio Espera', anchoPdf: 20, alineacion: 'center' },
            { encabezado: 'Fecha Fin Espera', anchoPdf: 20, alineacion: 'center' },
            { encabezado: 'Observaciones', anchoPdf: 35 },
          ],
          filas: data.map((item) => [
            item.codigoProyecto || '',
            item.proyecto || '',
            item.lider,
            item.cliente,
            item.estadoProyecto || '',
            item.tipoProyecto || '',
            item.recurso,
            item.cargo,
            item.fechaInicio ? item.fechaInicio.toLocaleDateString('es-EC') : '',
            item.fechaFin ? item.fechaFin.toLocaleDateString('es-EC') : '',
            item.fechaFinReal ? item.fechaFinReal.toLocaleDateString('es-EC') : '',
            item.presupuesto !== null && item.presupuesto !== undefined ? `$${item.presupuesto.toFixed(2)}` : '',
            item.horas !== null && item.horas !== undefined ? item.horas : '',
            item.fechaInicioEspera ? item.fechaInicioEspera.toLocaleDateString('es-EC') : '',
            item.fechaFinEspera ? item.fechaFinEspera.toLocaleDateString('es-EC') : '',
            item.observaciones || '',
          ]),
          orientacionPdf: 'landscape',
        });
      },
      error: (err) => console.error('Error al exportar PDF:', err)
    });
  }
}
