import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const TELEFONO_MENSAJE = 'Usa un teléfono local de 7 a 10 dígitos o internacional con + y 7 a 15 dígitos.';

export function telefonoValidator(obligatorio = false): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = String(control.value ?? '');
    const value = raw.trim();

    if (!value) return obligatorio ? { required: true } : null;
    if (/^\d+$/.test(value)) {
      return value.length >= 7 && value.length <= 10 ? null : { telefonoLongitud: true };
    }
    if (/^\+\d+$/.test(value)) {
      const digits = value.slice(1);
      return digits.length >= 7 && digits.length <= 15 ? null : { telefonoLongitud: true };
    }
    return { telefonoCaracteres: true };
  };
}
