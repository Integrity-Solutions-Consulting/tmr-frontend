/** Fecha local para controles `<input type="date">`, sin conversión UTC. */
export function fechaLocalInputHoy(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * "Hoy" en Ecuador (UTC−5, sin horario de verano) como yyyy-MM-dd, sin importar la zona horaria del navegador.
 * Es la misma fecha que usa el backend (CalculoHorasPeriodo.HoyEcuador) para validar y calcular horas.
 */
export function fechaEcuadorInputHoy(now = new Date()): string {
  const ecuador = new Date(now.getTime() - 5 * 60 * 60 * 1000);
  const year = ecuador.getUTCFullYear();
  const month = String(ecuador.getUTCMonth() + 1).padStart(2, '0');
  const day = String(ecuador.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Primer día del mes en curso en Ecuador (yyyy-MM-01). */
export function primerDiaMesEcuador(now = new Date()): string {
  return `${fechaEcuadorInputHoy(now).slice(0, 7)}-01`;
}

/** Un rango ISO es válido cuando está incompleto o su inicio no supera su fin. */
export function rangoFechasValido(desde: string, hasta: string): boolean {
  return !desde || !hasta || desde <= hasta;
}

/** Conserva un rango consultable al mover el inicio más allá del fin actual. */
export function ajustarFinRango(desde: string, hasta: string): string {
  return rangoFechasValido(desde, hasta) ? hasta : desde;
}
