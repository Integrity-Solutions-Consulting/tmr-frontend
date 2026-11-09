// sm - Modal nuevo: se abre desde el menú de 3 puntos de Seguimiento ("Ver calendario") para inspeccionar
// el calendario de UN colaborador puntual, reutilizando el componente Calendario en modo solo lectura
// (no navega fuera de Seguimiento). El líder del colaborador en ese proyecto puede activar "Completar actividades".
import { Component, Inject, Injector, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { Calendario } from '../../actividades/calendario/calendario';
import { AgregarActividad } from '../../actividades/agregar-actividad/agregar-actividad';
import { ActividadesService, CompletarLider } from '../../../../shared/services/actividades.service';
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
export class CalendarioColaboradorModal implements OnInit {
    private dialogRef = inject(MatDialogRef<CalendarioColaboradorModal>);
    private dialog = inject(MatDialog);
    private injector = inject(Injector);
    private actividadesService = inject(ActividadesService);

    // sm - Datos para completar actividades; null si quien abrió el modal no es el líder de este colaborador en este proyecto.
    public completar = signal<CompletarLider | null>(null);
    public completando = signal(false);
    private seActivoCompletar = false;

    constructor(@Inject(MAT_DIALOG_DATA) public data: CalendarioColaboradorModalData) {}

    ngOnInit(): void {
        if (!this.idProyecto) return;
        this.actividadesService.obtenerCompletarLider(this.idEmpleado, this.idProyecto).subscribe({
            next: (res) => { if (res?.puedeCompletar) this.completar.set(res); },
            error: (err) => console.error('Error al verificar si puede completar actividades', err)
        });
    }

    alternarCompletar(): void {
        this.completando.update(activo => !activo);
        this.seActivoCompletar = true;
    }

    abrirAgregar(fecha: Date): void {
        this.abrirActividad({ fecha });
    }

    abrirEditar(actividad: any): void {
        this.abrirActividad({ actividad });
    }

    // sm - injector: la ventana usa el ActividadesService de este modal, para validar y recargar el calendario del
    // colaborador y no el del líder.
    private abrirActividad(datos: { fecha?: Date; actividad?: any }): void {
        this.dialog.open(AgregarActividad, {
            injector: this.injector,
            width: '560px',
            maxHeight: '90vh',
            data: {
                ...datos,
                registroLider: {
                    idEmpleado: this.idEmpleado,
                    nombreColaborador: this.data.colaborador.nombre,
                    proyecto: this.completar()?.proyecto
                }
            },
            disableClose: true,
            autoFocus: false,
            restoreFocus: false, enterAnimationDuration: '0ms', exitAnimationDuration: '0ms',
            panelClass: 'tmr-dialog-panel'
        });
    }

    // sm - Colaborador.id llega como string (así lo define el modelo de Seguimiento); Calendario espera un number.
    get idEmpleado(): number {
        return Number(this.data.colaborador.id);
    }

    // sm - Cada fila de Seguimiento es un colaborador+proyecto puntual (proyectos tiene como mucho 1 elemento: el
    // de esa fila). undefined cuando la fila es "Sin Proyecto": el calendario muestra el total del colaborador.
    get idProyecto(): number | undefined {
        return this.data.colaborador.proyectos?.[0]?.idProyecto;
    }

    // sm - Si se activó el modo de completar, Seguimiento recarga la tabla para reflejar las horas.
    cerrar(): void {
        this.dialogRef.close(this.seActivoCompletar);
    }
}
