import { Injectable } from '@angular/core';

/** Utilidades de estado para los filtros visuales compartidos. */
@Injectable({ providedIn: 'root' })
export class FilterBarService {
  toggle(values: string[], value: string): string[] {
    return values.includes(value) ? values.filter(item => item !== value) : [...values, value];
  }

  label(values: string[], options: ReadonlyArray<{ value: string; label: string }>, fallback = 'Todos'): string {
    if (!values.length) return fallback;
    if (values.length === 1) return options.find(option => option.value === values[0])?.label ?? fallback;
    return `${values.length} seleccionados`;
  }
}
