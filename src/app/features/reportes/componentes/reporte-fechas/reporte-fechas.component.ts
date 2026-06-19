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
    const data = this.datosFiltrados();
    if (data.length === 0) return;

    await exportarReporteExcel({
      titulo: 'Reporte por Fechas de Asignación',
      nombreArchivo: 'Fechas',
      nombreHoja: 'Reporte de Fechas',
      columnas: [
        { encabezado: 'Cliente', anchoExcel: 25, anchoPdf: 45 },
        { encabezado: 'Líder', anchoExcel: 25, anchoPdf: 42 },
        { encabezado: 'Recurso', anchoExcel: 25, anchoPdf: 45 },
        { encabezado: 'Cargo', anchoExcel: 25, anchoPdf: 38 },
        { encabezado: 'Inicio', anchoExcel: 15, anchoPdf: 25, alineacion: 'center' },
        { encabezado: 'Fin', anchoExcel: 15, anchoPdf: 25, alineacion: 'center' },
      ],
      filas: data.map((item) => [
        item.cliente,
        item.lider,
        item.recurso,
        item.cargo,
        item.fechaInicio ? item.fechaInicio.toLocaleDateString('es-EC') : '',
        item.fechaFin ? item.fechaFin.toLocaleDateString('es-EC') : '',
      ]),
      orientacionPdf: 'landscape',
    });
    return;

    const { Workbook } = await import('exceljs');
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Reporte de Fechas');

    // 1. Columnas y anchos recomendados
    worksheet.columns = [
      { header: 'Cliente', key: 'cliente', width: 25 },
      { header: 'Líder', key: 'lider', width: 25 },
      { header: 'Recurso', key: 'recurso', width: 25 },
      { header: 'Cargo', key: 'cargo', width: 25 },
      { header: 'Inicio', key: 'fechaInicio', width: 15 },
      { header: 'Fin', key: 'fechaFin', width: 15 }
    ];

    // 2. Agregar datos
    data.forEach(item => {
      worksheet.addRow({
        cliente: item.cliente,
        lider: item.lider,
        recurso: item.recurso,
        cargo: item.cargo,
        fechaInicio: item.fechaInicio ? item.fechaInicio.toLocaleDateString() : '',
        fechaFin: item.fechaFin ? item.fechaFin.toLocaleDateString() : ''
      });
    });

    // 3. Aplicar estilos a la cabecera
    const headerRow = worksheet.getRow(1);
    headerRow.height = 25;
    headerRow.eachCell(cell => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF163572' } // Color de marca principal #163572
      };
      cell.font = {
        name: 'Segoe UI',
        size: 11,
        bold: true,
        color: { argb: 'FFFFFFFF' }
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center'
      };
    });

    // 4. Aplicar estilos a las celdas de datos
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Omitir cabecera

      row.height = 20;

      // Cebra (alternar fondo gris y blanco)
      const fillType = rowNumber % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF';

      row.eachCell(cell => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: fillType }
        };
        cell.font = {
          name: 'Segoe UI',
          size: 10,
          color: { argb: 'FF334155' } // Gris oscuro #334155
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
        
        // Centrar las fechas
        if (cell.address.startsWith('E') || cell.address.startsWith('F')) {
          cell.alignment = {
            vertical: 'middle',
            horizontal: 'center'
          };
        } else {
          cell.alignment = {
            vertical: 'middle',
            horizontal: 'left'
          };
        }
      });
    });

    // 5. Descargar archivo
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Reporte_Fechas_${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async exportarPDF() {
    const data = this.datosFiltrados();
    if (data.length === 0) return;

    await exportarReportePdf({
      titulo: 'Reporte por Fechas de Asignación',
      nombreArchivo: 'Fechas',
      nombreHoja: 'Reporte de Fechas',
      columnas: [
        { encabezado: 'Cliente', anchoPdf: 45 },
        { encabezado: 'Líder', anchoPdf: 42 },
        { encabezado: 'Recurso', anchoPdf: 45 },
        { encabezado: 'Cargo', anchoPdf: 38 },
        { encabezado: 'Inicio', anchoPdf: 25, alineacion: 'center' },
        { encabezado: 'Fin', anchoPdf: 25, alineacion: 'center' },
      ],
      filas: data.map((item) => [
        item.cliente,
        item.lider,
        item.recurso,
        item.cargo,
        item.fechaInicio ? item.fechaInicio.toLocaleDateString('es-EC') : '',
        item.fechaFin ? item.fechaFin.toLocaleDateString('es-EC') : '',
      ]),
      orientacionPdf: 'landscape',
    });
    return;

    // Carga dinámica de jsPDF y jspdf-autotable
    const jsPDF = (await import('jspdf')).default;
    const autoTable = (await import('jspdf-autotable')).default;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Encabezado
    doc.setFillColor(22, 53, 114);
    doc.rect(0, 0, 297, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTE POR FECHAS DE ASIGNACIÓN', 148, 13, { align: 'center' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const fecha = new Date().toLocaleDateString('es-EC', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    doc.text(`Generado el: ${fecha}`, 285, 13, { align: 'right' });

    // AutoTable
    autoTable(doc, {
      startY: 26,
      head: [[
        'Cliente', 'Líder', 'Recurso', 'Cargo', 'Inicio', 'Fin'
      ]],
      body: data.map(item => [
        item.cliente,
        item.lider,
        item.recurso,
        item.cargo,
        item.fechaInicio ? item.fechaInicio.toLocaleDateString() : '',
        item.fechaFin ? item.fechaFin.toLocaleDateString() : ''
      ]),
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: 4,
        valign: 'middle',
      },
      headStyles: {
        fillColor: [22, 53, 114],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
        halign: 'center',
      },
      bodyStyles: {
        textColor: [55, 65, 81],
      },
      alternateRowStyles: {
        fillColor: [245, 247, 255],
      },
      columnStyles: {
        0: { cellWidth: 52 },
        1: { cellWidth: 50 },
        2: { cellWidth: 55 },
        3: { cellWidth: 45 },
        4: { halign: 'center', cellWidth: 37 },
        5: { halign: 'center', cellWidth: 38 },
      },
      margin: { left: 10, right: 10 },
      tableLineColor: [229, 231, 235],
      tableLineWidth: 0.1,
    });

    // Pie de página
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(156, 163, 175);
      doc.text(
        `Página ${i} de ${pageCount} — Integrity Solutions`,
        148, 205, { align: 'center' }
      );
    }

    // Guardar archivo
    const formatFecha = () => {
      const now = new Date();
      const d = now.getDate().toString().padStart(2, '0');
      const m = (now.getMonth() + 1).toString().padStart(2, '0');
      const y = now.getFullYear();
      return `${d}-${m}-${y}`;
    };
    doc.save(`reporte_fechas_${formatFecha()}.pdf`);
  }
}
