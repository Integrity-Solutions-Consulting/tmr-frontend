import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'horasFormat',
  standalone: true
})
export class HorasFormatPipe implements PipeTransform {
  transform(value: any): string {
    if (value === null || value === undefined) return '0.00 h';
    const num = Number(value);
    if (isNaN(num)) return '0.00 h';
    return `${num.toFixed(2)} h`;
  }
}
