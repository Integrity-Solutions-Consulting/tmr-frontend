import { Component, computed, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Feriado, TipoFeriado } from '../../models/configuracion.models';

interface CalendarDay {
  date: Date;
  key: string;
  dayNumber: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  feriados: Feriado[];
}

@Component({
  selector: 'app-feriados-calendar',
  imports: [MatButtonModule, MatIconModule, MatMenuModule],
  templateUrl: './feriados-calendar.html',
  styleUrl: './feriados-calendar.scss',
})
export class FeriadosCalendar {
  readonly feriados = input.required<Feriado[]>();
  readonly addFeriado = output<string>();
  readonly viewFeriado = output<Feriado>();
  readonly editFeriado = output<Feriado>();
  readonly deleteFeriado = output<Feriado>();

  readonly currentMonth = signal(this.startOfMonth(new Date()));
  readonly selectedFeriado = signal<Feriado | null>(null);
  readonly weekdays = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];

  readonly monthTitle = computed(() => {
    const formatter = new Intl.DateTimeFormat('es-EC', { month: 'long', year: 'numeric' });
    const label = formatter.format(this.currentMonth());
    return label.charAt(0).toUpperCase() + label.slice(1);
  });

  readonly calendarDays = computed<CalendarDay[]>(() => {
    const month = this.currentMonth();
    const firstDay = this.startOfMonth(month);
    const mondayOffset = (firstDay.getDay() + 6) % 7;
    const gridStart = new Date(firstDay);
    gridStart.setDate(firstDay.getDate() - mondayOffset);

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      const key = this.toDateKey(date);

      return {
        date,
        key,
        dayNumber: date.getDate(),
        inCurrentMonth: date.getMonth() === month.getMonth(),
        isToday: key === this.toDateKey(new Date()),
        feriados: this.feriados().filter((feriado) => feriado.fecha === key),
      };
    });
  });

  previousMonth(): void {
    this.currentMonth.update((date) => new Date(date.getFullYear(), date.getMonth() - 1, 1));
  }

  nextMonth(): void {
    this.currentMonth.update((date) => new Date(date.getFullYear(), date.getMonth() + 1, 1));
  }

  goToday(): void {
    this.currentMonth.set(this.startOfMonth(new Date()));
  }

  selectDay(day: CalendarDay): void {
    this.addFeriado.emit(day.key);
  }

  openFeriadoMenu(event: MouseEvent, feriado: Feriado): void {
    event.stopPropagation();
    this.selectedFeriado.set(feriado);
  }

  emitSelected(action: 'view' | 'edit' | 'delete'): void {
    const feriado = this.selectedFeriado();
    if (!feriado) {
      return;
    }

    if (action === 'view') {
      this.viewFeriado.emit(feriado);
    }

    if (action === 'edit') {
      this.editFeriado.emit(feriado);
    }

    if (action === 'delete') {
      this.deleteFeriado.emit(feriado);
    }
  }

  typeClass(tipo: TipoFeriado): string {
    return `type-${tipo.toLowerCase()}`;
  }

  dayTypeClass(day: CalendarDay): string {
    const firstType = day.feriados[0]?.tipo;
    return firstType ? `has-holiday day-${firstType.toLowerCase()}` : '';
  }

  private startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private toDateKey(date: Date): string {
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }
}
