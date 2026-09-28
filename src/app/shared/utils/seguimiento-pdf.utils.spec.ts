import { describe, expect, it } from 'vitest';
import { crearReporteSeguimientoPdf } from './seguimiento-pdf.utils';

// sm - El ZIP de Seguimiento ahora se arma en el componente (solo con colaboradores con actividades);
// aquí se valida el PDF individual que se incluye en ese ZIP.
describe('PDF de seguimiento', () => {
  it('genera un PDF real con el colaborador y varias páginas cuando hay muchas actividades', async () => {
    const contenido = await crearReporteSeguimientoPdf('Consultor Prueba', '2026-09-01', '2026-09-30', {
      actividades: Array.from({ length: 100 }, (_, i) => ({
        fecha: '2026-09-01', descripcion: `Actividad numero ${i}`, horas: 1,
      })),
      feriados: [],
    });
    const pdf = new TextDecoder('latin1').decode(contenido);
    expect(pdf.startsWith('%PDF-')).toBe(true);
    expect(pdf).toContain('%%EOF');
    expect(pdf).toContain('Consultor Prueba');
    expect(pdf).toContain('Actividad numero 99');
    expect((pdf.match(/\/Type \/Page\b/g) ?? []).length).toBeGreaterThan(1);
  });
});
