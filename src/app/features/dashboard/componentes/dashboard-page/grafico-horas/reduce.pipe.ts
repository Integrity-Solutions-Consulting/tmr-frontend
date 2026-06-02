import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'reduce',
  standalone: true
})
export class ReducePipe implements PipeTransform {
  transform<T>(array: T[], key: keyof T, initialValue: number = 0): number {
    if (!array || !key) {
      return initialValue;
    }
    return array.reduce((sum, item) => {
      const value = item[key];
      return sum + (typeof value === 'number' ? value : 0);
    }, initialValue);
  }
}
