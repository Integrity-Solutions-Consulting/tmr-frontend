// sm - Utilidades del Dashboard ejecutivo.
import { EstadoHistorico, Semaforo } from '../../modelos/dashboard-ejecutivo.model';

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// sm - El backend envía las fechas como "dd-MM-yyyy" (DateOnly?) o "yyyy-MM-dd" (DateOnly); se aceptan ambas.
export function aFecha(valor: string | null | undefined): Date | null {
  if (!valor) return null;
  const texto = valor.substring(0, 10);
  let m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(texto);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  return null;
}

export function formatoFecha(valor: string | null | undefined): string {
  const fecha = aFecha(valor);
  if (!fecha) return '—';
  const dd = String(fecha.getDate()).padStart(2, '0');
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${fecha.getFullYear()}`;
}

// sm - Fecha y hora (DateTime sin zona, ya en hora de Ecuador) como "dd/MM/yyyy HH:mm".
export function formatoFechaHora(valor: string | null | undefined): string {
  if (!valor) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(valor);
  if (!m) return valor;
  return `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}`;
}

export function formatoHoras(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return '—';
  return `${Number(valor).toLocaleString('es-EC', { maximumFractionDigits: 2 })} h`;
}

export function formatoPorcentaje(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return '—';
  return `${Number(valor).toLocaleString('es-EC', { maximumFractionDigits: 2 })} %`;
}

// sm - Apoyo para las vistas (dashboard y bloque brecha-historico).
export function claseSemaforo(semaforo: Semaforo | string): string {
  return `semaforo-${String(semaforo).toLowerCase()}`;
}

export function etiquetaEstado(estado: EstadoHistorico | 'SinDatos'): string {
  return {
    Cumplido: 'Cumplido',
    AtrasoCarga: 'Atraso de carga (mes abierto)',
    Incumplido: 'Incumplimiento definitivo',
    Regularizado: 'Regularizado después del cierre',
    SinDatos: 'Sin horas esperadas',
  }[estado];
}

export function etiquetaMes(anio: number, mes: number): string {
  return `${MESES_CORTOS[mes - 1]} ${String(anio).slice(2)}`;
}

export function anchoBarra(porcentaje: number): number {
  return Math.max(0, Math.min(100, porcentaje));
}
