/**
 * Utilidades compartidas por los reportes Por Colaborador y Por Cliente.
 */

/**
 * El backend envía fechas DateOnly como "yyyy-MM-dd". new Date("2026-01-15") las toma como UTC y en Ecuador
 * (UTC-5) se mostrarían un día antes; por eso se arman como fecha local.
 */
export function fechaLocal(valor: string | null | undefined): Date | null {
  if (!valor) return null;
  const [anio, mes, dia] = valor.substring(0, 10).split('-').map(Number);
  if (!anio || !mes || !dia) return null;
  return new Date(anio, mes - 1, dia);
}

export function textoFecha(fecha: Date | null): string {
  if (!fecha) return '';
  const dd = String(fecha.getDate()).padStart(2, '0');
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${fecha.getFullYear()}`;
}

/**
 * Días → texto legible ("1 año 3 meses", "2 meses 10 días", "5 días"). Aproximado: año = 365 días, mes = 30 días.
 */
export function textoDuracion(dias: number): string {
  if (!dias || dias <= 0) return '—';
  const anios = Math.floor(dias / 365);
  const resto = dias % 365;
  const meses = Math.floor(resto / 30);
  const diasRestantes = resto % 30;

  const partes: string[] = [];
  if (anios) partes.push(`${anios} ${anios === 1 ? 'año' : 'años'}`);
  if (meses) partes.push(`${meses} ${meses === 1 ? 'mes' : 'meses'}`);
  // Los días solo se muestran si el periodo es menor a un año (con años no aportan).
  if (diasRestantes && !anios) partes.push(`${diasRestantes} ${diasRestantes === 1 ? 'día' : 'días'}`);
  return partes.join(' ') || '—';
}

export function textoHoras(horas: number): string {
  return `${Number(horas || 0).toLocaleString('es-EC', { maximumFractionDigits: 2 })} h`;
}

export interface OrdenTabla {
  campo: string;
  asc: boolean;
}

/**
 * Ordena la lista COMPLETA (no solo la página visible). `alias` permite ordenar una columna de texto por otro
 * campo, p. ej. "duracion" por "diasTrabajados" o "finTexto" por "fechaFin".
 */
export function ordenarLista<T>(lista: T[], orden: OrdenTabla | null, alias: Record<string, string> = {}): T[] {
  if (!orden) return lista;
  const campo = alias[orden.campo] ?? orden.campo;
  const factor = orden.asc ? 1 : -1;

  return [...lista].sort((a: any, b: any) => {
    const valorA = a?.[campo];
    const valorB = b?.[campo];

    // Los vacíos (p. ej. una fecha fin "En curso") quedan al final en orden ascendente.
    if (valorA == null && valorB == null) return 0;
    if (valorA == null) return 1 * factor;
    if (valorB == null) return -1 * factor;

    if (valorA instanceof Date && valorB instanceof Date) return (valorA.getTime() - valorB.getTime()) * factor;
    if (typeof valorA === 'number' && typeof valorB === 'number') return (valorA - valorB) * factor;
    if (typeof valorA === 'boolean' && typeof valorB === 'boolean') return (Number(valorA) - Number(valorB)) * factor;

    return String(valorA).localeCompare(String(valorB), 'es', { numeric: true, sensitivity: 'base' }) * factor;
  });
}
