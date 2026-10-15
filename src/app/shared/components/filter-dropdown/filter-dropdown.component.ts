import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, Output, inject } from '@angular/core';
import { DropdownScrollLockService } from '../../services/dropdown-scroll-lock.service';
import { FilterBarService } from '../../services/filter-bar.service';

export interface FilterDropdownOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-filter-dropdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './filter-dropdown.component.html',
  styleUrl: './filter-dropdown.component.scss',
})
export class FilterDropdownComponent implements OnDestroy {
  @Input() label = 'Filtro';
  @Input() placeholder = 'Todos';
  @Input() options: FilterDropdownOption[] = [];
  @Input() selected: string[] = [];
  @Input() multiple = true;
  @Output() selectedChange = new EventEmitter<string[]>();

  private readonly scrollLock = inject(DropdownScrollLockService);
  private readonly filterBar = inject(FilterBarService);
  abierto = false;

  get textoSeleccionado(): string {
    return this.filterBar.label(this.selected, this.options, this.placeholder);
  }

  toggle(): void {
    this.abierto = !this.abierto;
    this.abierto ? this.scrollLock.lock() : this.scrollLock.unlock();
  }

  seleccionar(value: string): void {
    if (this.multiple) {
      this.selectedChange.emit(this.filterBar.toggle(this.selected, value));
      return;
    }

    this.selectedChange.emit([value]);
    this.cerrar();
  }

  limpiar(): void {
    this.selectedChange.emit([]);
    this.cerrar();
  }
  cerrar(): void {
    if (this.abierto) this.scrollLock.unlock();
    this.abierto = false;
  }
  ngOnDestroy(): void {
    this.cerrar();
  }
}
