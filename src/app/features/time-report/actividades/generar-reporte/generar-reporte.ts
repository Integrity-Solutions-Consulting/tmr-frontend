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

        // Cargar todas las actividades desde el backend y filtrarlas
        this.http.get<any[]>(`${environment.apiUrl}/carga-actividades`).subscribe({
            next: (actividades) => {
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
                    })
                    .map(a => {
                        const proy = this.proyectos.find(p => p.id === a.idproyecto);
                        return {
                            'Fecha': a.fechaactividad,
                            'Colaborador': user.name || 'Usuario',
                            'Proyecto': proy ? proy.nombre : 'Sin Proyecto',
                            'Cliente': proy ? proy.cliente : 'Sin Cliente',
                            'Código Requerimiento': a.codigorequerimiento || '',
                            'Horas': a.cantidadhoras,
                            'Descripción': a.descripcionactividad || '',
                            'Notas': a.notas || '',
                            'Es Billable': a.esbillable ? 'Sí' : 'No'
                        };
                    });

                const ws = XLSX.utils.json_to_sheet(filteredData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Reporte');

                const fileName = `Reporte_${this.meses[mes]}_${anio}.xlsx`;
                XLSX.writeFile(wb, fileName);

                this.dialogRef.close();
            },
            error: (err) => console.error('Error al generar el reporte', err)
        });
    }
}
