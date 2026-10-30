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
  const limpia = fechaDmy.trim().slice(0, 10);
  const partes = limpia.split('/');
  if (partes.length !== 3) return '';
  const [dd, mm, yyyy] = partes;
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

/**
 * Calcula el rango [desde, hasta] en formato YYYY-MM-DD según el preset seleccionado.
 */
export function calcularRangoPreset(preset: PeriodoPreset, base: Date = new Date(2026, 9, 30)): RangoFechasISO {
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
  hastaIso: string
): boolean {
  if (!desdeIso && !hastaIso) return true;

  const inicioPermiso = dmyAIso(fechaInicioDmy);
  const finPermiso = dmyAIso(fechaFinDmy) || inicioPermiso;
  if (!inicioPermiso) return true;

  if (desdeIso && finPermiso < desdeIso) return false;
  if (hastaIso && inicioPermiso > hastaIso) return false;
  return true;
}
