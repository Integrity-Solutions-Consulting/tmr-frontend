import JSZip from 'jszip';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { obtenerLogoReporte } from './reporte-export.utils';

export interface ActividadSeguimientoPdf {
  fecha: string;
  proyecto?: string;
  clienteProyecto?: string;
  liderProyecto?: string;
  tipoActividad?: string;
  codigoRequerimiento?: string;
  descripcion?: string;
  horas: number;
  esRecurrente?: boolean;
  recurrente?: boolean;
}

export interface DatosSeguimientoPdf {
  actividades: ActividadSeguimientoPdf[];
  feriados: string[];
}

type Color = [number, number, number];
const AZUL: Color = [22, 53, 114];
const FIN_SEMANA: Color = [141, 180, 226];
const FERIADO: Color = [255, 255, 0];
const VACACIONES: Color = [255, 192, 0];
const PERMISO: Color = [118, 147, 60];
const RECURRENTE: Color = [204, 192, 218];

export async function crearZipSeguimientoPdf(
  colaboradores: ReadonlyArray<{ id: number | string; nombre: string }>,
  fechaDesde: string,
  fechaHasta: string,
  cargarActividades: (id: number | string) => Promise<DatosSeguimientoPdf>,
): Promise<Uint8Array<ArrayBuffer>> {
  const zip = new JSZip();
  for (const [indice, colaborador] of colaboradores.entries()) {
    const datos = await cargarActividades(colaborador.id);
    const contenido = await crearReporteSeguimientoPdf(colaborador.nombre, fechaDesde, fechaHasta, datos);
    if (new TextDecoder().decode(contenido.slice(0, 5)) !== '%PDF-') throw new Error('No se pudo generar el PDF.');
    const nombre = colaborador.nombre.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim().slice(0, 100) || 'colaborador';
    zip.file('Reporte_' + nombre + '_' + (indice + 1) + '.pdf', contenido);
  }
  return new Uint8Array(await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' }));
}

export async function crearReporteSeguimientoPdf(
  nombreColaborador: string,
  fechaDesde: string,
  fechaHasta: string,
  datos: DatosSeguimientoPdf,
): Promise<ArrayBuffer> {
  const fechas = fechasDelPeriodo(fechaDesde, fechaHasta);
  const feriados = new Set(datos.feriados ?? []);
  const grupos = agruparPorCliente(datos.actividades ?? []);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const logo = await obtenerLogoReporte();
  if (grupos.length === 0) grupos.push({ cliente: 'Sin Cliente', actividades: [] });
  for (const [indice, grupo] of grupos.entries()) {
    if (indice > 0) doc.addPage();
    const filas = agruparFilas(grupo.actividades);
    dibujarCabecera(doc, logo, grupo.cliente, nombreColaborador, fechaDesde);
    const columnas = ['N°', 'TIPO DE ACTIVIDAD', 'LÍDER DE PROYECTO', 'CODIGO REQUERIMIENTO / INCIDENTE', 'DESCRIPCION DE TRABAJOS REALIZADOS', 'TOTAL HORAS\nPOR ACTIVIDAD'].concat(fechas.map(dia)).concat(['TOTAL HORAS\nPOR ACT.']);
    const head: any[][] = [
      (columnas.slice(0, 6).map(content => ({ content, rowSpan: 3 })) as any[]).concat([{ content: 'DISTRIBUCIÓN DE TIEMPO DEL DÍA', colSpan: fechas.length }, { content: columnas[columnas.length - 1], rowSpan: 3 }]),
      fechas.map(f => ({ content: dia(f) })),
      fechas.map(f => ({ content: ['D', 'L', 'M', 'M', 'J', 'V', 'S'][f.getDay()] })),
    ];
    const body = filas.map((fila, rowIndex) => [rowIndex + 1, fila.tipo, fila.lider, fila.req, fila.desc, horas(fila.horasPorDia), ...fechas.map(f => fila.horasPorDia[fechaClave(f)] || ''), horas(fila.horasPorDia)]);
    const total = ['TOTAL', '', '', '', '', horasTotales(filas)].concat(fechas.map(f => horasTotales(filas.map(fila => ({ horasPorDia: { [fechaClave(f)]: fila.horasPorDia[fechaClave(f)] || 0 } } as FilaPdf))))).concat([horasTotales(filas)]);
    autoTable(doc, {
      startY: 39, head, body: body.concat([total]), theme: 'grid', margin: { left: 10, right: 10, bottom: 14 }, tableWidth: 'auto',
      styles: { font: 'helvetica', fontSize: 3.8, cellPadding: 0.65, minCellWidth: 0, lineColor: [210, 220, 235], lineWidth: 0.12, valign: 'middle' },
      headStyles: { fillColor: AZUL, textColor: 255, fontStyle: 'bold', halign: 'center', valign: 'middle', fontSize: 3.6, cellPadding: 0.55, minCellWidth: 0 },
      columnStyles: Object.assign({ 0: { cellWidth: 5, halign: 'center' }, 1: { cellWidth: 16 }, 2: { cellWidth: 20 }, 3: { cellWidth: 21 }, 4: { cellWidth: 42 }, 5: { cellWidth: 12, halign: 'center' }, [6 + fechas.length]: { cellWidth: 12, halign: 'center' } }, Object.fromEntries(fechas.map((_, i) => [6 + i, { cellWidth: 3.7, halign: 'center' }]))) as any,
      alternateRowStyles: { fillColor: [255, 255, 255] },
      didParseCell: (data: any) => {
        const esTotal = data.row.index === body.length;
        if (esTotal) {
          data.cell.styles.fontStyle = 'bold'; data.cell.styles.textColor = AZUL; data.cell.styles.lineColor = AZUL; data.cell.styles.lineWidth = 0.35;
          if (data.column.index >= 6 && data.column.index < 6 + fechas.length) {
            const color = colorDia(fechas[data.column.index - 6], feriados); if (color) data.cell.styles.fillColor = color;
          }
          return;
        }
        if (data.column.index >= 6 && data.column.index < 6 + fechas.length) {
          const fila = filas[data.row.index]; const fecha = fechas[data.column.index - 6];
          const color = Number(fila?.horasPorDia[fechaClave(fecha)] || 0) > 0 ? colorActividad(fila.tipo, fila.recurrente) : colorDia(fecha, feriados);
          if (color) data.cell.styles.fillColor = color;
        }
        if ([0, 5, 6 + fechas.length].includes(data.column.index)) data.cell.styles.halign = 'center';
      },
    });
    dibujarFirmasYLeyenda(doc, (doc as any).lastAutoTable.finalY, nombreColaborador, grupo.cliente, filas);
  }
  return doc.output('arraybuffer');
}

function dibujarCabecera(doc: jsPDF, logo: string | null, cliente: string, colaborador: string, desde: string): void {
  const width = doc.internal.pageSize.getWidth();
  doc.setFillColor(...AZUL); doc.rect(10, 10, width - 20, 22, 'F');
  if (logo) doc.addImage(logo, 'PNG', 12, 12, 28, 12);
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text('TIME REPORT - ' + cliente.toUpperCase(), width / 2, 21, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.2); doc.text(mes(desde) + ' ' + desde.slice(0, 4) + ' | Generado: ' + new Date().toLocaleDateString('es-EC'), width - 12, 28, { align: 'right' });
  doc.setTextColor(...AZUL); doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.text('Cliente:', 11, 35); doc.setTextColor(25, 25, 25); doc.text(cliente, 35, 35); doc.setTextColor(...AZUL); doc.text('Nombre del consultor:', 11, 38); doc.setTextColor(25, 25, 25); doc.text(colaborador, 35, 38);
}

function dibujarFirmasYLeyenda(doc: jsPDF, finalY: number, colaborador: string, cliente: string, filas: FilaPdf[]): void {
  const width = doc.internal.pageSize.getWidth(); let y = finalY + 13;
  if (y > doc.internal.pageSize.getHeight() - 45) { doc.addPage(); y = 20; }
  doc.setFontSize(6.5); doc.setTextColor(25, 25, 25); doc.setFont('helvetica', 'italic'); doc.text('Elaborado por: ' + colaborador, 15, y); doc.text('Revisado y Aprobado por: ' + lideres(filas), width / 2, y);
  doc.setFont('helvetica', 'bold'); doc.text('ISC INTEGRITY SOLUTIONS & CONSULTING CIA. LTDA.', 15, y + 4); doc.text('Empresa: ' + cliente, width / 2, y + 4);
  doc.setFont('helvetica', 'bold'); doc.setTextColor(...AZUL); doc.text('Nomenclatura', 15, y + 14);
  const leyenda: Array<[string, Color]> = [['Vacaciones', VACACIONES], ['Feriado', FERIADO], ['Permiso', PERMISO], ['Fines de Semana', FIN_SEMANA], ['Actividad Recurrente', RECURRENTE]];
  leyenda.forEach(([texto, color], i) => { const x = 35; const ly = y + 12 + i * 4; doc.setFillColor(...color); doc.rect(x, ly - 3, 26, 4, 'F'); doc.setTextColor(25, 25, 25); doc.setFont('helvetica', 'normal'); doc.setFontSize(5.5); doc.text(texto, x + 13, ly, { align: 'center' }); });
}

interface FilaPdf { tipo: string; lider: string; req: string; desc: string; recurrente: boolean; horasPorDia: Record<string, number>; }
function agruparPorCliente(actividades: ActividadSeguimientoPdf[]): Array<{ cliente: string; actividades: ActividadSeguimientoPdf[] }> { const grupos = new Map<string, ActividadSeguimientoPdf[]>(); actividades.forEach(a => { const cliente = a.clienteProyecto || 'Sin Cliente'; grupos.set(cliente, (grupos.get(cliente) || []).concat([a])); }); return Array.from(grupos.entries()).map(([cliente, items]) => ({ cliente, actividades: items })); }
function agruparFilas(actividades: ActividadSeguimientoPdf[]): FilaPdf[] { const mapa = new Map<string, FilaPdf>(); actividades.forEach(a => { const recurrente = !!(a.esRecurrente || a.recurrente); const clave = [a.tipoActividad || '', a.liderProyecto || '', a.codigoRequerimiento || '', a.descripcion || '', recurrente].join('|'); const fila = mapa.get(clave) || { tipo: a.tipoActividad || '', lider: a.liderProyecto || '', req: a.codigoRequerimiento || '', desc: a.descripcion || '', recurrente, horasPorDia: {} }; fila.horasPorDia[a.fecha] = (fila.horasPorDia[a.fecha] || 0) + Number(a.horas || 0); mapa.set(clave, fila); }); return Array.from(mapa.values()); }
function fechasDelPeriodo(desde: string, hasta: string): Date[] { const fechas: Date[] = []; const actual = new Date(desde + 'T00:00:00'); const fin = new Date(hasta + 'T00:00:00'); while (actual <= fin) { fechas.push(new Date(actual)); actual.setDate(actual.getDate() + 1); } return fechas; }
function fechaClave(fecha: Date): string { return fecha.getFullYear() + '-' + String(fecha.getMonth() + 1).padStart(2, '0') + '-' + String(fecha.getDate()).padStart(2, '0'); }
function dia(fecha: Date): string { return String(fecha.getDate()).padStart(2, '0'); }
function horas(porDia: Record<string, number>): string { return horasTotales([{ horasPorDia: porDia } as FilaPdf]); }
function horasTotales(filas: FilaPdf[]): string { return filas.reduce((suma, fila) => suma + Object.values(fila.horasPorDia).reduce((s, h) => s + Number(h || 0), 0), 0).toFixed(2).replace(/\.00$/, ''); }
function colorDia(fecha: Date, feriados: Set<string>): Color | null { if (feriados.has(fechaClave(fecha))) return FERIADO; return [0, 6].includes(fecha.getDay()) ? FIN_SEMANA : null; }
function colorActividad(tipo: string, recurrente: boolean): Color { if (tipo === 'Vacaciones') return VACACIONES; if (tipo === 'Permiso') return PERMISO; if (recurrente) return RECURRENTE; return [255, 255, 255]; }
function lideres(filas: FilaPdf[]): string { return Array.from(new Set(filas.map(f => f.lider).filter(Boolean))).join(', ') || 'Sin Líder'; }
function mes(fecha: string): string { return new Date(fecha + 'T00:00:00').toLocaleString('es-EC', { month: 'long' }).toUpperCase(); }
