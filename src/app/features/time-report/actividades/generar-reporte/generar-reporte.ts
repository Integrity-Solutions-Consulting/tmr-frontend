import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../auth/servicios/auth.service';
import { environment } from '../../../../../environments/environment';
import * as ExcelJS from 'exceljs';

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
export class GenerarReporte implements OnInit {
    private fb = inject(FormBuilder);
    private dialogRef = inject(MatDialogRef<GenerarReporte>);
    private http = inject(HttpClient);
    private authService = inject(AuthService);

    public clientes = signal<{id: number, nombre: string}[]>([]);
    public proyectos: any[] = [];

    public meses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    public form: FormGroup = this.fb.group({
        clienteId: ['all'],
        anio: [2026, Validators.required],
        mes: [4, Validators.required]
    });

    ngOnInit() {
        this.http.get<any>(`${environment.apiUrl}/proyectos/lookups`).subscribe({
            next: (res) => {
                if (res && res.clientes) {
                    this.clientes.set(res.clientes);
                }
            },
            error: (err) => console.error('Error al cargar lookups de clientes', err)
        });

        this.http.get<any[]>(`${environment.apiUrl}/proyectos`).subscribe({
            next: (res) => {
                this.proyectos = res || [];
            },
            error: (err) => console.error('Error al cargar proyectos', err)
        });
    }

    cancelar() {
        this.dialogRef.close();
    }

    generar() {
        if (this.form.invalid) return;

        const { mes, anio, clienteId } = this.form.value;
        const user = this.authService.getCurrentUser();
        if (!user) return;

        this.http.get<any[]>(`${environment.apiUrl}/carga-actividades`).subscribe({
            next: async (actividades) => {
                const mesFiltrado = mes + 1; // formulario es 0-indexed, la BD es 1-indexed

                const filteredData = (actividades || [])
                    .filter(a => {
                        const fecha = new Date(a.fechaactividad + 'T00:00:00');
                        const matchesUser = Number(a.idempleado) === Number(user.idEmpleado ?? user.id);
                        const matchesAnio = fecha.getFullYear() === anio;
                        const matchesMes = (fecha.getMonth() + 1) === mesFiltrado;

                        let matchesCliente = true;
                        if (clienteId !== 'all') {
                            const proy = this.proyectos.find(p => p.id === a.idproyecto);
                            matchesCliente = proy && Number(proy.idCliente) === Number(clienteId);
                        }

                        return matchesUser && matchesAnio && matchesMes && matchesCliente;
                    });

                if (filteredData.length === 0) {
                    console.warn("No hay actividades para el periodo seleccionado.");
                    this.dialogRef.close();
                    return;
                }

                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet('Reporte Actividades');

                const headerFill: ExcelJS.Fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF163572' }
                };
                const headerFont: Partial<ExcelJS.Font> = {
                    name: 'Arial',
                    size: 11,
                    bold: true,
                    color: { argb: 'FFFFFFFF' }
                };

                // Título
                worksheet.mergeCells('A1:I1');
                const titleCell = worksheet.getCell('A1');
                titleCell.value = `Reporte de Actividades - ${user.name || 'Colaborador'}`;
                titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF163572' } };
                titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
                worksheet.getRow(1).height = 30;

                // Subtítulo
                worksheet.mergeCells('A2:I2');
                const subtitleCell = worksheet.getCell('A2');
                subtitleCell.value = `Periodo: ${this.meses[mes]} ${anio}`;
                subtitleCell.font = { name: 'Arial', size: 10, italic: true };
                worksheet.getRow(2).height = 20;

                worksheet.addRow([]);

                // Cabeceras
                const headers = [
                    'Fecha', 'Colaborador', 'Proyecto', 'Cliente', 'Código Requerimiento', 'Horas', 'Descripción', 'Notas', 'Es Billable'
                ];
                const headerRow = worksheet.addRow(headers);
                headerRow.height = 24;
                headerRow.eachCell((cell) => {
                    cell.fill = headerFill;
                    cell.font = headerFont;
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'medium' },
                        right: { style: 'thin' }
                    };
                });

                let totalHoras = 0;
                filteredData.forEach(a => {
                    const proy = this.proyectos.find(p => p.id === a.idproyecto);
                    const row = worksheet.addRow([
                        a.fechaactividad,
                        user.name || 'Usuario',
                        proy ? proy.nombre : 'Sin Proyecto',
                        proy ? proy.cliente : 'Sin Cliente',
                        a.codigorequerimiento || '',
                        Number(a.cantidadhoras),
                        a.descripcionactividad || '',
                        a.notas || '',
                        a.esbillable ? 'Sí' : 'No'
                    ]);
                    row.height = 20;
                    totalHoras += Number(a.cantidadhoras);

                    row.getCell(1).alignment = { horizontal: 'center' };
                    row.getCell(5).alignment = { horizontal: 'center' };
                    row.getCell(6).alignment = { horizontal: 'right' };
                    row.getCell(9).alignment = { horizontal: 'center' };

                    row.eachCell((cell) => {
                        cell.border = {
                            top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                            left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                            bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                            right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
                        };
                    });
                });

                const totalRow = worksheet.addRow([
                    'TOTAL HORAS', '', '', '', '', totalHoras, '', '', ''
                ]);
                worksheet.mergeCells(`A${totalRow.number}:E${totalRow.number}`);
                totalRow.height = 22;
                totalRow.getCell(1).font = { bold: true };
                totalRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
                totalRow.getCell(6).font = { bold: true };
                totalRow.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };

                totalRow.eachCell((cell, colNum) => {
                    if (colNum <= 6) {
                        cell.border = {
                            top: { style: 'medium' },
                            bottom: { style: 'double' }
                        };
                    }
                });

                worksheet.columns.forEach((column, i) => {
                    if (i === 0) column.width = 12;
                    else if (i === 1) column.width = 25;
                    else if (i === 2) column.width = 25;
                    else if (i === 3) column.width = 25;
                    else if (i === 4) column.width = 18;
                    else if (i === 5) column.width = 10;
                    else if (i === 6) column.width = 35;
                    else if (i === 7) column.width = 25;
                    else if (i === 8) column.width = 12;
                });

                const buffer = await workbook.xlsx.writeBuffer();
                const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const fileName = `Reporte_${this.meses[mes]}_${anio}.xlsx`;
                a.download = fileName;
                a.click();
                window.URL.revokeObjectURL(url);

                this.dialogRef.close();
            },
            error: (err) => console.error('Error al generar el reporte', err)
        });
    }
}
