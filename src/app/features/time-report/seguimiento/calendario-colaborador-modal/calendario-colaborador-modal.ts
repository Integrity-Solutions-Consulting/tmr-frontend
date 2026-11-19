import { Component, Inject, Injector, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Calendario } from '../../actividades/calendario/calendario';
import { ActividadesService } from '../../../../shared/services/actividades.service';
import { Colaborador } from '../../../../shared/models/colaborador.model';
import { ResumenDiaActividadesComponent } from '../../../../shared/components/resumen-dia-actividades/resumen-dia-actividades.component';

export interface CalendarioColaboradorModalData { colaborador: Colaborador; fechaDesde?: string; }

@Component({
    selector: 'app-calendario-colaborador-modal', standalone: true, providers: [ActividadesService],
    imports: [CommonModule, MatDialogModule, MatIconModule, Calendario],
    templateUrl: './calendario-colaborador-modal.html', styleUrl: './calendario-colaborador-modal.scss'
})
export class CalendarioColaboradorModal {
    private dialogRef = inject(MatDialogRef<CalendarioColaboradorModal>);
    private dialog = inject(MatDialog);
    private injector = inject(Injector);

    constructor(@Inject(MAT_DIALOG_DATA) public data: CalendarioColaboradorModalData) {}

    abrirResumen(fecha: Date): void {
        this.dialog.open(ResumenDiaActividadesComponent, {
            injector: this.injector, width: '720px', maxWidth: '95vw', maxHeight: '90vh',
            data: { fecha, editable: false, titulo: 'Actividades del colaborador', nombreColaborador: this.data.colaborador.nombre },
            panelClass: 'tmr-dialog-panel'
        });
    }

    get idEmpleado(): number { return Number(this.data.colaborador.id); }
    get idProyecto(): number | undefined { return this.data.colaborador.proyectos?.[0]?.idProyecto; }
    cerrar(): void { this.dialogRef.close(); }
}
