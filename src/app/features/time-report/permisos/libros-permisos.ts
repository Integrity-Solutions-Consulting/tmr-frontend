import type { SolicitudGerencia } from './permisos-gerencia/permisos-gerencia';
import { descargarBlob, fechaArchivo, reportarAvance, type AvanceExportacion } from '../../../shared/utils/reporte-export.utils';

export type LibroPermisos = 'vacaciones' | 'permisos';
const meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
const colores = ['B5E6A2','44B3E1','E49EDD','F7C7AC','C00000','C0E6F5','FFFF00','7B7B7B','F7C7AC','DAE9F8','83CCEB','745BF3'];

function fechaExcel(valor: string): Date | null {
  const local = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valor);
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(valor);
  if (!local && !iso) return null;
  const [anio, mes, dia] = local ? [local[3], local[2], local[1]].map(Number) : iso!.slice(1, 4).map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia ? fecha : null;
}

export async function crearLibroPermisos(libro: LibroPermisos, registros: SolicitudGerencia[]) {
  const excel = await import('exceljs');
  const Workbook = excel.Workbook ?? excel.default.Workbook;
  const vacaciones = libro === 'vacaciones';
  const wb = new Workbook();
  const hoja = wb.addWorksheet(vacaciones ? 'DETALLE VACACIONES' : 'PERMISOS Y FALTAS');
  const titulos = vacaciones
    ? ['MES', 'AÑO', 'NOMBRE EMPLEADO', 'TIPO DE PERMISO', 'DESCONTABLE', 'DÍAS', 'DESDE', 'HASTA', 'MOTIVO DEL PERMISO']
    : ['NOMBRE EMPLEADO', 'REQUERIMIENTO', 'DÍA DE SOLICITUD', 'SOLICITUD', 'MES'];
  const anchos = vacaciones ? [13, 13, 41, 19, 15, 10, 13, 21, 50] : [21, 35, 24, 63, 16];
  hoja.columns = titulos.map((header, i) => ({ header, width: anchos[i] }));
  for (const s of registros) {
    if ((s.tipoOficial === 'VACACIONES') !== vacaciones) continue;
    const fecha = fechaExcel(vacaciones ? s.fechaInicio : s.fechaSolicitud);
    const mes = fecha ? meses[fecha.getUTCMonth()] : null;
    const fila = vacaciones
      ? hoja.addRow([mes, fecha?.getUTCFullYear(), s.colaborador, 'VACACIONES', s.descuentaVacaciones === false ? 'NO' : 'VACACIONES',
          s.totalDiasNumero, fecha ?? s.fechaInicio, fechaExcel(s.fechaFin) ?? s.fechaFin, s.motivo])
      : hoja.addRow([s.colaborador, s.tipo, fecha ?? s.fechaSolicitud, s.motivo, mes]);
    for (const n of vacaciones ? [7, 8] : [3]) fila.getCell(n).numFmt = 'dd/mm/yyyy';
  }
  hoja.eachRow((fila, i) => {
    fila.eachCell({ includeEmpty: true }, celda => {
      celda.font = { name: 'Aptos Narrow', size: 11, bold: i === 1 };
      celda.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      celda.border = { top: {style:'thin'}, bottom: {style:'thin'}, left: {style:'thin'}, right: {style:'thin'} };
    });
  });
  const columnaMes = vacaciones ? 'A' : 'E';
  hoja.addConditionalFormatting({
    ref: columnaMes + '2:' + columnaMes + '1048576',
    rules: meses.map((mes, i) => ({
      type: 'expression',
      priority: i + 1,
      formulae: [columnaMes + '2="' + mes + '"'],
      style: {
        fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FF' + colores[i] } },
        font: { color: { argb: [4, 7, 11].includes(i) ? 'FFFFFFFF' : 'FF000000' } },
      },
    })),
  });
  hoja.autoFilter = { from: 'A1', to: { row: hoja.rowCount, column: titulos.length } };
  return wb;
}

export async function descargarLibroPermisos(libro: LibroPermisos, registros: SolicitudGerencia[], avance: AvanceExportacion) {
  await reportarAvance(avance, 30, 'Preparando filas...');
  const wb = await crearLibroPermisos(libro, registros);
  await reportarAvance(avance, 75, 'Generando Excel...');
  const buffer = await wb.xlsx.writeBuffer();
  avance.verificarCancelacion();
  descargarBlob(new Blob([buffer], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),
    wb.worksheets[0].name + '_' + fechaArchivo() + '.xlsx');
}
