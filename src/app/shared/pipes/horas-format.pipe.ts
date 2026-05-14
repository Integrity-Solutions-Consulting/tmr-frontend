import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'horasFormat',
  standalone: true
})
export class HorasFormatPipe implements PipeTransform {
  transform(value: number | undefined | null): string {
    if (value === null || value === undefined) return '0.00 h';
    return `${value.toFixed(2)} h`;
  }
}
