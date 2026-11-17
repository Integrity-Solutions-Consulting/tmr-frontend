import '@angular/compiler';
import { FormControl } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import {
  NOMBRE_PERSONA_MAX_LENGTH,
  nombrePersonaValidator,
  normalizarNombrePersona
} from './nombre-persona.validator';

describe('nombrePersonaValidator', () => {
  const control = (value: string, required = true) => new FormControl(value, nombrePersonaValidator(required));

  it('acepta nombres con tildes, ñ y ü', () => {
    expect(control('María José').valid).toBe(true);
    expect(control('Muñoz Güevara').valid).toBe(true);
  });

  it('rechaza números, símbolos y HTML', () => {
    expect(control('Ana2').valid).toBe(false);
    expect(control('Ana-José').valid).toBe(false);
    expect(control('<b>Ana</b>').valid).toBe(false);
  });

  it('rechaza solo espacios cuando es obligatorio y permite vacío opcional', () => {
    expect(control('   ').valid).toBe(false);
    expect(control('', false).valid).toBe(true);
    expect(control('   ', false).valid).toBe(false);
  });

  it('normaliza trim/NFC y aplica el límite de 100 caracteres', () => {
    expect(normalizarNombrePersona('  María  ')).toBe('María');
    expect(control('A'.repeat(NOMBRE_PERSONA_MAX_LENGTH)).valid).toBe(true);
    expect(control('A'.repeat(NOMBRE_PERSONA_MAX_LENGTH + 1)).valid).toBe(false);
  });
});
