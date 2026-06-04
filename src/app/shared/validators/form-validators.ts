import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

// Validators compartidos de TMR Frontend

/** Solo letras y espacios (sin numeros ni caracteres especiales) */
export const ONLY_LETTERS_REGEX = /^[a-zA-ZÀ-ÿ\s]+$/;

/** Nombre de usuario: letras, numeros, puntos y guiones bajos */
export const USERNAME_REGEX = /^[a-zA-Z0-9._]+$/;

/** Email estandar */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Solo numeros positivos */
export const NUMBERS_ONLY_REGEX = /^\d+$/;

/** Telefono local: exactamente 10 digitos. */
export const PHONE_10_DIGITS_REGEX = /^\d{10}$/;

/** Letras y numeros, sin simbolos especiales. Permite espacios, guion y guion bajo. */
export const SAFE_ALPHANUMERIC_REGEX = /^[a-zA-Z0-9\s_-]+$/;

/** Usuario interno: letras, numeros, punto, guion y guion bajo. */
export const INTERNAL_USERNAME_REGEX = /^[a-zA-Z0-9._-]+$/;

/** Password: minimo 8, mayuscula, minuscula, numero y caracter especial. */
export const TEMPORARY_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/;

export function temporaryPasswordValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '');

    if (!value) {
      return null;
    }

    return TEMPORARY_PASSWORD_REGEX.test(value) ? null : { temporaryPassword: true };
  };
}

export function cedulaEcuatorianaValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();

    if (!value) {
      return null;
    }

    if (!NUMBERS_ONLY_REGEX.test(value)) {
      return { numbersOnly: true };
    }

    return isValidEcuadorianCedula(value) ? null : { cedulaEcuador: true };
  };
}

export function rucEcuatorianoValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').trim();

    if (!value) {
      return null;
    }

    if (!NUMBERS_ONLY_REGEX.test(value)) {
      return { numbersOnly: true };
    }

    return isValidEcuadorianRuc(value) ? null : { rucEcuador: true };
  };
}

export function isValidEcuadorianCedula(value: string): boolean {
  if (!/^\d{10}$/.test(value)) {
    return false;
  }

  const province = Number(value.slice(0, 2));
  const thirdDigit = Number(value[2]);

  if (province < 1 || province > 24 || thirdDigit > 5) {
    return false;
  }

  const digits = value.split('').map(Number);
  const coefficients = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  const sum = coefficients.reduce((total, coefficient, index) => {
    const product = digits[index] * coefficient;
    return total + (product >= 10 ? product - 9 : product);
  }, 0);
  const verifier = sum % 10 === 0 ? 0 : 10 - (sum % 10);

  return verifier === digits[9];
}

export function isValidEcuadorianRuc(value: string): boolean {
  if (!/^\d{13}$/.test(value) || !value.endsWith('001')) {
    return false;
  }

  const thirdDigit = Number(value[2]);

  if (thirdDigit < 6) {
    return isValidEcuadorianCedula(value.slice(0, 10));
  }

  if (thirdDigit === 6) {
    return validateModulo11(value, [3, 2, 7, 6, 5, 4, 3, 2], 8);
  }

  if (thirdDigit === 9) {
    return validateModulo11(value, [4, 3, 2, 7, 6, 5, 4, 3, 2], 9);
  }

  return false;
}

function validateModulo11(value: string, coefficients: number[], verifierIndex: number): boolean {
  const digits = value.split('').map(Number);
  const sum = coefficients.reduce((total, coefficient, index) => total + digits[index] * coefficient, 0);
  const remainder = sum % 11;
  const verifier = remainder === 0 ? 0 : 11 - remainder;

  return verifier === digits[verifierIndex];
}
