import '@angular/compiler';
import { FormControl } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { telefonoValidator } from './telefono.validator';

describe('telefonoValidator', () => {
  const control = (value: string, required = false) => new FormControl(value, telefonoValidator(required));

  it('acepta teléfono local de 10 dígitos y conserva ceros iniciales', () => {
    expect(control('0991234567').valid).toBe(true);
  });

  it('rechaza letras y longitud local superior a 10', () => {
    expect(control('09912abc67').valid).toBe(false);
    expect(control('09912345678').valid).toBe(false);
  });

  it('conserva y valida el formato internacional explícito', () => {
    expect(control('+593991234567').valid).toBe(true);
    expect(control('+5939912345678901').valid).toBe(false);
  });

  it('permite vacío opcional y rechaza vacío obligatorio', () => {
    expect(control('').valid).toBe(true);
    expect(control('', true).valid).toBe(false);
  });
});
