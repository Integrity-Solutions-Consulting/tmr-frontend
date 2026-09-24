// sm - Modal nuevo: se abre desde el menú de 3 puntos de Seguimiento ("Ver calendario") para inspeccionar
// el calendario de UN colaborador puntual, reutilizando el componente Calendario en modo solo lectura
// (no navega fuera de Seguimiento, y no permite agregar/editar actividades).
import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { Calendario } from '../../actividades/calendario/calendario';
import { ActividadesService } from '../../../../shared/services/actividades.service';
import { Colaborador } from '../../../../shared/models/colaborador.model';

export interface CalendarioColaboradorModalData {
    colaborador: Colaborador;
}

@Component({
    selector: 'app-calendario-colaborador-modal',
    standalone: true,
    // sm - providers: [ActividadesService] crea una instancia del servicio aislada para este modal,
    // para no pisar el estado (signals) que usa la página propia de Actividades del usuario logueado.
    providers: [ActividadesService],
    imports: [
        CommonModule,
        MatDialogModule,
        MatIconModule,
        Calendario
    ],
    templateUrl: './calendario-colaborador-modal.html',
    styleUrl: './calendario-colaborador-modal.scss'
})
export class CalendarioColaboradorModal {
    private dialogRef = inject(MatDialogRef<CalendarioColaboradorModal>);

    constructor(@Inject(MAT_DIALOG_DATA) public data: CalendarioColaboradorModalData) {}

    // sm - Colaborador.id llega como string (así lo define el modelo de Seguimiento); Calendario espera un number.
    get idEmpleado(): number {
        return Number(this.data.colaborador.id);
    }

    cerrar(): void {
        this.dialogRef.close();
    }
}
