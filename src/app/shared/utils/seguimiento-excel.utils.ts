import * as ExcelJS from 'exceljs';
import { estandarizarCabeceraExcelExistente } from './reporte-export.utils';
import { ActividadSeguimientoPdf, DatosSeguimientoPdf } from './seguimiento-pdf.utils';

export async function crearReporteSeguimientoExcel(
  nombreColaborador: string,
  fechaDesde: string,
  fechaHasta: string,
  datos: DatosSeguimientoPdf,
  nombreProyecto: string,
): Promise<ArrayBuffer> {
  const fechas = fechasDelPeriodo(fechaDesde, fechaHasta);
  const actividades = datos.actividades || [];
  const feriados = new Set(datos.feriados || []);
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(nombreHoja(nombreProyecto));
  const totalDias = fechas.length;
  const totalColumnas = 6 + totalDias + 1;
  worksheet.columns = [5, 20, 25, 25, 60, 15].concat(fechas.map(() => 4.5), [15]).map((width, index) => ({ key: 'col_' + (index + 1), width }));
  worksheet.getCell(4, 1).value = 'Cliente:';
  worksheet.getCell(4, 3).value = clienteDe(actividades);
  worksheet.getCell(5, 1).value = 'Nombre del consultor:';
  worksheet.getCell(5, 3).value = nombreColaborador;
  [4, 5].forEach(row => {
    worksheet.getCell(row, 1).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF163572' } };
    worksheet.getCell(row, 3).font = { name: 'Arial', size: 11, bold: true };
  });
  const headers = ['N°', 'TIPO DE ACTIVIDAD', 'LIDER DE PROYECTO', 'CODIGO REQUERIMIENTO / INCIDENTE', 'DESCRIPCION DE TRABAJOS REALIZADOS', 'TOTAL HORAS POR ACTIVIDAD', 'DISTRIBUCION DE TIEMPO DEL DIA', 'TOTAL HORAS POR ACT.'];
  headers.forEach((value, index) => worksheet.getCell(6, index < 6 ? index + 1 : index === 6 ? 7 : totalColumnas).value = value);
  [1, 2, 3, 4, 5, 6, totalColumnas].forEach(column => worksheet.mergeCells(6, column, 8, column));
  worksheet.mergeCells(6, 7, 6, 6 + totalDias);
  fechas.forEach((date, index) => {
    worksheet.getCell(7, 7 + index).value = dia(date);
    worksheet.getCell(8, 7 + index).value = ['D', 'L', 'M', 'M', 'J', 'V', 'S'][date.getDay()];
  });
  const azul: ExcelJS.Fill = fill('FF163572');
  for (let row = 6; row <= 8; row++) {
    for (let column = 1; column <= totalColumnas; column++) {
      const cell = worksheet.getCell(row, column);
      cell.fill = azul;
      cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = { top: { style: 'thin', color: { argb: 'FFFFFFFF' } }, left: { style: 'thin', color: { argb: 'FFFFFFFF' } }, bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } }, right: { style: 'thin', color: { argb: 'FFFFFFFF' } } };
    }
  }
  const filas = agruparFilas(actividades);
  filas.forEach((fila, index) => {
    const row = 9 + index;
    worksheet.getCell(row, 1).value = index + 1;
    worksheet.getCell(row, 2).value = fila.tipo;
    worksheet.getCell(row, 3).value = fila.lider;
    worksheet.getCell(row, 4).value = fila.req;
    worksheet.getCell(row, 5).value = fila.desc;
    fechas.forEach((date, dayIndex) => {
      const value = fila.horasPorDia[fechaClave(date)];
      if (value > 0) worksheet.getCell(row, 7 + dayIndex).value = value;
    });
    worksheet.getCell(row, 6).value = { formula: 'SUM(G' + row + ':' + columna(6 + totalDias) + row + ')' } as any;
    worksheet.getCell(row, totalColumnas).value = { formula: 'SUM(G' + row + ':' + columna(6 + totalDias) + row + ')' } as any;
    for (let column = 1; column <= totalColumnas; column++) {
      const cell = worksheet.getCell(row, column);
      cell.font = { name: 'Arial', size: 10, color: { argb: 'FF334155' } };
      cell.border = { top: { style: 'thin', color: { argb: 'FFE2E8F0' } }, left: { style: 'thin', color: { argb: 'FFE2E8F0' } }, bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } }, right: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
      cell.alignment = column === 1 || column === 6 || column === totalColumnas ? { horizontal: 'center', vertical: 'middle' } : { horizontal: column >= 7 ? 'center' : 'left', vertical: 'middle', wrapText: true };
      if (column >= 7 && column <= 6 + totalDias) cell.fill = rellenoActividad(fila.tipo, fila.recurrente, fila.horasPorDia[fechaClave(fechas[column - 7])] > 0, fechas[column - 7], feriados);
    }
  });
  const totalRow = 9 + filas.length;
  worksheet.getCell(totalRow, 1).value = 'TOTAL';
  worksheet.getCell(totalRow, 6).value = { formula: 'SUM(F9:F' + (totalRow - 1) + ')' } as any;
  worksheet.getCell(totalRow, totalColumnas).value = { formula: 'SUM(' + columna(totalColumnas) + '9:' + columna(totalColumnas) + (totalRow - 1) + ')' } as any;
  fechas.forEach((date, index) => {
    const column = 7 + index;
    worksheet.getCell(totalRow, column).value = { formula: 'SUM(' + columna(column) + '9:' + columna(column) + (totalRow - 1) + ')' } as any;
  });
  for (let column = 1; column <= totalColumnas; column++) {
    const cell = worksheet.getCell(totalRow, column);
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF163572' } };
    cell.alignment = { horizontal: column === 1 ? 'left' : 'center', vertical: 'middle' };
    cell.border = { top: { style: 'medium', color: { argb: 'FF163572' } }, bottom: { style: 'double', color: { argb: 'FF163572' } } };
    if (column >= 7 && column <= 6 + totalDias) cell.fill = rellenoDia(fechas[column - 7], feriados);
  }
  const firma = totalRow + 5;
  worksheet.getCell(firma, 2).value = 'Elaborado por: ' + nombreColaborador;
  worksheet.getCell(firma + 1, 2).value = 'ISC INTEGRITY SOLUTIONS & CONSULTING CIA. LTDA.';
  worksheet.getCell(firma, 8).value = 'Revisado y Aprobado por: ' + lideres(filas);
  worksheet.getCell(firma + 1, 8).value = 'Empresa: ' + clienteDe(actividades);
  worksheet.getCell(firma, 2).font = worksheet.getCell(firma, 8).font = { name: 'Arial', size: 10, italic: true };
  worksheet.getCell(firma + 1, 2).font = worksheet.getCell(firma + 1, 8).font = { name: 'Arial', size: 10, bold: true };
  worksheet.getCell(totalRow + 9, 2).value = 'Nomenclatura';
  worksheet.getCell(totalRow + 9, 2).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF163572' } };
  [['Vacaciones', 'FFFFC000'], ['Feriado', 'FFFFFF00'], ['Permiso', 'FF76933C'], ['Fines de Semana', 'FF8DB4E2'], ['Actividad Recurrente', 'FFCCC0DA']].forEach((item, index) => {
    const cell = worksheet.getCell(totalRow + 10 + index, 3);
    cell.value = item[0];
    cell.fill = fill(item[1]);
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  await estandarizarCabeceraExcelExistente(workbook, worksheet, 'TIME REPORT - ' + nombreProyecto.toUpperCase(), totalColumnas, mes(fechaDesde) + ' ' + fechaDesde.slice(0, 4), 8, false);
  return workbook.xlsx.writeBuffer() as Promise<ArrayBuffer>;
}

function agruparFilas(actividades: ActividadSeguimientoPdf[]): Array<{ tipo: string; lider: string; req: string; desc: string; recurrente: boolean; horasPorDia: Record<string, number> }> {
  const grupos = new Map<string, { tipo: string; lider: string; req: string; desc: string; recurrente: boolean; horasPorDia: Record<string, number> }>();
  actividades.forEach(activity => {
    const recurrente = !!(activity.esRecurrente || activity.recurrente);
    const key = [activity.tipoActividad || '', activity.liderProyecto || '', activity.codigoRequerimiento || '', activity.descripcion || '', recurrente].join('|');
    const row = grupos.get(key) || { tipo: activity.tipoActividad || '', lider: activity.liderProyecto || '', req: activity.codigoRequerimiento || '', desc: activity.descripcion || '', recurrente, horasPorDia: {} };
    row.horasPorDia[activity.fecha] = (row.horasPorDia[activity.fecha] || 0) + Number(activity.horas || 0);
    grupos.set(key, row);
  });
  return Array.from(grupos.values());
}
function fechasDelPeriodo(desde: string, hasta: string): Date[] { const result: Date[] = []; const date = new Date(desde + 'T00:00:00'); const end = new Date(hasta + 'T00:00:00'); while (date <= end) { result.push(new Date(date)); date.setDate(date.getDate() + 1); } return result; }
function fechaClave(date: Date): string { return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0'); }
function dia(date: Date): string { return String(date.getDate()).padStart(2, '0'); }
function columna(index: number): string { let value = ''; while (index > 0) { const modulo = (index - 1) % 26; value = String.fromCharCode(65 + modulo) + value; index = Math.floor((index - modulo) / 26); } return value; }
function mes(fecha: string): string { return new Date(fecha + 'T00:00:00').toLocaleString('es-EC', { month: 'long' }).toUpperCase(); }
function clienteDe(actividades: ActividadSeguimientoPdf[]): string { return actividades[0]?.clienteProyecto || 'Sin Cliente'; }
function lideres(filas: Array<{ lider: string }>): string { return Array.from(new Set(filas.map(row => row.lider).filter(Boolean))).join(', ') || 'Sin Líder'; }
function rellenoDia(date: Date, feriados: Set<string>): ExcelJS.Fill { return feriados.has(fechaClave(date)) ? fill('FFFFFF00') : [0, 6].includes(date.getDay()) ? fill('FF8DB4E2') : fill('FFFFFFFF'); }
function rellenoActividad(tipo: string, recurrente: boolean, tieneHoras: boolean, date: Date, feriados: Set<string>): ExcelJS.Fill { if (tieneHoras && tipo === 'Vacaciones') return fill('FFFFC000'); if (tieneHoras && tipo === 'Permiso') return fill('FF76933C'); if (tieneHoras && recurrente) return fill('FFCCC0DA'); return rellenoDia(date, feriados); }
function fill(argb: string): ExcelJS.Fill { return { type: 'pattern', pattern: 'solid', fgColor: { argb } }; }
function nombreHoja(nombre: string): string { const clean = ('Reporte_' + nombre).replace(/[*?:\/\\[\]]/g, '').slice(0, 31); return clean || 'Reporte'; }
