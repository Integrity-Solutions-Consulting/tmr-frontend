import { Component, Inject, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { toSignal } from '@angular/core/rxjs-interop';

import { ActividadesService } from '../../../../shared/services/actividades.service';
import { FeriadosService } from '../../../../shared/services/feriados.service';

@Component({
    selector: 'app-agregar-actividad',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatCheckboxModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule
    ],
    templateUrl: './agregar-actividad.html',
    styleUrls: ['./agregar-actividad.scss']
})
export class AgregarActividad implements OnInit {
    private fb = inject(FormBuilder);
    private actividadesService = inject(ActividadesService);
    private feriadosService = inject(FeriadosService);
    private dialogRef = inject(MatDialogRef<AgregarActividad>);

    public form!: FormGroup;

    // Convertimos los cambios del formulario a un Signal para que el computed reaccione
    private formValues = inject(FormBuilder).group({}); // temporal para inicializar
    public formState = toSignal(this.fb.group({}).valueChanges); // Se asignará en ngOnInit

    constructor(@Inject(MAT_DIALOG_DATA) public data: any) { }

    ngOnInit() {
        this.form = this.fb.group({
            tipoActividad: ['Desarrollo', Validators.required],
            proyectoId: ['p1', Validators.required],
            codigoRequerimiento: ['', [Validators.required, Validators.maxLength(50)]],
            descripcion: ['', Validators.maxLength(350)],
            fechaActividad: [this.data?.fecha || new Date(), Validators.required],
            numeroHoras: [4, [Validators.required, Validators.min(0.5), Validators.max(24)]],
            esRecurrente: [false],
            fechaInicio: [this.data?.fecha || new Date()],
            fechaFin: [null],
            horasPorDia: [4],
            incluirFinesDeSemana: [false],
            incluirFeriados: [false]
        });
    }

    // Preview dinámico usando lógica de negocio
    public previewText = computed(() => {
        const v = this.form?.value; // Acceso directo al valor del form
        if (!v?.esRecurrente || !v?.fechaInicio || !v?.fechaFin) return '';

        const inicio = new Date(v.fechaInicio);
        const fin = new Date(v.fechaFin);

        if (fin < inicio) return '';

        const count = this.calcularDias(inicio, fin, v.incluirFinesDeSemana, v.incluirFeriados);
        const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

        return `Se crearán ${count} actividades entre ${fmt(inicio)} y ${fmt(fin)}`;
    });

    private calcularDias(inicio: Date, fin: Date, incluirFDS: boolean, incluirFeriados: boolean): number {
        let count = 0;
        const cur = new Date(inicio);
        while (cur <= fin) {
            const esFDS = cur.getDay() === 0 || cur.getDay() === 6;
            const esFeriado = this.feriadosService.esFeriado(cur);
            if ((incluirFDS || !esFDS) && (incluirFeriados || !esFeriado)) count++;
            cur.setDate(cur.getDate() + 1);
        }
        return count;
    }

    cancelar() { this.dialogRef.close(); }

    guardar() {
        if (this.form.valid) {
            this.actividadesService.agregarActividad(this.form.value);
            this.dialogRef.close();
        }
    }
}
