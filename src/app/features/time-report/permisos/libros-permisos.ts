import type { SolicitudGerencia } from './permisos-gerencia/permisos-gerencia';
import { descargarBlob, fechaArchivo, reportarAvance, type AvanceExportacion } from '../../../shared/utils/reporte-export.utils';

export type LibroPermisos = 'vacaciones' | 'permisos';
const meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
const colores = ['B5E6A2','44B3E1','E49EDD','F7C7AC','C00000','C0E6F5','FFFF00','7B7B7B','F7C7AC','DAE9F8','83CCEB','745BF3'];

function fechaExcel(valor: string): Date | null {
  const local = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(valor);
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
  const columnas: [string, number][] = [
    ['MES', 16], ['AÑO', 10], ['CÓDIGO', 20], ['COLABORADOR', 36],
    ['CLIENTE / PROYECTO', 42], ['LÍDER', 32], ['TIPO', 30], ['FECHA DE SOLICITUD', 20],
    ['DESDE', 15], ['HASTA', 15], ['DÍAS', 10], ['ESTADO', 21],
  ];
  if (vacaciones) columnas.push(['DESCONTABLE', 18]);
  hoja.columns = columnas.map(([header, width]) => ({ header, width }));
  hoja.views = [{ state: 'frozen', ySplit: 1 }];
  const cabecera = hoja.getRow(1);
  cabecera.height = 28;
  cabecera.eachCell(celda => {
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF203864' } };
    celda.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    celda.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  for (const s of registros) {
    if ((s.tipoOficial === 'VACACIONES') !== vacaciones) continue;
    const inicio = fechaExcel(s.fechaInicio);
    const solicitud = fechaExcel(s.fechaSolicitud);
    const fecha = vacaciones ? inicio : solicitud;
    const indice = fecha?.getUTCMonth();
    const proyecto = [...new Set([s.cliente, s.proyecto].filter(Boolean))].join(' / ');
    const fila = hoja.addRow([
      indice == null ? null : meses[indice], fecha?.getUTCFullYear(), s.folio, s.colaborador,
      proyecto, s.liderNombre, s.tipo, solicitud ?? s.fechaSolicitud, inicio ?? s.fechaInicio,
      fechaExcel(s.fechaFin) ?? s.fechaFin, s.totalDiasNumero, s.estadoTexto,
    ]);
    if (vacaciones) fila.getCell(13).value = s.descuentaVacaciones === false ? 'NO' : 'VACACIONES';
    for (const n of [8, 9, 10]) fila.getCell(n).numFmt = 'dd/mm/yyyy';
    fila.eachCell(celda => { celda.alignment = { vertical: 'middle', wrapText: true }; });
    if (indice != null) {
      const celda = fila.getCell(1);
      celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + colores[indice] } };
      celda.font = { bold: true, color: { argb: [4, 7, 11].includes(indice) ? 'FFFFFFFF' : 'FF000000' } };
    }
  }
  const columnaMes = 'A';
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
  hoja.autoFilter = { from: 'A1', to: { row: hoja.rowCount, column: columnas.length } };
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
