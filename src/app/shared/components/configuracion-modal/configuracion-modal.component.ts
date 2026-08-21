import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { ThemeService, ThemeMode } from '../../../core/services/theme.service';

export type TemaOpcion = 'light' | 'dark' | 'system';

@Component({
  selector: 'app-configuracion-modal',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  templateUrl: './configuracion-modal.component.html',
  styleUrl: './configuracion-modal.component.scss'
})
export class ConfiguracionModalComponent {
  private themeService = inject(ThemeService);
  
  public dialogRef = inject(MatDialogRef<ConfiguracionModalComponent>);

  get temaSeleccionado(): ThemeMode {
    return this.themeService.selectedTheme();
  }

  seleccionarTema(tema: ThemeMode): void {
    this.themeService.setTheme(tema);
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}
