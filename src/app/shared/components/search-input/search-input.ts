import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="search-input">
      <svg class="search-input__icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      <input
        class="search-input__field"
        type="text"
        [placeholder]="placeholder"
        [(ngModel)]="value"
        (ngModelChange)="valueChange.emit($event)"
      />
    </div>
  `,
  styles: [`
    .search-input { display: flex; align-items: center; gap: 10px; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 0 14px; height: 40px; min-width: 220px; }
    .search-input__icon { color: #94a3b8; flex-shrink: 0; }
    .search-input__field { border: none; outline: none; font-size: 14px; color: #475569; background: transparent; width: 100%; }
    .search-input__field::placeholder { color: #cbd5e1; }
  `]
})
export class SearchInput {
  @Input() placeholder = 'Buscar...';
  @Input() value = '';
  @Output() valueChange = new EventEmitter<string>();
}
