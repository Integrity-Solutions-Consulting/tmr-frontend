import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const NOMBRE_PERSONA_MAX_LENGTH = 100;
export const NOMBRE_PERSONA_MENSAJE = 'Ingresa solo letras y espacios. Se permiten tildes y ñ. Máximo 100 caracteres.';

export function capitalizarInicialNombre(valor: string): string {
  return valor.replace(/^(\s*)(\p{L})/u, (_coincidencia, espacios: string, inicial: string) =>
    espacios + inicial.toLocaleUpperCase('es')
  );
}

export function normalizarNombrePersona(value: unknown): string {
  return capitalizarInicialNombre(String(value ?? '').normalize('NFC').trim());
}

export function nombrePersonaValidator(obligatorio = true): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = String(control.value ?? '');
    const value = normalizarNombrePersona(raw);

    if (!raw && !obligatorio) return null;
    if (!value) return obligatorio ? { required: true } : { soloEspacios: true };
    if (value.length > NOMBRE_PERSONA_MAX_LENGTH) {
      return { maxlength: { requiredLength: NOMBRE_PERSONA_MAX_LENGTH, actualLength: value.length } };
    }
    return /^[\p{L}\p{M} ]+$/u.test(value) ? null : { soloLetras: true };
  };
}
