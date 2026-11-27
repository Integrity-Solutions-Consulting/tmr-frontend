export const TIPOS_DISCAPACIDAD = ['Física', 'Intelectual', 'Psicosocial', 'Auditiva', 'Visual'] as const;

export function tiposDiscapacidadRegistrados(value: string | null | undefined): string[] {
  const partes = (value ?? '').split(',').map(tipo => tipo.trim()).filter(Boolean);
  return partes.map(parte =>
    TIPOS_DISCAPACIDAD.find(tipo => tipo.localeCompare(parte, 'es', { sensitivity: 'base' }) === 0) ?? parte
  );
}
