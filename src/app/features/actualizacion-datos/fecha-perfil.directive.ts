import { Directive, ElementRef, forwardRef, inject, Input } from '@angular/core';
import { AbstractControl, NG_VALIDATORS, Validator } from '@angular/forms';
import { fechaEcuadorInputHoy } from '../../shared/utils/date-range.utils';
import { normalizarFechaPerfil } from './edad-perfil.util';

@Directive({
  selector: 'input[type=date][appFechaPerfil]',
  host: {
    '[attr.max]': 'fechaMaxima',
  },
  providers: [
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => FechaPerfilDirective), multi: true },
  ],
})
export class FechaPerfilDirective implements Validator {
  @Input() appFechaPerfil: '' | 'nacimiento' | 'emision' = '';

  private readonly input = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;

  get fechaMaxima(): string {
    return this.appFechaPerfil ? fechaEcuadorInputHoy() : '9999-12-31';
  }

  validate(control: AbstractControl) {
    if (this.input.validity.badInput) return { fechaPerfil: true };
    if (!control.value) return null;

    const fecha = normalizarFechaPerfil(control.value);
    if (!fecha) return { fechaPerfil: true };
    return fecha > this.fechaMaxima ? { fechaFutura: true } : null;
  }
}
