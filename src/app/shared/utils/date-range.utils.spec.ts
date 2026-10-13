import { describe, expect, it } from 'vitest';
import { ajustarFinRango, fechaLocalInputHoy, rangoFechasValido } from './date-range.utils';

describe('utilidades de rango de fechas', () => {
  it('genera una fecha de input usando calendario local, sin conversión UTC', () => {
    expect(fechaLocalInputHoy(new Date(2026, 9, 8, 23, 59))).toBe('2026-10-08');
  });

  it('acepta rangos incompletos y ordenados', () => {
    expect(rangoFechasValido('', '2026-10-08')).toBe(true);
    expect(rangoFechasValido('2026-10-01', '2026-10-08')).toBe(true);
  });

  it('rechaza rangos invertidos y ajusta el fin al inicio', () => {
    expect(rangoFechasValido('2026-10-08', '2026-10-01')).toBe(false);
    expect(ajustarFinRango('2026-10-08', '2026-10-01')).toBe('2026-10-08');
  });
});
