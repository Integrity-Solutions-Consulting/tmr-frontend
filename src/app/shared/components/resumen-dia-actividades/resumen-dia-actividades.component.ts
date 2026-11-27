import { Component, Inject, Injector, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ActividadesService } from '../../services/actividades.service';
import { HorasFormatPipe } from '../../pipes/horas-format.pipe';

export interface ResumenDiaActividadesData {
  fecha: Date;
  editable: boolean;
  titulo?: string;
  nombreColaborador?: string;
  registroLider?: { idEmpleado: number; nombreColaborador: string; proyecto?: { id: number; nombre: string } | null; esGlobal?: boolean };
}

@Component({
  selector: 'app-resumen-dia-actividades',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule, MatIconModule, HorasFormatPipe],
  templateUrl: './resumen-dia-actividades.component.html',
  styleUrl: './resumen-dia-actividades.component.scss'
})
export class ResumenDiaActividadesComponent {
  private dialog = inject(MatDialog);
  private dialogRef = inject(MatDialogRef<ResumenDiaActividadesComponent>);
  private actividadesService = inject(ActividadesService);
  private injector = inject(Injector);
  private huboCambios = false;

  constructor(@Inject(MAT_DIALOG_DATA) public data: ResumenDiaActividadesData) {}

  get actividades(): any[] {
    this.actividadesService.actividades();
    return this.actividadesService.getActividadesVisiblesPorFecha(this.data.fecha);
  }

  get totalHoras(): number {
    return this.actividades.reduce((total, actividad) => total + Number(actividad.cantidadhoras || 0), 0);
  }

  get fechaFormateada(): string {
    return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(this.data.fecha);
  }

  async agregar(): Promise<void> {
    if (!this.data.editable) return;
    const { AgregarActividad } = await import('../../../features/time-report/actividades/agregar-actividad/agregar-actividad');
    this.dialog.open(AgregarActividad, {
      injector: this.injector, width: '560px', maxHeight: '90vh', data: { fecha: this.data.fecha, registroLider: this.data.registroLider }, disableClose: true,
      autoFocus: false, restoreFocus: false, enterAnimationDuration: '0ms', exitAnimationDuration: '0ms',
      panelClass: 'tmr-dialog-panel'
    }).afterClosed().subscribe(resultado => {
      if (resultado?.cambio) this.huboCambios = true;
    });
  }

  editar(actividad: any): void {
    if (!this.puedeEditar(actividad)) return;
    import('../../../features/time-report/actividades/agregar-actividad/agregar-actividad').then(({ AgregarActividad }) => {
      this.dialog.open(AgregarActividad, {
        injector: this.injector, width: '560px', maxHeight: '90vh', data: { actividad, registroLider: this.data.registroLider }, disableClose: true,
        autoFocus: false, restoreFocus: false, enterAnimationDuration: '0ms', exitAnimationDuration: '0ms',
        panelClass: 'tmr-dialog-panel'
      }).afterClosed().subscribe(resultado => {
        if (resultado?.cambio) this.huboCambios = true;
      });
    });
  }

  puedeEditar(actividad: any): boolean {
    return this.data.editable && (!this.data.registroLider || Number(actividad.idproyecto) === Number(this.data.registroLider.proyecto?.id));
  }

  cerrar(): void { this.dialogRef.close(this.huboCambios ? { cambio: true } : undefined); }
}
