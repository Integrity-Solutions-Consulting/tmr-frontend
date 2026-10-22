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
    // sm - "Fecha desde" del filtro de Seguimiento: el calendario abre en ese mes.
    fechaDesde?: string;
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
    // sm - Misma instancia (aislada, ver providers arriba) que usa <app-calendario>: permite mostrar aquí el
    // resumen de "días con jornada completa pero sin el mínimo de actividades" del mes que esté viendo el líder,
    // sin duplicar la llamada al backend.
    public actividadesService = inject(ActividadesService);

    constructor(@Inject(MAT_DIALOG_DATA) public data: CalendarioColaboradorModalData) {}

    // sm - Colaborador.id llega como string (así lo define el modelo de Seguimiento); Calendario espera un number.
    get idEmpleado(): number {
        return Number(this.data.colaborador.id);
    }

    // sm - Cada fila de Seguimiento es un colaborador+proyecto puntual (proyectos tiene como mucho 1 elemento: el
    // de esa fila). undefined cuando la fila es "Sin Proyecto": el calendario muestra el total del colaborador.
    get idProyecto(): number | undefined {
        return this.data.colaborador.proyectos?.[0]?.idProyecto;
    }

    cerrar(): void {
        this.dialogRef.close();
    }
}
