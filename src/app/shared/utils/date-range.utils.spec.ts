import { describe, expect, it } from 'vitest';
import { ajustarFinRango, fechaEcuadorInputHoy, fechaLocalInputHoy, primerDiaMesEcuador, rangoFechasValido } from './date-range.utils';

describe('utilidades de rango de fechas', () => {
  it('genera una fecha de input usando calendario local, sin conversión UTC', () => {
    expect(fechaLocalInputHoy(new Date(2026, 9, 8, 23, 59))).toBe('2026-10-08');
  });

  it('usa el día de Ecuador sin importar la zona horaria del navegador', () => {
    // 03:00 UTC del 9 de octubre = 22:00 del 8 de octubre en Ecuador
    expect(fechaEcuadorInputHoy(new Date(Date.UTC(2026, 9, 9, 3, 0)))).toBe('2026-10-08');
    expect(fechaEcuadorInputHoy(new Date(Date.UTC(2026, 9, 9, 5, 0)))).toBe('2026-10-09');
    expect(primerDiaMesEcuador(new Date(Date.UTC(2026, 10, 1, 2, 0)))).toBe('2026-10-01');
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
