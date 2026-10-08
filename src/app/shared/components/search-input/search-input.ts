import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-input.html',
  styleUrl: './search-input.scss',
})
export class SearchInput {
  @Input() placeholder = 'Buscar...';
  @Input() value = '';
  @Input() ariaLabel = 'Buscar';
  @Output() valueChange = new EventEmitter<string>();

  update(value: string): void {
    this.valueChange.emit(value);
  }

  clear(): void {
    this.update('');
  }
}
