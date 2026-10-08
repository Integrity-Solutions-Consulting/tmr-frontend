import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (visible) {
      <div class="confirm-dialog__backdrop">
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
      background: var(--overlay-backdrop);
    }

    .confirm-dialog {
      position: relative;
      min-width: 260px;
      width: min(92vw, 420px);
      border: 1px solid var(--border-default);
      border-radius: 14px;
      background: var(--bg-card);
      color: var(--text-main);
      box-shadow: var(--elevation-modal);
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
      color: var(--text-muted);
      font-size: 18px;
      line-height: 1;
      cursor: pointer;
    }

    .confirm-dialog__close:hover {
      background: var(--bg-hover);
    }

    .confirm-dialog__icon {
      width: 44px;
      height: 44px;
      margin: 0 auto 14px;
      border-radius: 999px;
      background: var(--status-danger-bg-soft);
      color: var(--status-danger-text);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      font-weight: 800;
    }

    .confirm-dialog h2 {
      margin: 0;
      color: var(--primary-color);
      font-size: 24px;
      font-weight: 700;
    }

    .confirm-dialog p {
      margin: 10px 0 22px;
      color: var(--text-secondary);
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
      border: 1px solid var(--border-default);
      background: var(--pattern-control-bg);
      color: var(--text-secondary);
    }

    .confirm-dialog__button--danger {
      border: 1px solid var(--status-danger-bg-solid);
      background: var(--status-danger-bg-solid);
      color: var(--text-inverse);
    }

    :host-context(html[data-theme="dark"]) {
      .confirm-dialog__backdrop {
        background: var(--overlay-backdrop) !important;
      }

      .confirm-dialog {
        background-color: var(--bg-card) !important;
        background: var(--bg-card) !important;
        border-color: var(--border-default) !important;
        color: var(--text-main) !important;
        box-shadow: var(--elevation-modal) !important;

        h2 {
          color: var(--primary-color) !important;
        }

        p {
          color: var(--text-secondary) !important;
        }

        .confirm-dialog__close {
          color: var(--text-muted) !important;
          &:hover {
            background: var(--bg-hover) !important;
            color: var(--text-main) !important;
          }
        }

        .confirm-dialog__icon {
          background: var(--status-danger-bg-soft) !important;
          color: var(--status-danger-text) !important;
        }

        .confirm-dialog__button--secondary {
          background: var(--pattern-control-bg) !important;
          border-color: var(--border-default) !important;
          color: var(--text-main) !important;
          &:hover {
            background: var(--bg-hover) !important;
          }
        }
      }
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
