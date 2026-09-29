import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import JSZip from 'jszip';
import Swal from 'sweetalert2';
import { AuthService } from '../../../auth/servicios/auth.service';
import { environment } from '../../../../../environments/environment';
import { DatosSeguimientoPdf, crearReporteSeguimientoPdf } from '../../../../shared/utils/seguimiento-pdf.utils';
import { crearReporteSeguimientoExcel } from '../../../../shared/utils/seguimiento-excel.utils';

interface ProyectoAsignado { id: number; nombre: string; codigo?: string; }

@Component({
    selector: 'app-generar-reporte',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatSelectModule, MatButtonModule],
    templateUrl: './generar-reporte.html',
    styleUrls: ['./generar-reporte.scss']
})
export class GenerarReporte implements OnInit {
    private fb = inject(FormBuilder);
    private dialogRef = inject(MatDialogRef<GenerarReporte>);
    private http = inject(HttpClient);
    private authService = inject(AuthService);

    public clientes = signal<{ id: number; nombre: string }[]>([]);
    public proyectos: ProyectoAsignado[] = [];
    public empleadoNombre = 'Colaborador';
    public meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    public form: FormGroup = this.fb.group({
        clienteId: ['all'],
        anio: [new Date().getFullYear(), Validators.required],
        mes: [new Date().getMonth(), Validators.required],
        formato: ['xlsx', Validators.required],
    });

    ngOnInit(): void {
        this.empleadoNombre = this.authService.getCurrentUser()?.name || 'Colaborador';
        this.http.get<any>(environment.apiUrl + '/proyectos/lookups').subscribe({
            next: response => this.clientes.set(response?.clientes || []),
            error: () => this.clientes.set([]),
        });
        this.http.get<ProyectoAsignado[]>(environment.apiUrl + '/time-report/actividades/proyectos-disponibles').subscribe({
            next: response => this.proyectos = response || [],
            error: () => this.proyectos = [],
        });
    }

    cancelar(): void { this.dialogRef.close(); }

    async generar(): Promise<void> {
        if (this.form.invalid) return;
        const user = this.authService.getCurrentUser();
        if (!user?.idEmpleado) {
            this.dialogRef.close();
            this.mostrarPopup('person_off', 'Perfil incompleto', 'No se encontró un colaborador asociado al usuario actual.');
            return;
        }
        const values = this.form.value as { mes: number; anio: number; clienteId: number | string; formato: 'xlsx' | 'pdf' };
        const desde = String(values.anio) + '-' + String(Number(values.mes) + 1).padStart(2, '0') + '-01';
        const hasta = this.ultimoDia(values.anio, Number(values.mes) + 1);
        // El modal solo configura la descarga. Se cierra antes de consultar o generar
        // para que los avisos de resultado no queden detrás de MatDialog.
        this.dialogRef.close();
        Swal.fire({
            title: 'Preparando reporte',
            html: 'Se están preparando los archivos seleccionados.',
            allowOutsideClick: false,
            showConfirmButton: false,
            customClass: {
                container: 'tmr-swal-container',
                popup: 'tmr-swal tmr-swal--loading',
                title: 'tmr-swal__title',
                htmlContainer: 'tmr-swal__text',
            },
            didOpen: () => Swal.showLoading(),
        });
        try {
            const respuesta = await lastValueFrom(this.http.get<DatosSeguimientoPdf>(
                environment.apiUrl + '/time-report/actividades/mi-reporte',
                { params: { fechaDesde: desde, fechaHasta: hasta } },
            ));
            // Admite ambas convenciones de serialización del backend sin romper el flujo.
            const datos = {
                actividades: respuesta.actividades ?? (respuesta as any).Actividades ?? [],
                feriados: respuesta.feriados ?? (respuesta as any).Feriados ?? [],
            };
            const cliente = this.clientes().find(item => Number(item.id) === Number(values.clienteId));
            const actividades = (datos.actividades || []).filter(activity => values.clienteId === 'all' || this.normalizar(activity.clienteProyecto) === this.normalizar(cliente?.nombre));
            const reportes = this.agruparPorProyecto(actividades);
            if (reportes.length === 0) {
                await Swal.close();
                this.dialogRef.close();
                this.mostrarPopup('event_busy', 'Sin actividades', 'No hay actividades registradas para el periodo seleccionado.');
                return;
            }
            if (reportes.length === 1) {
                const contenido = await this.generarArchivo(user.name || 'Colaborador', reportes[0], datos.feriados || [], desde, hasta, values.formato);
                await Swal.close();
                this.guardarArchivo(new Blob([contenido], { type: values.formato === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), this.nombreArchivo(user.name || 'Colaborador', reportes[0].nombre, values.formato));
                this.dialogRef.close();
                this.mostrarPopup('download_done', 'Reporte generado', 'El reporte se descargó correctamente.');
                return;
            }
            const zip = new JSZip();
            const usados = new Set<string>();
            for (const reporte of reportes) {
                const contenido = await this.generarArchivo(user.name || 'Colaborador', reporte, datos.feriados || [], desde, hasta, values.formato);
                const base = this.limpiarNombre(reporte.nombre) || 'proyecto';
                let nombre = base;
                let sufijo = 2;
                while (usados.has(nombre.toLowerCase())) nombre = base + '_' + sufijo++;
                usados.add(nombre.toLowerCase());
                const colaborador = this.limpiarNombre(user.name || 'Colaborador') || 'Colaborador';
                zip.file('Reporte_' + colaborador + '_' + nombre + '.' + values.formato, contenido);
            }
            const contenidoZip = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
            await Swal.close();
            const colaborador = this.limpiarNombre(user.name || 'Colaborador') || 'Colaborador';
            this.guardarArchivo(contenidoZip, 'Seguimiento_' + colaborador + '_' + (values.formato === 'pdf' ? 'PDF' : 'Excel') + '_' + desde + '_a_' + hasta + '.zip');
            this.dialogRef.close();
            this.mostrarPopup('download_done', 'Reportes generados', 'Se descargaron ' + reportes.length + ' reportes en un archivo ZIP.');
        } catch {
            await Swal.close();
            this.mostrarPopup('error', 'No se pudo generar', 'No se pudieron preparar los reportes. Intenta nuevamente.');
        }
    }

    private async generarArchivo(nombre: string, reporte: { nombre: string; actividades: any[] }, feriados: string[], desde: string, hasta: string, formato: 'xlsx' | 'pdf'): Promise<ArrayBuffer> {
        const datos: DatosSeguimientoPdf = { actividades: reporte.actividades, feriados };
        return formato === 'pdf'
            ? crearReporteSeguimientoPdf(nombre, desde, hasta, datos, reporte.nombre)
            : crearReporteSeguimientoExcel(nombre, desde, hasta, datos, reporte.nombre);
    }

    private agruparPorProyecto(actividades: any[]): Array<{ nombre: string; actividades: any[] }> {
        const grupos = new Map<number | string, { nombre: string; actividades: any[] }>();
        actividades.forEach(activity => {
            const id = activity.idProyecto ?? activity.idproyecto ?? activity.IdProyecto ?? activity.proyecto ?? 'sin-proyecto';
            const proyecto = this.proyectos.find(item => Number(item.id) === Number(id));
            const nombre = proyecto?.nombre || activity.proyecto || 'Sin Proyecto';
            const actual: { nombre: string; actividades: any[] } = grupos.get(id) || { nombre, actividades: [] };
            actual.actividades.push(activity);
            grupos.set(id, actual);
        });
        return Array.from(grupos.values());
    }

    private ultimoDia(anio: number, mes: number): string { return String(anio) + '-' + String(mes).padStart(2, '0') + '-' + String(new Date(anio, mes, 0).getDate()).padStart(2, '0'); }
    private normalizar(value: unknown): string { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
    private limpiarNombre(value: string): string { return value.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim().replace(/\s+/g, '_').slice(0, 100); }
    private nombreArchivo(colaborador: string, proyecto: string, formato: 'xlsx' | 'pdf'): string {
        const nombreColaborador = this.limpiarNombre(colaborador) || 'Colaborador';
        const nombreProyecto = this.limpiarNombre(proyecto) || 'proyecto';
        return 'Reporte_' + nombreColaborador + '_' + nombreProyecto + '.' + formato;
    }
    private guardarArchivo(blob: Blob, nombre: string): void { const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = nombre; document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    private mostrarPopup(icono: string, titulo: string, html: string): void {
        void Swal.fire({
            icon: 'info',
            iconHtml: `<span class="material-symbols-outlined">${icono}</span>`,
            title: titulo,
            html,
            confirmButtonText: 'Entendido',
            buttonsStyling: false,
            customClass: {
                container: 'tmr-swal-container',
                popup: 'tmr-swal',
                icon: 'tmr-swal__icon ' + (icono === 'download_done' ? 'tmr-swal__icon--success' : ''),
                title: 'tmr-swal__title',
                htmlContainer: 'tmr-swal__text',
                actions: 'tmr-swal__actions',
                confirmButton: 'tmr-swal__btn-primary',
            },
        });
    }
}
