/** Fecha local para controles `<input type="date">`, sin conversión UTC. */
export function fechaLocalInputHoy(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Un rango ISO es válido cuando está incompleto o su inicio no supera su fin. */
export function rangoFechasValido(desde: string, hasta: string): boolean {
  return !desde || !hasta || desde <= hasta;
}

/** Conserva un rango consultable al mover el inicio más allá del fin actual. */
export function ajustarFinRango(desde: string, hasta: string): string {
  return rangoFechasValido(desde, hasta) ? hasta : desde;
}
