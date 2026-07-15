import jsPDF from 'jspdf';
import autoTable, { Styles } from 'jspdf-autotable';

export interface ColumnaReporte {
  encabezado: string;
  anchoExcel?: number;
  anchoPdf?: number;
  alineacion?: 'left' | 'center' | 'right';
}

export interface ReporteTabularConfig {
  titulo: string;
  nombreArchivo: string;
  nombreHoja: string;

  columnas: ColumnaReporte[];
  filas: Array<Array<string | number>>;

  columnasSalida?: ColumnaReporte[];
  filasSalida?: Array<Array<string | number>>;

  columnaEstado?: number;
  orientacionPdf?: 'portrait' | 'landscape';
  formatoPdf?: 'letter' | 'a4' | 'a3';
}

const COLOR_CABECERA = 'FF163572';
const COLOR_TABLA = 'FF163572';
const COLOR_TEXTO = 'FF334155';
const COLOR_BORDE = 'FFE2E8F0';
const COLOR_ALTERNO = 'FFF8FAFC';
const LOGO_URLS = [
  '/assets/img/logo-reporte-integrity.png',
  'assets/img/logo-reporte-integrity.png',
  '/assets/img/logo-integrity.png',
];

export function fechaArchivo(fecha = new Date()): string {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function agregarCabeceraExcel(
  workbook: any,
  worksheet: any,
  tituloReporte: string,
  cantidadColumnas: number,
): Promise<void> {
  worksheet.spliceRows(1, 0, [], []);
  worksheet.mergeCells(1, 3, 1, cantidadColumnas);
  worksheet.mergeCells(2, 3, 2, cantidadColumnas);

  for (let rowNumber = 1; rowNumber <= 2; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    row.height = rowNumber === 1 ? 79.25 : 28.25;
    for (let colNumber = 1; colNumber <= cantidadColumnas; colNumber++) {
      const cell = row.getCell(colNumber);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_CABECERA } };
    }
  }

  const titulo = worksheet.getCell(1, 3);
  titulo.value = tituloReporte;
  titulo.font = { name: 'Calibri', size: 20, bold: true, color: { argb: 'FFFFFFFF' } };
  titulo.alignment = { vertical: 'bottom', horizontal: 'center' };

  const generado = worksheet.getCell(2, 3);
  generado.value = '';
  generado.font = { name: 'Calibri', size: 10, color: { argb: 'FFFFFFFF' } };
  generado.alignment = { vertical: 'middle', horizontal: 'right' };

  const logo = await obtenerLogo();
  if (logo) {
    const logoId = workbook.addImage({ base64: logo, extension: 'png' });
    worksheet.addImage(logoId, {
      tl: { col: 0.15, row: 0.12 },
      ext: { width: 172, height: 55 },
    });
  }
  worksheet.views = [{ state: 'frozen', ySplit: 3 }];
  worksheet.autoFilter = {
    from: { row: 3, column: 1 },
    to: { row: 3, column: cantidadColumnas },
  };
  worksheet.pageSetup = {
    orientation: cantidadColumnas > 6 ? 'landscape' : 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    printTitlesRow: '1:3',
    margins: { left: 0.35, right: 0.35, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
  };
}

export async function estandarizarCabeceraExcelExistente(
  workbook: any,
  worksheet: any,
  tituloReporte: string,
  cantidadColumnas: number,
  detalle?: string,
  filaEncabezados = 4,
  aplicarFiltro = true
): Promise<void> {
  try { worksheet.unMergeCells(1, 1, 1, cantidadColumnas); } catch { }
  try { worksheet.unMergeCells(2, 1, 2, cantidadColumnas); } catch { }
  worksheet.mergeCells(1, 3, 1, cantidadColumnas);
  worksheet.mergeCells(2, 3, 2, cantidadColumnas);

  for (let rowNumber = 1; rowNumber <= 2; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    row.height = rowNumber === 1 ? 79.25 : 28.25;
    for (let colNumber = 1; colNumber <= cantidadColumnas; colNumber++) {
      row.getCell(colNumber).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLOR_CABECERA },
      };
    }
  }

  const titulo = worksheet.getCell(1, 3);
  titulo.value = tituloReporte;
  titulo.font = { name: 'Calibri', size: 20, bold: true, color: { argb: 'FFFFFFFF' } };
  titulo.alignment = { vertical: 'bottom', horizontal: 'center' };

  const generado = worksheet.getCell(2, 3);
  generado.value = detalle ? `${detalle} | Generado: ${formatearFecha(new Date())}` : `Generado: ${formatearFecha(new Date())}`;
  generado.font = { name: 'Calibri', size: 10, color: { argb: 'FFFFFFFF' } };
  generado.alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };

  const logo = await obtenerLogo();
  if (logo) {
    const logoId = workbook.addImage({ base64: logo, extension: 'png' });
    worksheet.addImage(logoId, {
      tl: { col: 0.15, row: 0.12 },
      ext: { width: 172, height: 55 },
    });
  }

  worksheet.views = [{ state: 'frozen', ySplit: filaEncabezados }];
  
  if (aplicarFiltro) {
    worksheet.autoFilter = {
      from: { row: filaEncabezados, column: 1 },
      to: { row: filaEncabezados, column: cantidadColumnas },
    };
  }

  worksheet.pageSetup = {
    orientation: cantidadColumnas > 6 ? 'landscape' : 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    printTitlesRow: `1:${filaEncabezados}`,
    margins: { left: 0.35, right: 0.35, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
  };
}

export async function exportarReporteExcel(config: ReporteTabularConfig): Promise<void> {
  const ExcelJS = await import('exceljs');
  const Workbook = ExcelJS.Workbook || (ExcelJS as any).default?.Workbook || (ExcelJS as any).default;
  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet(config.nombreHoja);

  worksheet.columns = config.columnas.map((columna, index) => ({
    key: `columna${index}`,
    width: columna.anchoExcel ?? 20,
  }));
  worksheet.addRow([]);
  worksheet.addRow([]);
  worksheet.addRow(config.columnas.map((columna) => columna.encabezado));
  config.filas.forEach((fila) => worksheet.addRow(fila));

  const ultimaColumna = config.columnas.length;
  worksheet.mergeCells(1, 3, 1, ultimaColumna);
  worksheet.mergeCells(2, 3, 2, ultimaColumna);

  for (let rowNumber = 1; rowNumber <= 2; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    row.height = rowNumber === 1 ? 79.25 : 28.25;
    for (let colNumber = 1; colNumber <= ultimaColumna; colNumber++) {
      const cell = row.getCell(colNumber);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_CABECERA } };
      if (rowNumber === 2) {
        cell.border = { bottom: { style: 'thin', color: { argb: COLOR_TABLA } } };
      }
    }
  }

  const tituloCell = worksheet.getCell(1, 3);
  tituloCell.value = config.titulo;
  tituloCell.font = { name: 'Calibri', size: 20, bold: true, color: { argb: 'FFFFFFFF' } };
  tituloCell.alignment = { vertical: 'bottom', horizontal: 'left' };

  const generadoCell = worksheet.getCell(2, 3);
  generadoCell.value = '';
  generadoCell.font = { name: 'Calibri', size: 10, color: { argb: 'FFFFFFFF' } };
  generadoCell.alignment = { vertical: 'middle', horizontal: 'right' };

  const logo = await obtenerLogo();
  if (logo) {
    const logoId = workbook.addImage({ base64: logo, extension: 'png' });
    worksheet.addImage(logoId, {
      tl: { col: 0.15, row: 0.12 },
      ext: { width: 172, height: 55 },
    });
  }

  const header = worksheet.getRow(3);
  header.height = 18;
  header.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_CABECERA } };
    cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    const border = { style: 'thin' as const, color: { argb: COLOR_CABECERA } };
    cell.border = { top: border, left: border, bottom: border, right: border };
  });

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= 3) return;
    row.height = 18;
    row.eachCell((cell, colNumber) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: rowNumber % 2 === 0 ? COLOR_ALTERNO : 'FFFFFFFF' },
      };
      cell.font = { name: 'Segoe UI', size: 10, color: { argb: COLOR_TEXTO } };
      const border = { style: 'thin' as const, color: { argb: COLOR_BORDE } };
      cell.border = { top: border, left: border, bottom: border, right: border };
      cell.alignment = {
        vertical: 'middle',
        horizontal: config.columnas[colNumber - 1]?.alineacion ?? 'left',
        wrapText: true,
      };
      if (colNumber - 1 === config.columnaEstado) {
        const activo = String(cell.value ?? '').toLowerCase() === 'activo';
        cell.font = {
          name: 'Segoe UI',
          size: 10,
          bold: true,
          color: { argb: activo ? 'FF16A34A' : 'FF6B7280' },
        };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }
    });
  });

  const maximoPorColumna = config.columnas.length > 12 ? 28 : config.columnas.length > 8 ? 36 : 50;
  worksheet.columns.forEach((column, index) => {
    let maximo = config.columnas[index]?.encabezado.length ?? 10;
    column.eachCell?.({ includeEmpty: false }, (cell, rowNumber) => {
      if (rowNumber < 3) return;
      maximo = Math.max(maximo, String(cell.value ?? '').length);
    });
    column.width = Math.min(maximoPorColumna, Math.max(column.width ?? 10, maximo + 3));
  });

  worksheet.views = [{ state: 'frozen', ySplit: 3 }];
  worksheet.autoFilter = {
    from: { row: 3, column: 1 },
    to: { row: 3, column: ultimaColumna },
  };
  worksheet.pageSetup = {
    orientation: config.orientacionPdf ?? (config.columnas.length > 6 ? 'landscape' : 'portrait'),
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    printTitlesRow: '1:3',
    margins: { left: 0.35, right: 0.35, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  descargarBlob(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `Reporte_${config.nombreArchivo}_${fechaArchivo()}.xlsx`,
  );
}

export async function exportarReporteExcelMultihoja(
  configs: ReporteTabularConfig[],
  nombreArchivo: string,
): Promise<void> {
  const ExcelJS = await import('exceljs');
  const Workbook = ExcelJS.Workbook || (ExcelJS as any).default?.Workbook || (ExcelJS as any).default;
  const workbook = new Workbook();
  const logo = await obtenerLogo();

  for (const config of configs) {
    const worksheet = workbook.addWorksheet(config.nombreHoja);

    worksheet.columns = config.columnas.map((columna, index) => ({
      key: `columna${index}`,
      width: columna.anchoExcel ?? 20,
    }));
    worksheet.addRow([]);
    worksheet.addRow([]);
    worksheet.addRow(config.columnas.map((columna) => columna.encabezado));
    config.filas.forEach((fila) => worksheet.addRow(fila));

    const ultimaColumna = config.columnas.length;
    worksheet.mergeCells(1, 3, 1, ultimaColumna);
    worksheet.mergeCells(2, 3, 2, ultimaColumna);

    for (let rowNumber = 1; rowNumber <= 2; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      row.height = rowNumber === 1 ? 79.25 : 28.25;
      for (let colNumber = 1; colNumber <= ultimaColumna; colNumber++) {
        const cell = row.getCell(colNumber);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_CABECERA } };
        if (rowNumber === 2) {
          cell.border = { bottom: { style: 'thin', color: { argb: COLOR_TABLA } } };
        }
      }
    }

    const tituloCell = worksheet.getCell(1, 3);
    tituloCell.value = config.titulo;
    tituloCell.font = { name: 'Calibri', size: 20, bold: true, color: { argb: 'FFFFFFFF' } };
    tituloCell.alignment = { vertical: 'bottom', horizontal: 'left' };

    const generadoCell = worksheet.getCell(2, 3);
    generadoCell.value = '';
    generadoCell.font = { name: 'Calibri', size: 10, color: { argb: 'FFFFFFFF' } };
    generadoCell.alignment = { vertical: 'middle', horizontal: 'right' };

    if (logo) {
      const logoId = workbook.addImage({ base64: logo, extension: 'png' });
      worksheet.addImage(logoId, {
        tl: { col: 0.15, row: 0.12 },
        ext: { width: 172, height: 55 },
      });
    }

    const header = worksheet.getRow(3);
    header.height = 18;
    header.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_CABECERA } };
      cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      const border = { style: 'thin' as const, color: { argb: COLOR_CABECERA } };
      cell.border = { top: border, left: border, bottom: border, right: border };
    });

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber <= 3) return;
      row.height = 18;
      row.eachCell((cell, colNumber) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: rowNumber % 2 === 0 ? COLOR_ALTERNO : 'FFFFFFFF' },
        };
        cell.font = { name: 'Segoe UI', size: 10, color: { argb: COLOR_TEXTO } };
        const border = { style: 'thin' as const, color: { argb: COLOR_BORDE } };
        cell.border = { top: border, left: border, bottom: border, right: border };
        cell.alignment = {
          vertical: 'middle',
          horizontal: config.columnas[colNumber - 1]?.alineacion ?? 'left',
          wrapText: true,
        };
        if (colNumber - 1 === config.columnaEstado) {
          const activo = String(cell.value ?? '').toLowerCase() === 'activo';
          cell.font = {
            name: 'Segoe UI',
            size: 10,
            bold: true,
            color: { argb: activo ? 'FF16A34A' : 'FF6B7280' },
          };
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        }
      });
    });

    const maximoPorColumna = config.columnas.length > 12 ? 28 : config.columnas.length > 8 ? 36 : 50;
    worksheet.columns.forEach((column, index) => {
      let maximo = config.columnas[index]?.encabezado.length ?? 10;
      column.eachCell?.({ includeEmpty: false }, (cell, rowNumber) => {
        if (rowNumber < 3) return;
        maximo = Math.max(maximo, String(cell.value ?? '').length);
      });
      column.width = Math.min(maximoPorColumna, Math.max(column.width ?? 10, maximo + 3));
    });

    worksheet.views = [{ state: 'frozen', ySplit: 3 }];
    worksheet.autoFilter = {
      from: { row: 3, column: 1 },
      to: { row: 3, column: ultimaColumna },
    };
    worksheet.pageSetup = {
      orientation: config.orientacionPdf ?? (config.columnas.length > 6 ? 'landscape' : 'portrait'),
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      printTitlesRow: '1:3',
      margins: { left: 0.35, right: 0.35, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  descargarBlob(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `Reporte_${nombreArchivo}_${fechaArchivo()}.xlsx`,
  );
}

export async function exportarReportePdf(config: ReporteTabularConfig): Promise<void> {
  const orientation = config.orientacionPdf ?? (config.columnas.length > 6 ? 'landscape' : 'portrait');
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: config.formatoPdf ?? (config.columnas.length > 12 ? 'a3' : 'a4'),
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 0;
  const logo = await obtenerLogo();
  const fecha = formatearFecha(new Date());

  const dibujarCabecera = () => {
    doc.setFillColor(31, 73, 125);
    doc.rect(0, 0, pageWidth, 30, 'F');
    if (logo) doc.addImage(logo, 'PNG', margin, 6, 50, 15);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    const titleSize = config.titulo.length > 32 ? 13 : config.titulo.length > 24 ? 14 : 15;
    doc.setFontSize(titleSize);
    const titleLines = doc.splitTextToSize(config.titulo, pageWidth - (margin + 60) * 2);
    doc.text(titleLines, pageWidth * 0.73, titleLines.length > 1 ? 16 : 17, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
  };
  const anchoUtil = pageWidth - margin * 2;
  const totalSolicitado = config.columnas.reduce((t, c) => t + (c.anchoPdf ?? 0), 0);
  const escala = totalSolicitado > 0 ? anchoUtil / totalSolicitado : 1;
  const columnStyles: Record<number, Partial<Styles>> = {};
  config.columnas.forEach((columna, index) => {
    columnStyles[index] = {
      cellWidth: columna.anchoPdf ? Math.floor(columna.anchoPdf * escala * 100) / 100 : 'auto',
      halign: columna.alineacion ?? 'left',
    };
  });

  dibujarCabecera();
  autoTable(doc, {
    startY: 30,
    head: [config.columnas.map((columna) => columna.encabezado)],
    body: config.filas,
    styles: {
      font: 'helvetica',
      fontSize: config.columnas.length > 16 ? 5.4 : config.columnas.length > 12 ? 6 : 7.5,
      cellPadding: config.columnas.length > 16 ? 1 : config.columnas.length > 12 ? 1.4 : 2,
      overflow: 'linebreak',
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [22, 53, 114],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 },
    },
    bodyStyles: { textColor: [51, 65, 85], halign: 'left' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles,
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === config.columnaEstado) {
        const activo = String(data.cell.raw ?? '').toLowerCase() === 'activo';
        data.cell.styles.textColor = activo ? [22, 163, 74] : [107, 114, 128];
        data.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: 0, right: 0, bottom: 18, top: 0 },
    didDrawPage: dibujarCabecera,
  });


 //=====================================================
  // SEGUNDA TABLA: DATOS DE SALIDA
  //=====================================================

  if (
    config.columnasSalida &&
    config.filasSalida &&
    config.filasSalida.length > 0
  ) {

    const ultimaTabla = (doc as any).lastAutoTable;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(22,53,114);

    doc.text(
      'DATOS DE SALIDA',
      0,
      ultimaTabla.finalY + 10
    );

    autoTable(doc,{
      startY: ultimaTabla.finalY + 14,

      head:[
        config.columnasSalida.map(c=>c.encabezado)
      ],

      body: config.filasSalida,

      theme:'grid',

      headStyles:{
        fillColor:[22,53,114],
        textColor:255,
        fontStyle:'bold',
        halign:'center'
      },

      alternateRowStyles:{
        fillColor:[248,250,252]
      },

      styles:{
        font:'helvetica',
        fontSize:8,
        cellPadding:2
      }
    });

  }

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    const footerY = pageHeight - 8;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, footerY, pageWidth - margin, footerY);
    doc.setTextColor(156, 163, 175);
    doc.setFontSize(7);
    doc.text(`Página ${page} de ${pageCount}`, pageWidth / 2, footerY + 4, { align: 'center' });
    doc.text(`TMR - ${config.titulo}`, margin, footerY + 4);
    doc.text(fecha, pageWidth - margin, footerY + 4, { align: 'right' });
  }

  doc.save(`Reporte_${config.nombreArchivo}_${fechaArchivo()}.pdf`);
}

export async function obtenerLogoReporte(): Promise<string | null> {
  for (const ruta of LOGO_URLS) {
    try {
      const url = new URL(ruta, document.baseURI).toString();
      const response = await fetch(url, { cache: 'no-cache' });
      if (!response.ok) continue;

      const blob = await response.blob();
      if (!blob.type.startsWith('image/')) continue;

      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
    } catch {
      // Intenta la siguiente ruta disponible.
    }
  }

  return null;
}

const obtenerLogo = obtenerLogoReporte;

function formatearFecha(fecha: Date): string {
  return fecha.toLocaleDateString('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function descargarBlob(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nombre;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}