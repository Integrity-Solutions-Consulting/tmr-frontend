import JSZip from 'jszip';
import { crearReportePdf } from './reporte-export.utils';

export interface ActividadSeguimientoPdf {
  fecha: string;
  proyecto?: string;
  clienteProyecto?: string;
  liderProyecto?: string;
  tipoActividad?: string;
  codigoRequerimiento?: string;
  descripcion?: string;
  horas: number;
}

export async function crearZipSeguimientoPdf(
  colaboradores: ReadonlyArray<{ id: number | string; nombre: string }>,
  fechaDesde: string,
  fechaHasta: string,
  cargarActividades: (id: number | string) => Promise<ActividadSeguimientoPdf[]>,
): Promise<Uint8Array<ArrayBuffer>> {
  if (!colaboradores.length) throw new Error('Selecciona colaboradores.');
  const zip = new JSZip();
  // Procesar uno a uno evita saturar la API y limita la memoria de generación.
  for (const [indice, colaborador] of colaboradores.entries()) {
    const actividades = await cargarActividades(colaborador.id);
    if (!Array.isArray(actividades)) throw new Error('Respuesta de actividades inválida.');
    const filas = [...actividades].sort((a, b) => a.fecha.localeCompare(b.fecha)).map(a => [
      a.fecha, a.clienteProyecto ?? 'Sin Cliente', a.proyecto ?? '',
      a.liderProyecto ?? '', a.tipoActividad ?? '', a.codigoRequerimiento ?? '',
      a.descripcion ?? '', Number(a.horas),
    ]);
    const total = actividades.reduce((suma, a) => suma + Number(a.horas), 0);
    if (!Number.isFinite(total)) throw new Error('Horas inválidas.');
    if (!filas.length) filas.push(['', '', '', '', '', '', 'Sin actividades en el periodo', 0]);
    filas.push(['', '', '', '', '', '', 'TOTAL HORAS', total]);
    const doc = await crearReportePdf({
      titulo: 'Seguimiento de actividades',
      subtituloPdf: `${colaborador.nombre} | ${fechaDesde} al ${fechaHasta}`,
      nombreArchivo: 'Seguimiento', nombreHoja: 'Seguimiento', orientacionPdf: 'landscape',
      columnas: [
        { encabezado: 'Fecha', anchoPdf: 22 },
        { encabezado: 'Cliente', anchoPdf: 32 },
        { encabezado: 'Proyecto', anchoPdf: 32 },
        { encabezado: 'Líder', anchoPdf: 28 },
        { encabezado: 'Tipo', anchoPdf: 25 },
        { encabezado: 'Requerimiento', anchoPdf: 30 },
        { encabezado: 'Descripción', anchoPdf: 85 },
        { encabezado: 'Horas', anchoPdf: 16, alineacion: 'right' },
      ], filas,
    });
    const contenido = doc.output('arraybuffer');
    if (new TextDecoder().decode(contenido.slice(0, 5)) !== '%PDF-') {
      throw new Error('No se pudo generar el PDF.');
    }
    const nombre = colaborador.nombre.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim().slice(0, 100) || 'colaborador';
    // El índice evita sobrescribir colaboradores con nombres iguales.
    zip.file(`Reporte_${nombre}_${indice + 1}.pdf`, contenido);
  }
  return new Uint8Array(await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' }));
}
