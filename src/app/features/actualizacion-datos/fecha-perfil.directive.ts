import { Directive, ElementRef, forwardRef, inject } from '@angular/core';
import { AbstractControl, ControlValueAccessor, NG_VALIDATORS, NG_VALUE_ACCESSOR, Validator } from '@angular/forms';
import { formatearFechaPerfil, normalizarFechaPerfil } from './edad-perfil.util';

@Directive({
  selector: 'input[appFechaPerfil]',
  host: {
    '(input)': 'actualizar()',
    '(blur)': 'confirmarFormato()',
  },
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => FechaPerfilDirective), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => FechaPerfilDirective), multi: true },
  ],
})
export class FechaPerfilDirective implements ControlValueAccessor, Validator {
  private readonly input = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    this.input.value = formatearFechaPerfil(value) ?? value ?? '';
  }

  registerOnChange(callback: (value: string) => void): void { this.onChange = callback; }
  registerOnTouched(callback: () => void): void { this.onTouched = callback; }
  setDisabledState(disabled: boolean): void { this.input.disabled = disabled; }

  validate(control: AbstractControl) {
    return control.value && !normalizarFechaPerfil(control.value) ? { fechaPerfil: true } : null;
  }

  actualizar(): void {
    const valor = this.input.value.trim();
    this.onChange(normalizarFechaPerfil(valor) ?? valor);
  }

  confirmarFormato(): void {
    const fecha = formatearFechaPerfil(this.input.value);
    if (fecha) this.input.value = fecha;
    this.onTouched();
  }
}
