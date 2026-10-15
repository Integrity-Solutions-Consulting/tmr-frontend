import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  forwardRef,
  Input,
  Output,
  ViewEncapsulation,
} from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

export interface AppSelectOption {
  value: string | number | boolean;
  label: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatSelectModule],
  templateUrl: './select.component.html',
  styleUrl: './select.component.scss',
  encapsulation: ViewEncapsulation.None,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => AppSelectComponent), multi: true },
  ],
})
export class AppSelectComponent implements ControlValueAccessor {
  @Input() options: AppSelectOption[] = [];
  @Input() placeholder = 'Seleccione una opción';
  @Input() ariaLabel = 'Selector';
  @Output() valueChange = new EventEmitter<string | number | boolean>();

  value: string | number | boolean | null = null;
  disabled = false;
  abierto = false;
  private onChange: (value: string | number | boolean | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: string | number | boolean | null): void {
    this.value = value;
  }
  registerOnChange(fn: (value: string | number | boolean | null) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(disabled: boolean): void {
    this.disabled = disabled;
  }

  seleccionar(value: string | number | boolean): void {
    this.value = value;
    this.onChange(value);
    this.valueChange.emit(value);
  }

  marcarTocado(): void {
    this.onTouched();
  }
}
