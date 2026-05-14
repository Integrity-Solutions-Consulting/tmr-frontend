import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import * as XLSX from 'xlsx';

@Component({
    selector: 'app-generar-reporte',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatSelectModule,
        MatButtonModule
    ],
    templateUrl: './generar-reporte.html',
    styleUrls: ['./generar-reporte.scss']
})
export class GenerarReporte {
    private fb = inject(FormBuilder);
    private dialogRef = inject(MatDialogRef<GenerarReporte>);

    public meses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    public form: FormGroup = this.fb.group({
        clienteId: ['all'],
        anio: [2026, Validators.required],
        mes: [4, Validators.required] // Mayo (índice 4)
    });

    cancelar() {
        this.dialogRef.close();
    }

    generar() {
        if (this.form.invalid) return;

        const { mes, anio } = this.form.value;

        // Simulación de datos (Aquí podrías llamar a un servicio en el futuro)
        const data = [
            {
                Fecha: '06/05/2026',
                Tipo: 'Desarrollo',
                Proyecto: 'Proyecto bolsa de empleo',
                Código: 'ISC_FS_BOLSA_EMPLEO',
                Descripción: 'Desarrollo de componentes UI',
                Horas: 2.5
            }
        ];

        // Lógica de exportación Excel
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Reporte');

        const fileName = `Reporte_${this.meses[mes]}_${anio}.xlsx`;
        XLSX.writeFile(wb, fileName);

        this.dialogRef.close();
    }
}