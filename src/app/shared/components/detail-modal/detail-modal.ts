import { Component, Input, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

export interface DetailModalField {
  label: string;
  value: string;
}

export interface DetailModalData {
  title: string;
  subtitle?: string;
  fields: DetailModalField[];
}

@Component({
  selector: 'app-detail-modal',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  template: `
    <div class="detail-modal">
      <div class="detail-modal__header">
        <h2 class="detail-modal__title">{{ data.title }}</h2>
        <p class="detail-modal__subtitle" *ngIf="data.subtitle">{{ data.subtitle }}</p>
        <button class="detail-modal__close" (click)="close()">✕</button>
      </div>
      <div class="detail-modal__body">
        <div class="detail-modal__field" *ngFor="let field of data.fields">
          <span class="detail-modal__label">{{ field.label }}</span>
          <span class="detail-modal__value">{{ field.value }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .detail-modal { min-width: 360px; padding: 24px; font-family: 'Inter', sans-serif; }
    .detail-modal__header { position: relative; margin-bottom: 20px; }
    .detail-modal__title { font-size: 18px; font-weight: 700; color: #163572; margin: 0; }
    .detail-modal__subtitle { font-size: 13px; color: #64748b; margin: 4px 0 0; }
    .detail-modal__close { position: absolute; top: 0; right: 0; background: none; border: none; font-size: 16px; cursor: pointer; color: #94a3b8; }
    .detail-modal__field { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
    .detail-modal__label { font-size: 13px; color: #64748b; font-weight: 500; }
    .detail-modal__value { font-size: 13px; color: #1e293b; font-weight: 600; }
  `]
})
export class DetailModal {
  constructor(
    private dialogRef: MatDialogRef<DetailModal>,
    @Inject(MAT_DIALOG_DATA) public data: DetailModalData
  ) {}

  close(): void {
    this.dialogRef.close();
  }
}
