import { Component, signal, computed, OnInit, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReporteHoras } from '../../modelos/reporte-horas.model';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { ReportesService } from '../../servicios/reportes.service';

import { TablaComponent } from '../../../../shared/components/tabla-colega/tabla.component';
import { ColumnDefinition } from '../../../../shared/components/tabla-colega/tabla.types';
import { MatIconModule } from '@angular/material/icon';
import { DescargarMenuComponent } from '../../../colaboradores/componentes/descargar-menu/descargar-menu.component';
import { exportarReporteExcel, exportarReportePdf } from '../../../../shared/utils/reporte-export.utils';

@Component({
  selector: 'app-reporte-horas',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, TablaComponent, MatIconModule, DescargarMenuComponent],
  templateUrl: './reporte-horas.component.html',
  styleUrl: './reporte-horas.component.scss'
})
export class ReporteHorasComponent {
  columnasTabla: ColumnDefinition[] = [
    { header: 'Cliente', property: 'cliente', type: 'text' },
    { header: 'Estado Cliente', property: 'estadoCliente', type: 'badge-estado' },
    { header: 'Mes', property: 'mes', type: 'text' },
    { header: 'Año', property: 'anio', type: 'text' },
    { header: 'Recursos', property: 'recursos', type: 'text' },
    { header: 'Horas', property: 'horas', type: 'text' }
  ];

  Math = Math;
  meses = Array.from({ length: 12 }, (_, i) => {
    const nombre = new Intl.DateTimeFormat('es', { month: 'long' }).format(new Date(2000, i, 1));
    return nombre.charAt(0).toUpperCase() + nombre.slice(1);
  });
  anios: string[] = [];

  busquedaCliente = signal('');
  mesSeleccionado = signal('ALL');
  anioSeleccionado = signal('ALL');
  forzarMostrar = signal(false);

  paginaActual = signal(1);
  itemsPorPagina = signal(10);
  totalItems = signal(0);

  private reportesService = inject(ReportesService);
  datos = signal<ReporteHoras[]>([]);

  constructor() {
    effect(() => {
      const cliente = this.busquedaCliente();
      const mes = this.mesSeleccionado();
      const anio = this.anioSeleccionado();
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
        mes: mes || undefined,
        anio: anio || undefined
      };

      this.reportesService.getReporteHoras(filtros, page, pageSize).subscribe({
        next: (res) => {
          this.datos.set(res.data || []);
          this.totalItems.set(res.total || 0);

          if (res.anioMinimo && res.anioMaximo) {
            const min = res.anioMinimo;
            const max = res.anioMaximo;
            const nuevosAnios = Array.from({ length: max - min + 1 }, (_, i) => (min + i).toString());
            if (this.anios.join(',') !== nuevosAnios.join(',')) {
              this.anios = nuevosAnios;
            }
          }
        },
        error: (err) => {
          console.error('Error al cargar reporte de horas:', err);
        }
      });
    });
  }

  mostrarDatos = computed(() => true);

  datosFiltrados = computed(() => this.datos());

  totalPaginas = computed(() => Math.ceil(this.totalItems() / this.itemsPorPagina()) || 1);
  datosPaginados = computed(() => this.datos());

  // Note: These metrics are currently based on the current paginated page, 
  // but typically Server-Side filtering should return global totals from the backend. 
  // For now, we will leave them computed over this.datos().
  totalHoras = computed(() => this.datos().reduce((acc, curr) => acc + curr.horas, 0));
  totalRecursos = computed(() => this.datos().reduce((acc, curr) => acc + curr.recursos, 0));
  clientesUnicos = computed(() => new Set(this.datos().map(d => d.cliente)).size);

  onInputSanitized(campo: string, event: Event) {
    const input = event.target as HTMLInputElement;
    const sanitized = input.value.replace(/[0-9]/g, '').trimStart();
    input.value = sanitized;

    let valorAnterior = '';
    
    if (campo === 'cliente') {
      valorAnterior = this.busquedaCliente();
      this.busquedaCliente.set(sanitized);
    }

    this.paginaActual.set(1);
    
    if (sanitized === '' && valorAnterior !== '') {
      this.forzarMostrar.set(false);
    }
  }

  onMesChange(val: string) {
    this.mesSeleccionado.set(val);
    this.paginaActual.set(1);
    if (val === '') this.forzarMostrar.set(false);
  }

  onAnioChange(val: string) {
    this.anioSeleccionado.set(val);
    this.paginaActual.set(1);
    if (val === '') this.forzarMostrar.set(false);
  }

  verTodo() {
    this.forzarMostrar.set(true);
    this.mesSeleccionado.set('ALL');
    this.anioSeleccionado.set('ALL');
    this.busquedaCliente.set('');
    this.paginaActual.set(1);
  }

  limpiarFiltros() {
    this.busquedaCliente.set('');
    this.mesSeleccionado.set('');
    this.anioSeleccionado.set('');
    this.forzarMostrar.set(false);
    this.paginaActual.set(1);
  }

  onItemsPorPaginaChange(val: any) {
    this.itemsPorPagina.set(Number(val));
    this.paginaActual.set(1);
  }

  cambiarPagina(delta: number) {
    this.paginaActual.update(p => p + delta);
  }

  async exportarExcel() {
    const filtros = {
      cliente: this.busquedaCliente() || undefined,
      mes: this.mesSeleccionado() || undefined,
      anio: this.anioSeleccionado() || undefined
    };

    const total = this.totalItems();
    if (total === 0) return;

    this.reportesService.getReporteHoras(filtros, 1, total).subscribe({
      next: async (res) => {
        const data = res.data || [];
        if (data.length === 0) return;

        await exportarReporteExcel({
          titulo: 'Reporte de Horas por Cliente',
          nombreArchivo: 'Horas',
          nombreHoja: 'Reporte de Horas',
          columnas: [
            { encabezado: 'Cliente', anchoExcel: 30, anchoPdf: 75 },
            { encabezado: 'Estado Cliente', anchoExcel: 18, anchoPdf: 30, alineacion: 'center' },
            { encabezado: 'Mes', anchoExcel: 15, anchoPdf: 28, alineacion: 'center' },
            { encabezado: 'Año', anchoExcel: 15, anchoPdf: 20, alineacion: 'center' },
            { encabezado: 'Recursos', anchoExcel: 15, anchoPdf: 25, alineacion: 'center' },
            { encabezado: 'Horas', anchoExcel: 15, anchoPdf: 25, alineacion: 'center' },
          ],
          filas: data.map((item) => [
            item.cliente,
            item.estadoCliente,
            item.mes,
            item.anio,
            item.recursos,
            Number(item.horas).toFixed(1),
          ]),
          columnaEstado: 1,
          orientacionPdf: 'landscape',
        });
      },
      error: (err) => console.error('Error al exportar Excel:', err)
    });
  }

  async exportarPDF() {
    const filtros = {
      cliente: this.busquedaCliente() || undefined,
      mes: this.mesSeleccionado() || undefined,
      anio: this.anioSeleccionado() || undefined
    };

    const total = this.totalItems();
    if (total === 0) return;

    this.reportesService.getReporteHoras(filtros, 1, total).subscribe({
      next: async (res) => {
        const data = res.data || [];
        if (data.length === 0) return;

        await exportarReportePdf({
          titulo: 'Reporte de Horas por Cliente',
          nombreArchivo: 'Horas',
          nombreHoja: 'Reporte de Horas',
          columnas: [
            { encabezado: 'Cliente', anchoPdf: 75 },
            { encabezado: 'Estado Cliente', anchoPdf: 30, alineacion: 'center' },
            { encabezado: 'Mes', anchoPdf: 28, alineacion: 'center' },
            { encabezado: 'Año', anchoPdf: 20, alineacion: 'center' },
            { encabezado: 'Recursos', anchoPdf: 25, alineacion: 'center' },
            { encabezado: 'Horas', anchoPdf: 25, alineacion: 'center' },
          ],
          filas: data.map((item) => [
            item.cliente,
            item.estadoCliente,
            item.mes,
            item.anio,
            item.recursos,
            Number(item.horas).toFixed(1),
          ]),
          columnaEstado: 1,
          orientacionPdf: 'landscape',
        });
      },
      error: (err) => console.error('Error al exportar PDF:', err)
    });
  }
}
