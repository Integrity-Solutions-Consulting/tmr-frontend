import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (visible) {
      <div class="confirm-dialog__backdrop" (click)="cancelar.emit()">
        <section class="confirm-dialog" (click)="$event.stopPropagation()">
          <button
            type="button"
            class="confirm-dialog__close"
            aria-label="Cerrar"
            (click)="cancelar.emit()"
          >
            x
          </button>

          <div class="confirm-dialog__icon">
            !
          </div>

          <h2>{{ titulo }}</h2>
          <p>{{ mensaje }}</p>

          <div class="confirm-dialog__actions">
            <button
              type="button"
              class="confirm-dialog__button confirm-dialog__button--secondary"
              (click)="cancelar.emit()"
            >
              {{ textoCancelar }}
            </button>

            <button
              type="button"
              class="confirm-dialog__button confirm-dialog__button--danger"
              (click)="confirmar.emit()"
            >
              {{ textoConfirmar }}
            </button>
          </div>
        </section>
      </div>
    }
  `,
  styles: [`
    .confirm-dialog__backdrop {
      position: fixed;
      inset: 0;
      z-index: 1200;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: rgba(0, 0, 0, 0.35);
    }

    .confirm-dialog {
      position: relative;
      min-width: 260px;
      width: min(92vw, 420px);
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      background: #ffffff;
      box-shadow: 0 8px 32px rgba(22, 53, 114, 0.15);
      padding: 40px 48px;
      text-align: center;
    }

    .confirm-dialog__close {
      position: absolute;
      top: 12px;
      right: 12px;
      width: 30px;
      height: 30px;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: #737373;
      font-size: 18px;
      line-height: 1;
      cursor: pointer;
    }

    .confirm-dialog__close:hover {
      background: #f5f5f5;
    }

    .confirm-dialog__icon {
      width: 44px;
      height: 44px;
      margin: 0 auto 14px;
      border-radius: 999px;
      background: #f5f5f5;
      color: #ef4444;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      font-weight: 800;
    }

    .confirm-dialog h2 {
      margin: 0;
      color: #163572;
      font-size: 24px;
      font-weight: 700;
    }

    .confirm-dialog p {
      margin: 10px 0 22px;
      color: #737373;
      font-size: 13px;
      line-height: 1.45;
    }

    .confirm-dialog__actions {
      display: flex;
      justify-content: center;
      gap: 10px;
    }

    .confirm-dialog__button {
      height: 40px;
      min-width: 116px;
      border-radius: 6px;
      padding: 0 14px;
      font: inherit;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }

    .confirm-dialog__button--secondary {
      border: 1px solid #e5e5e5;
      background: #ffffff;
      color: #737373;
    }

    .confirm-dialog__button--danger {
      border: 1px solid #ef4444;
      background: #ef4444;
      color: #ffffff;
    }
  `]
})
export class ConfirmDialogComponent {
  @Input() visible = false;
  @Input() titulo = 'Confirmar accion';
  @Input() mensaje = 'Esta accion no se puede deshacer.';
  @Input() textoConfirmar = 'Confirmar';
  @Input() textoCancelar = 'Cancelar';

  @Output() confirmar = new EventEmitter<void>();
  @Output() cancelar = new EventEmitter<void>();
}
