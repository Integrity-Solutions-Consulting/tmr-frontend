import { Injectable } from '@angular/core';
import { NativeDateAdapter } from '@angular/material/core';

/** Rango de años aceptado al escribir una fecha a mano (evita años como 20266 o 254878). */
export const ANIO_MINIMO = 1900;
export const ANIO_MAXIMO = 2100;

/**
 * Adaptador de fechas para los mat-datepicker de la app.
 *
 * NativeDateAdapter interpreta el texto con Date.parse(), que en este formato es ambiguo:
 * "17/11/2026" lo lee como mes/día y un número como "2548787899" lo toma como timestamp.
 * Este adaptador acepta solo dd/mm/aaaa (también d/m/aaaa) y muestra siempre dd/mm/aaaa.
 * Si el texto no es una fecha válida devuelve una fecha inválida, así el control queda con
 * error (matDatepickerParse / formatoFecha) en lugar de guardar una fecha equivocada.
 */
@Injectable()
export class FechaDdMmYyyyAdapter extends NativeDateAdapter {

  override parse(value: unknown, parseFormat?: unknown): Date | null {
    if (value == null || value === '') return null;
    if (value instanceof Date) return value;
    if (typeof value === 'number') return this.invalid();

    const texto = String(value).trim();
    if (!texto) return null;

    const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(texto);
    if (!match) return this.invalid();

    const dia = Number(match[1]);
    const mes = Number(match[2]);
    const anio = Number(match[3]);
    if (anio < ANIO_MINIMO || anio > ANIO_MAXIMO) return this.invalid();

    const fecha = new Date(anio, mes - 1, dia);
    // new Date() "corrige" fechas imposibles (31/02 → 03/03); en ese caso es inválida.
    if (fecha.getFullYear() !== anio || fecha.getMonth() !== mes - 1 || fecha.getDate() !== dia) {
      return this.invalid();
    }
    return fecha;
  }

  override format(date: Date, displayFormat: Object): string {
    // El formato de entrada (lo que se ve en el input) siempre es dd/mm/aaaa.
    if (displayFormat === 'dd/MM/yyyy' || displayFormat === 'input') {
      if (!this.isValid(date)) return '';
      const dd = String(date.getDate()).padStart(2, '0');
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      return `${dd}/${mm}/${date.getFullYear()}`;
    }
    // Los demás formatos (encabezados del calendario, etiquetas) los resuelve Intl.
    return super.format(date, typeof displayFormat === 'string' ? {} : displayFormat);
  }
}
