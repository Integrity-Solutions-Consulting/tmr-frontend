export type PeriodoPreset =
  | 'TODOS'
  | 'HOY'
  | 'ESTA_SEMANA'
  | 'ESTE_MES'
  | 'MES_ANTERIOR'
  | 'ULTIMOS_3_MESES'
  | 'ANIO_ACTUAL'
  | 'ANIO_ANTERIOR'
  | 'PERSONALIZADO';

export interface RangoFechasISO {
  desde: string; // YYYY-MM-DD o ''
  hasta: string; // YYYY-MM-DD o ''
}

function formatearISO(fecha: Date): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Convierte una fecha en formato DD/MM/YYYY a YYYY-MM-DD para comparación segura.
 */
export function dmyAIso(fechaDmy: string): string {
  if (!fechaDmy) return '';
  const limpia = fechaDmy.trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(limpioIso(limpia))) return limpia;
  const partes = limpia.split('/');
  if (partes.length !== 3) return '';
  const [dd, mm, yyyy] = partes;
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

function limpioIso(s: string): string {
  return s;
}

/**
 * Convierte una fecha YYYY-MM-DD a DD/MM/YYYY para visualización en formulario oficial.
 */
export function isoADmy(fechaIso: string): string {
  if (!fechaIso) return '';
  const limpia = fechaIso.trim().slice(0, 10);
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(limpia)) return limpia;
  const partes = limpia.split('-');
  if (partes.length !== 3) return fechaIso;
  const [yyyy, mm, dd] = partes;
  return `${dd.padStart(2, '0')}/${mm.padStart(2, '0')}/${yyyy}`;
}

/**
 * Calcula días laborables (lunes a viernes) entre dos fechas ISO (YYYY-MM-DD).
 */
export function calcularDiasLaborablesIso(inicioIso: string, finIso: string): number {
  if (!inicioIso) return 1;
  const [y1, m1, d1] = inicioIso.split('-').map(Number);
  const [y2, m2, d2] = (finIso || inicioIso).split('-').map(Number);
  if (!y1 || !y2) return 1;

  const inicio = new Date(y1, m1 - 1, d1);
  const fin = new Date(y2, m2 - 1, d2);
  if (fin < inicio) return 1;

  let dias = 0;
  const cursor = new Date(inicio);
  while (cursor <= fin) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) {
      dias++;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return Math.max(1, dias);
}

/**
 * Calcula el siguiente día laborable (lunes a viernes) posterior a finIso (YYYY-MM-DD).
 */
export function calcularSiguienteDiaLaborableIso(finIso: string): string {
  if (!finIso) return '';
  const [y, m, d] = finIso.split('-').map(Number);
  if (!y) return '';
  const sig = new Date(y, m - 1, d + 1);
  while (sig.getDay() === 0 || sig.getDay() === 6) {
    sig.setDate(sig.getDate() + 1);
  }
  return formatearISO(sig);
}

/**
 * Normaliza un texto eliminando tildes/diacríticos y convirtiendo a minúsculas.
 */
export function normalizarTextoBusqueda(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  return String(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Búsqueda inteligente multi-término insensible a mayúsculas y tildes.
 * Divide la consulta en palabras (tokens) y verifica que TODAS las palabras
 * aparezcan en al menos uno de los campos del registro (nombre, código, tipo,
 * cliente, proyecto, líder, duración, días, horas, fechas, estado, motivo, etc.).
 */
export function coincideBusquedaInteligente(
  consulta: string,
  campos: Array<string | number | boolean | null | undefined>,
): boolean {
  const q = normalizarTextoBusqueda(consulta);
  if (!q) return true;

  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  const corpus = campos.map(normalizarTextoBusqueda).filter(Boolean).join(' | ');
  return tokens.every((token) => corpus.includes(token));
}

/**
 * Calcula el rango [desde, hasta] en formato YYYY-MM-DD según el preset seleccionado.
 */
export function calcularRangoPreset(
  preset: PeriodoPreset,
  base: Date = new Date(2026, 9, 30),
): RangoFechasISO {
  const anio = base.getFullYear();
  const mes = base.getMonth();

  switch (preset) {
    case 'TODOS':
      return { desde: '', hasta: '' };

    case 'HOY': {
      const hoy = formatearISO(base);
      return { desde: hoy, hasta: hoy };
    }

    case 'ESTA_SEMANA': {
      const diaSemana = base.getDay(); // 0 dom .. 6 sab
      const diffLunes = diaSemana === 0 ? -6 : 1 - diaSemana;
      const lunes = new Date(anio, mes, base.getDate() + diffLunes);
      const domingo = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + 6);
      return { desde: formatearISO(lunes), hasta: formatearISO(domingo) };
    }

    case 'ESTE_MES': {
      const inicio = new Date(anio, mes, 1);
      const fin = new Date(anio, mes + 1, 0);
      return { desde: formatearISO(inicio), hasta: formatearISO(fin) };
    }

    case 'MES_ANTERIOR': {
      const inicio = new Date(anio, mes - 1, 1);
      const fin = new Date(anio, mes, 0);
      return { desde: formatearISO(inicio), hasta: formatearISO(fin) };
    }

    case 'ULTIMOS_3_MESES': {
      const inicio = new Date(anio, mes - 2, 1);
      const fin = new Date(anio, mes + 1, 0);
      return { desde: formatearISO(inicio), hasta: formatearISO(fin) };
    }

    case 'ANIO_ACTUAL':
      return { desde: `${anio}-01-01`, hasta: `${anio}-12-31` };

    case 'ANIO_ANTERIOR':
      return { desde: `${anio - 1}-01-01`, hasta: `${anio - 1}-12-31` };

    case 'PERSONALIZADO':
    default:
      return { desde: '', hasta: '' };
  }
}

/**
 * Evalúa si un permiso con rango [fechaInicioDmy, fechaFinDmy] (DD/MM/YYYY)
 * se solapa con el rango filtrado [desdeIso, hastaIso] (YYYY-MM-DD).
 */
export function cumpleRangoFechas(
  fechaInicioDmy: string,
  fechaFinDmy: string,
  desdeIso: string,
  hastaIso: string,
): boolean {
  if (!desdeIso && !hastaIso) return true;

  const inicioPermiso = dmyAIso(fechaInicioDmy);
  const finPermiso = dmyAIso(fechaFinDmy) || inicioPermiso;
  if (!inicioPermiso) return true;

  if (desdeIso && finPermiso < desdeIso) return false;
  if (hastaIso && inicioPermiso > hastaIso) return false;
  return true;
}
