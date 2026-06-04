import { Injectable } from '@angular/core';
import { Colaborador } from '../models/colaborador.model';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

@Injectable({ providedIn: 'root' })
export class ExportarService {

  // ── EXPORTAR PDF ──────────────────────────────────────
  exportarPDF(colaboradores: Colaborador[]): void {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    doc.setFillColor(22, 53, 114);
    doc.rect(0, 0, 297, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTE DE COLABORADORES', 148, 13, { align: 'center' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const fecha = new Date().toLocaleDateString('es-EC', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    doc.text(`Generado el: ${fecha}`, 285, 13, { align: 'right' });

    autoTable(doc, {
      startY: 26,
      head: [[
        'Identificación', 'Tipo', 'Nombre', 'Núm. Proyectos',
        'Correo electrónico', 'Cargo', 'Estado'
      ]],
      body: colaboradores.map(c => [
        c.identificacion,
        c.tipoIdentificacion,
        c.nombreCompleto,
        c.numProyectos.toString(),
        c.correoElectronico,
        c.cargo,
        c.estado,
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
        0: { halign: 'center', cellWidth: 30 },
        1: { halign: 'center', cellWidth: 15 },
        2: { cellWidth: 45 },
        3: { halign: 'center', cellWidth: 25 },
        4: { cellWidth: 60 },
        5: { cellWidth: 45 },
        6: { halign: 'center', cellWidth: 22 },
      },
      willDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 6) {
          const estado = data.cell.raw as string;
          data.cell.styles.textColor = estado === 'Activo'
            ? [22, 163, 74]
            : [107, 114, 128];
        }
      },
      margin: { left: 10, right: 10 },
      tableLineColor: [229, 231, 235],
      tableLineWidth: 0.1,
    });

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

    doc.save(`colaboradores_${this.getFechaArchivo()}.pdf`);
  }

  // ── EXPORTAR EXCEL ────────────────────────────────────
  exportarExcel(colaboradores: Colaborador[]): void {
    const wb = XLSX.utils.book_new();

    // ── Hoja principal ──────────────────────────────────
    const titulo  = [['REPORTE DE COLABORADORES — Integrity Solutions']];
    const subfila = [[`Generado el: ${new Date().toLocaleDateString('es-EC')}`]];
    const headers = [[
      '#', 'Identificación', 'Tipo', 'Nombre Completo',
      'Núm. Proyectos', 'Correo Electrónico', 'Cargo',
      'Departamento', 'Modalidad', 'Categoría',
      'Años Experiencia', 'Teléfono', 'Género',
      'Fecha Nacimiento', 'Fecha Contratación', 'Dirección', 'Estado'
    ]];

    const filas = colaboradores.map((c, i) => [
      i + 1,
      c.identificacion,
      c.tipoIdentificacion,
      c.nombreCompleto,
      c.numProyectos,
      c.correoElectronico,
      c.cargo,
      c.departamento,
      c.modalidad,
      c.categoria,
      c.aniosExperiencia,
      c.telefono,
      c.genero,
      this.formatFecha(c.fechaNacimiento),
      this.formatFecha(c.fechaContratacion),
      c.direccion,
      c.estado,
    ]);

    const todasLasFilas = [...titulo, ...subfila, ...headers, ...filas];
    const ws = XLSX.utils.aoa_to_sheet(todasLasFilas);

    // ── Estilos de celdas ───────────────────────────────
    const totalCols = 17;
    const totalFilas = todasLasFilas.length;

    // Estilo título — fila 1
    const celdaTitulo = ws['A1'];
    if (celdaTitulo) {
      celdaTitulo.s = {
        font:      { bold: true, sz: 14, color: { rgb: 'FFFFFF' } },
        fill:      { fgColor: { rgb: '163572' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }

    // Merge título A1:Q1
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } },
    ];

    // Estilo subfila — fila 2
    const celdaSubfila = ws['A2'];
    if (celdaSubfila) {
      celdaSubfila.s = {
        font:      { italic: true, sz: 9, color: { rgb: '6B7280' } },
        fill:      { fgColor: { rgb: 'F0F4FF' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }

    // Estilo headers — fila 3
    const colLetras = 'ABCDEFGHIJKLMNOPQ'.split('');
    colLetras.forEach(col => {
      const celda = ws[`${col}3`];
      if (celda) {
        celda.s = {
          font:      { bold: true, sz: 9, color: { rgb: 'FFFFFF' } },
          fill:      { fgColor: { rgb: '163572' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            bottom: { style: 'thin', color: { rgb: 'FFFFFF' } },
          },
        };
      }
    });

    // Estilo filas de datos
    for (let row = 4; row <= totalFilas; row++) {
      const esAlterna = (row % 2 === 0);
      const fillColor = esAlterna ? 'F5F7FF' : 'FFFFFF';

      colLetras.forEach((col, colIdx) => {
        const ref = `${col}${row}`;
        const celda = ws[ref];
        if (celda) {
          // Estado con color
          if (colIdx === 16) {
            const esActivo = celda.v === 'Activo';
            celda.s = {
              font:      { sz: 9, color: { rgb: esActivo ? '16A34A' : '6B7280' }, bold: true },
              fill:      { fgColor: { rgb: fillColor } },
              alignment: { horizontal: 'center', vertical: 'center' },
              border:    this.getBorder(),
            };
          } else {
            celda.s = {
              font:      { sz: 9, color: { rgb: '374151' } },
              fill:      { fgColor: { rgb: fillColor } },
              alignment: {
                horizontal: colIdx === 0 || colIdx === 2 || colIdx === 4 ? 'center' : 'left',
                vertical: 'center',
              },
              border: this.getBorder(),
            };
          }
        }
      });
    }

    // Ancho de columnas
    ws['!cols'] = [
      { wch: 5  },
      { wch: 16 },
      { wch: 8  },
      { wch: 30 },
      { wch: 15 },
      { wch: 35 },
      { wch: 25 },
      { wch: 22 },
      { wch: 13 },
      { wch: 13 },
      { wch: 16 },
      { wch: 14 },
      { wch: 14 },
      { wch: 18 },
      { wch: 18 },
      { wch: 30 },
      { wch: 12 },
    ];

    // Alto de filas
    const rowHeights: { hpt: number }[] = [
      { hpt: 28 }, // título
      { hpt: 16 }, // subfila
      { hpt: 20 }, // headers
    ];
    for (let i = 3; i < totalFilas; i++) {
      rowHeights.push({ hpt: 18 });
    }
    ws['!rows'] = rowHeights;

    XLSX.utils.book_append_sheet(wb, ws, 'Colaboradores');

    // ── Hoja resumen ────────────────────────────────────
    const resumenFilas = [
      ['RESUMEN DE COLABORADORES'],
      [''],
      ['Métrica', 'Total'],
      ['Total colaboradores',         colaboradores.length],
      ['Activos',                     colaboradores.filter(c => c.estado === 'Activo').length],
      ['Inactivos',                   colaboradores.filter(c => c.estado === 'Inactivo').length],
      ['No asignados (0 proyectos)',  colaboradores.filter(c => c.numProyectos === 0 && c.estado === 'Activo').length],
      ['Asignados (1+ proyectos)',    colaboradores.filter(c => c.numProyectos > 0 && c.estado === 'Activo').length],
    ];

    const wsResumen = XLSX.utils.aoa_to_sheet(resumenFilas);

    // Estilo resumen título
    const tituloResumen = wsResumen['A1'];
    if (tituloResumen) {
      tituloResumen.s = {
        font:      { bold: true, sz: 13, color: { rgb: 'FFFFFF' } },
        fill:      { fgColor: { rgb: '163572' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }

    wsResumen['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
    ];

    // Estilo headers resumen
    ['A3', 'B3'].forEach(ref => {
      const celda = wsResumen[ref];
      if (celda) {
        celda.s = {
          font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '163572' } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: this.getBorder(),
        };
      }
    });

    // Estilo filas resumen
    for (let row = 4; row <= resumenFilas.length; row++) {
      const esAlterna = (row % 2 === 0);
      ['A', 'B'].forEach((col, idx) => {
        const ref = `${col}${row}`;
        const celda = wsResumen[ref];
        if (celda) {
          celda.s = {
            font:      { sz: 10, color: { rgb: idx === 1 ? '163572' : '374151' }, bold: idx === 1 },
            fill:      { fgColor: { rgb: esAlterna ? 'F0F4FF' : 'FFFFFF' } },
            alignment: { horizontal: idx === 1 ? 'center' : 'left', vertical: 'center' },
            border:    this.getBorder(),
          };
        }
      });
    }

    wsResumen['!cols'] = [{ wch: 30 }, { wch: 12 }];
    wsResumen['!rows'] = [{ hpt: 26 }, { hpt: 8 }, { hpt: 20 },
      ...Array(resumenFilas.length - 3).fill({ hpt: 20 })
    ];

    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

    XLSX.writeFile(wb, `colaboradores_${this.getFechaArchivo()}.xlsx`);
  }

  // ── Helpers ───────────────────────────────────────────
  private getBorder() {
    return {
      top:    { style: 'thin', color: { rgb: 'E5E7EB' } },
      bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
      left:   { style: 'thin', color: { rgb: 'E5E7EB' } },
      right:  { style: 'thin', color: { rgb: 'E5E7EB' } },
    };
  }

  private formatFecha(fecha: string): string {
    if (!fecha) return '—';
    const [y, m, d] = fecha.split('-');
    return `${d}/${m}/${y}`;
  }

  private getFechaArchivo(): string {
    const now = new Date();
    const d = now.getDate().toString().padStart(2, '0');
    const m = (now.getMonth() + 1).toString().padStart(2, '0');
    const y = now.getFullYear();
    return `${d}-${m}-${y}`;
  }
}
