import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { interval, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TOKEN_CONFIG } from '../../config/token.config';

/**
 * SessionExpirationModalComponent
 * Modal mejorado que se muestra 1 minuto antes de expirar el token
 * Incluye countdown visual y auto-logout si no hay respuesta
 */
@Component({
  selector: 'app-session-expiration-modal',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="session-expiration-modal">
      <div class="icon-container">
        <mat-icon>schedule</mat-icon>
      </div>
      
      <h2>Sesión próxima a expirar</h2>
      
      <p class="message">
        No se ha detectado actividad. <b>¿Deseas extender la sesión?</b>
      </p>
      
      
      <div class="actions">
        <button mat-raised-button (click)="onExtend()" class="btn-extend">
          Extender Sesión
        </button>
        <button mat-button (click)="onLogout()" class="btn-logout">
          Cerrar Sesión
        </button>
      </div>
      
      <p class="hint">
        Si no respondes en {{ totalSeconds }}s, se cerrará la sesión automáticamente
      </p>
    </div>
  `,
  styles: [`
    .session-expiration-modal {
      text-align: center;
      border-radius: 30px !important;
      padding: 24px;
      min-width: 360px;
      background: #ffffff;
    }

    .icon-container {
      margin-bottom: 16px;
      font-size: 48px;
      color: #ff9800;
      display: flex;
      justify-content: center;
    }

    ::ng-deep .icon-container mat-icon {
      width: 48px;
      height: 48px;
      font-size: 48px;
    }

    h2 {
      margin: 16px 0 8px;
      color: #333;
      font-size: 20px;
      font-weight: 500;
    }

    .message {
      color: #666;
      margin-bottom: 24px;
      line-height: 1.5;
      font-size: 14px;
    }


    .time {
      font-size: 56px;
      font-weight: bold;
      color: #ff9800;
      line-height: 1;
    }

    .label {
      font-size: 12px;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 8px;
      font-weight: 500;
    }


    .actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin: 24px 0 16px;
    }

    :host ::ng-deep .btn-extend {
      background-color: #0a2463 !important;
      color: #ffffff !important;
      width: 100%;
      height: 40px;
      font-size: 14px;
      font-weight: 500;
    }

    :host ::ng-deep .btn-logout {
      width: 100%;
      height: 40px;
      font-size: 14px;
      color: #666;
    }

    :host ::ng-deep .hint {
      font-size: 12px;
      color: #999;
      margin: 16px 0 0;
      font-style: italic;
    }
  `]
})
export class SessionExpirationModalComponent implements OnInit, OnDestroy {
  secondsRemaining = TOKEN_CONFIG.MODAL_RESPONSE_TIMEOUT;
  totalSeconds = TOKEN_CONFIG.MODAL_RESPONSE_TIMEOUT;
  
  private destroy$ = new Subject<void>();
  private dialogRef = inject(MatDialogRef<SessionExpirationModalComponent>);

  ngOnInit(): void {
    console.log('🔔 Modal de sesión abierto - Countdown iniciado');
    
    // Iniciar countdown de 1 segundo
    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.secondsRemaining--;
        
        if (this.secondsRemaining <= 0) {
          console.log('⏰ Timeout del modal - Auto logout');
          this.onTimeout();
        }
      });
  }

  /**
   * Usuario aceptó extender sesión
   */
  onExtend(): void {
    console.log('✅ Usuario aceptó extender sesión');
    this.dialogRef.close({ action: 'extend' });
  }

  /**
   * Usuario rechazó extender sesión
   */
  onLogout(): void {
    console.log('❌ Usuario rechazó extender sesión');
    this.dialogRef.close({ action: 'logout' });
  }

  /**
   * Timeout del modal - logout automático
   */
  private onTimeout(): void {
    console.log('❌ Timeout - sesión expirada sin respuesta');
    this.dialogRef.close({ action: 'timeout' });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
