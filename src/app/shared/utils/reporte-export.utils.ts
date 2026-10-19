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
  subtituloPdf?: string;
}

/**
 * Avance opcional de una exportación (lo implementa DescargaProgresoService → ContextoDescarga): reporta
 * etapas al toast de progreso y corta antes de guardar si el usuario pulsó "Cancelar".
 */
export interface AvanceExportacion {
  actualizar(progreso: number, detalle: string): void;
  verificarCancelacion(): void;
}

// sm - Reporta una etapa y cede el hilo un instante para que el toast se repinte antes del trabajo pesado.
export async function reportarAvance(avance: AvanceExportacion | undefined, progreso: number, detalle: string): Promise<void> {
  if (!avance) return;
  avance.verificarCancelacion();
  avance.actualizar(progreso, detalle);
  await new Promise(resolve => setTimeout(resolve, 30));
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

export async function exportarReporteExcel(config: ReporteTabularConfig, avance?: AvanceExportacion): Promise<void> {
  await reportarAvance(avance, 30, 'Generando Excel...');
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
  // sm - Las filas crecen según el texto (antes 18 fijo: los textos largos quedaban cortados en la celda).
  ajustarAltoFilasExcel(worksheet, 3);

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

  await reportarAvance(avance, 75, 'Armando archivo...');
  const buffer = await workbook.xlsx.writeBuffer();
  await reportarAvance(avance, 95, 'Guardando archivo...');
  descargarBlob(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `Reporte_${config.nombreArchivo}_${fechaArchivo()}.xlsx`,
  );
}

// sm - Alto de cada fila desde la de encabezados según cuántas líneas ocupa su texto más largo con el ancho final de la
// columna (wrapText). ExcelJS no autoajusta el alto al abrir el archivo, así que se estima aquí: ~1 línea por cada
// "ancho de columna" de caracteres, 15 pt por línea, mínimo 18 pt.
function ajustarAltoFilasExcel(worksheet: any, filaEncabezados: number): void {
  worksheet.eachRow((row: any, rowNumber: number) => {
    if (rowNumber < filaEncabezados) return;
    let lineas = 1;
    row.eachCell((cell: any, colNumber: number) => {
      const ancho = Math.max(1, (worksheet.getColumn(colNumber).width ?? 10) - 2);
      const texto = String(cell.value ?? '');
      const lineasCelda = texto.split('\n').reduce((total, parte) => total + Math.max(1, Math.ceil(parte.length / ancho)), 0);
      lineas = Math.max(lineas, lineasCelda);
    });
    row.height = Math.max(18, lineas * 15);
  });
}

export async function exportarReporteExcelMultihoja(
  configs: ReporteTabularConfig[],
  nombreArchivo: string,
  avance?: AvanceExportacion,
): Promise<void> {
  await reportarAvance(avance, 30, 'Generando Excel...');
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
    // sm - Las filas crecen según el texto (antes 18 fijo: los textos largos quedaban cortados en la celda).
    ajustarAltoFilasExcel(worksheet, 3);

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

  await reportarAvance(avance, 75, 'Armando archivo...');
  const buffer = await workbook.xlsx.writeBuffer();
  await reportarAvance(avance, 95, 'Guardando archivo...');
  descargarBlob(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `Reporte_${nombreArchivo}_${fechaArchivo()}.xlsx`,
  );
}

export async function exportarReportePdf(config: ReporteTabularConfig, avance?: AvanceExportacion): Promise<void> {
  await reportarAvance(avance, 30, 'Generando PDF...');
  const doc = await crearReportePdf(config);
  await reportarAvance(avance, 95, 'Guardando archivo...');
  doc.save(`Reporte_${config.nombreArchivo}_${fechaArchivo()}.pdf`);
}

// Diseño estándar de todos los PDF tabulares, tomado del Reporte de Proyectos (proyectos-page.ts → descargarPDF):
// banda azul de 24mm con logo, título centrado y "Generado", título de sección subrayado, márgenes de 14mm
// y pie de página dibujado una sola vez al final (con el total real de páginas).
export async function crearReportePdf(config: ReporteTabularConfig): Promise<jsPDF> {
  const orientation = config.orientacionPdf ?? (config.columnas.length > 6 ? 'landscape' : 'portrait');
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: config.formatoPdf ?? (config.columnas.length > 12 ? 'a3' : 'a4'),
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const footerY = pageHeight - 10;
  const logo = await obtenerLogo();
  const fecha = formatearFecha(new Date());

  // Tablas muy anchas (muchas columnas) conservan una densidad menor para que quepan.
  const compacta = config.columnas.length > 12;
  const fontSize = config.columnas.length > 16 ? 5.4 : compacta ? 6 : 7.5;
  const bodyPadding = config.columnas.length > 16 ? 1 : compacta
    ? 1.4
    : { top: 4, bottom: 4, left: 5, right: 5 };
  const headPadding = compacta
    ? { top: 2, bottom: 2, left: 2, right: 2 }
    : { top: 5, bottom: 5, left: 6, right: 6 };

  // ── Cabecera de página ──
  const dibujarCabecera = () => {
    doc.setFillColor(22, 53, 114);
    doc.rect(0, 0, pageWidth, 24, 'F');

    if (logo) {
      doc.addImage(logo, 'PNG', marginX, 4, 38, 14);
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(config.titulo, pageWidth / 2, 15, { align: 'center' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generado: ${fecha}`, pageWidth - marginX, 15, { align: 'right' });

    doc.setDrawColor(99, 135, 190);
    doc.setLineWidth(0.5);
    doc.line(0, 24, pageWidth, 24);
  };

  // ── Pie de página ──
  const dibujarPie = (pagina: number, totalPaginas: number) => {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginX, footerY, pageWidth - marginX, footerY);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(156, 163, 175);
    doc.text(`Página ${pagina} de ${totalPaginas}`, pageWidth / 2, footerY + 5, { align: 'center' });
    doc.text(`TMR — ${config.titulo}`, marginX, footerY + 5);
    doc.text(fecha, pageWidth - marginX, footerY + 5, { align: 'right' });
  };

  // ── Título de sección subrayado ("Reporte de X" → "Resumen de X") ──
  const dibujarTituloSeccion = (texto: string, y: number) => {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 53, 114);
    doc.text(texto, marginX, y);
    doc.setDrawColor(22, 53, 114);
    doc.setLineWidth(0.3);
    doc.line(marginX, y + 2, marginX + doc.getTextWidth(texto) + 4, y + 2);
  };

  const anchoUtil = pageWidth - marginX * 2;
  const totalSolicitado = config.columnas.reduce((t, c) => t + (c.anchoPdf ?? 0), 0);
  const escala = totalSolicitado > 0 ? anchoUtil / totalSolicitado : 1;
  const columnStyles: Record<number, Partial<Styles>> = {};
  config.columnas.forEach((columna, index) => {
    columnStyles[index] = {
      cellWidth: columna.anchoPdf ? Math.floor(columna.anchoPdf * escala * 100) / 100 : 'auto',
      halign: columna.alineacion ?? 'left',
    };
  });

  const estilosTabla = {
    styles: {
      font: 'helvetica',
      fontSize,
      cellPadding: bodyPadding,
      valign: 'middle' as const,
      overflow: 'linebreak' as const,
      lineColor: [226, 232, 240] as [number, number, number],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [22, 53, 114] as [number, number, number],
      textColor: 255,
      fontStyle: 'bold' as const,
      fontSize: compacta ? fontSize : 8,
      halign: 'center' as const,
      valign: 'middle' as const,
      cellPadding: headPadding,
    },
    bodyStyles: { textColor: [55, 65, 81] as [number, number, number] },
    alternateRowStyles: { fillColor: [248, 250, 252] as [number, number, number] },
    margin: { left: marginX, right: marginX, bottom: 22, top: 30 },
    didDrawPage: () => dibujarCabecera(),
  };

  // ── Tabla principal ──
  dibujarCabecera();
  dibujarTituloSeccion(config.titulo.replace(/^Reporte\b/i, 'Resumen'), 34);

  let startY = 40;
  if (config.subtituloPdf) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    const lineas = doc.splitTextToSize(config.subtituloPdf, anchoUtil);
    doc.text(lineas, marginX, 41);
    startY = 41 + lineas.length * 3.5 + 2;
  }

  autoTable(doc, {
    ...estilosTabla,
    startY,
    head: [config.columnas.map((columna) => columna.encabezado)],
    body: config.filas,
    bodyStyles: { ...estilosTabla.bodyStyles, halign: 'left' },
    columnStyles,
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === config.columnaEstado) {
        const activo = String(data.cell.raw ?? '').toLowerCase() === 'activo';
        data.cell.styles.textColor = activo ? [22, 163, 74] : [107, 114, 128];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  // ── Segunda tabla: datos de salida ──
  if (config.columnasSalida && config.filasSalida && config.filasSalida.length > 0) {
    let y = (doc as any).lastAutoTable.finalY + 14;
    if (y > footerY - 40) {
      doc.addPage();
      dibujarCabecera();
      y = 34;
    }

    dibujarTituloSeccion('Datos de Salida', y);

    autoTable(doc, {
      ...estilosTabla,
      startY: y + 6,
      head: [config.columnasSalida.map((columna) => columna.encabezado)],
      body: config.filasSalida,
    });
  }

  // ── Pie en todas las páginas (una sola vez, con el total real) ──
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    dibujarPie(page, pageCount);
  }

  return doc;
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
