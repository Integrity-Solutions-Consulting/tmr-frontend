import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { crearZipSeguimientoPdf } from './seguimiento-pdf.utils';

describe('ZIP PDF de seguimiento', () => {
  it('incluye PDF reales por colaborador, conserva homónimos y genera varias páginas', async () => {
    const contenido = await crearZipSeguimientoPdf(
      [{ id: 1, nombre: 'Consultor Prueba' }, { id: 2, nombre: 'Consultor Prueba' }],
      '2026-09-01', '2026-09-30',
      async id => id === 1 ? Array.from({ length: 100 }, (_, i) => ({
        fecha: '2026-09-01', descripcion: `Actividad numero ${i}`, horas: 1,
      })) : [],
    );
    const zip = await JSZip.loadAsync(contenido, { checkCRC32: true });
    const archivos = Object.values(zip.files);
    expect(archivos).toHaveLength(2);
    for (const archivo of archivos) {
      expect(archivo.name).toMatch(/\.pdf$/);
      const pdf = await archivo.async('string');
      expect(pdf.startsWith('%PDF-')).toBe(true);
      expect(pdf).toContain('%%EOF');
      expect(pdf).toContain('Consultor Prueba');
      expect(pdf).toContain('2026-09-01 al 2026-09-30');
    }
    const primero = await archivos[0].async('string');
    expect(primero).toContain('Actividad numero 99');
    expect((primero.match(/\/Type \/Page\b/g) ?? []).length).toBeGreaterThan(1);
    expect(await archivos[1].async('string')).toContain('Sin actividades en el periodo');
  });

  it('rechaza el ZIP completo cuando falla la consulta de un colaborador', async () => {
    await expect(crearZipSeguimientoPdf(
      [{ id: 1, nombre: 'Prueba' }], '2026-09-01', '2026-09-30',
      async () => { throw new Error('Consulta fallida'); },
    )).rejects.toThrow('Consulta fallida');
  });

  it('limpia separadores de ruta en los nombres de las entradas', async () => {
    const contenido = await crearZipSeguimientoPdf(
      [{ id: 1, nombre: '../Consultor\\Prueba' }], '2026-09-01', '2026-09-30', async () => [],
    );
    const zip = await JSZip.loadAsync(contenido);
    expect(Object.keys(zip.files)).toHaveLength(1);
    expect(Object.keys(zip.files)[0]).not.toMatch(/[/\\]/);
  });
});
