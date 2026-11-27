export function normalizarFechaPerfil(fecha?: string | null): string | null {
  const valor = fecha?.trim();
  if (!valor) return null;

  const formatoLocal = /^(\d{2})([-/])(\d{2})\2(\d{4})$/.exec(valor);
  const iso = formatoLocal
    ? `${formatoLocal[4]}-${formatoLocal[3]}-${formatoLocal[1]}`
    : valor;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || iso.startsWith('0000-')) return null;

  const fechaUtc = new Date(`${iso}T00:00:00Z`);
  return Number.isFinite(fechaUtc.getTime()) && fechaUtc.toISOString().slice(0, 10) === iso
    ? iso
    : null;
}

export function formatearFechaPerfil(fecha?: string | null): string | null {
  return normalizarFechaPerfil(fecha)?.split('-').reverse().join('/') ?? null;
}

export function calcularEdad(fecha?: string | null, hoy = new Date()): number | null {
  const iso = normalizarFechaPerfil(fecha);
  if (!iso) return null;

  const [anio, mes, dia] = iso.split('-').map(Number);
  const mesActual = hoy.getMonth() + 1;
  const cumplePendiente = mesActual < mes || (mesActual === mes && hoy.getDate() < dia);
  const edad = hoy.getFullYear() - anio - Number(cumplePendiente);

  return edad < 0 ? null : edad;
}
