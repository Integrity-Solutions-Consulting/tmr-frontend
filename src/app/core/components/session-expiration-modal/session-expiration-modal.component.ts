import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

/**
 * SessionExpirationModalComponent
 * Modal que se muestra 1 minuto antes de expirar el token
 * Permite al usuario extender la sesión o cerrarla
 */
@Component({
  selector: 'app-session-expiration-modal',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <div class="session-modal">
      <div class="session-modal__header">
        <h2 mat-dialog-title>⏰ Sesión por Expirar</h2>
      </div>

      <mat-dialog-content class="session-modal__content">
        <p>Su sesión expirará en <strong>1 minuto</strong></p>
        <p>¿Desea extender su sesión?</p>
      </mat-dialog-content>

      <mat-dialog-actions align="end" class="session-modal__actions">
        <button mat-button (click)="onNo()" class="session-modal__btn-no">
          No, Cerrar Sesión
        </button>
        <button mat-raised-button color="primary" (click)="onYes()" class="session-modal__btn-yes">
          Sí, Extender Sesión
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .session-modal {
      min-width: 350px;
      padding: 0;
    }

    .session-modal__header {
      padding: 24px 24px 16px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.12);
    }

    .session-modal__header h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 500;
    }

    .session-modal__content {
      padding: 24px;
      text-align: center;
    }

    .session-modal__content p {
      margin: 12px 0;
      font-size: 16px;
      line-height: 1.5;
    }

    .session-modal__content strong {
      color: #d32f2f;
      font-weight: 600;
    }

    .session-modal__actions {
      padding: 16px 24px;
      border-top: 1px solid rgba(0, 0, 0, 0.12);
      margin: 0;
      gap: 8px;
    }

    .session-modal__btn-no {
      color: #666;
    }

    .session-modal__btn-yes {
      min-width: 120px;
    }
  `]
})
export class SessionExpirationModalComponent {
  private dialogRef = inject(MatDialogRef<SessionExpirationModalComponent>);

  /**
   * Usuario aceptó extender sesión
   */
  onYes(): void {
    this.dialogRef.close(true);
  }

  /**
   * Usuario rechazó y quiere cerrar sesión
   */
  onNo(): void {
    this.dialogRef.close(false);
  }
}
