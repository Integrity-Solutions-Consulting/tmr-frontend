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
    .search-input { display: flex; align-items: center; gap: 10px; background: var(--input-bg); border: 1px solid var(--input-border); border-radius: 10px; padding: 0 14px; height: 40px; min-width: 220px; color: var(--text-main); transition: border-color .16s ease, box-shadow .16s ease, background-color .16s ease; }
    .search-input:focus-within { border-color: var(--primary-color); box-shadow: var(--focus-ring-primary); }
    .search-input__icon { color: var(--icon-color); flex-shrink: 0; }
    .search-input__field { border: none; outline: none; font: inherit; font-size: 14px; color: var(--text-main); background: transparent; width: 100%; }
    .search-input__field::placeholder { color: var(--text-muted); opacity: 1; }
  `]
})
export class SearchInput {
  @Input() placeholder = 'Buscar...';
  @Input() value = '';
  @Output() valueChange = new EventEmitter<string>();
}
