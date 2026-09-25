import { Component, inject, ViewChild, AfterViewInit, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { SelectionModel } from '@angular/cdk/collections';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { estandarizarCabeceraExcelExistente, exportarReporteExcel, exportarReportePdf } from '../../../shared/utils/reporte-export.utils';
// sm - HttpEventType/HttpResponse para leer el progreso de descarga del ZIP de Excel.
import { HttpClient, HttpEventType, HttpResponse } from '@angular/common/http';
import { ActividadSeguimientoPdf, crearZipSeguimientoPdf } from '../../../shared/utils/seguimiento-pdf.utils';
import { environment } from '../../../../environments/environment';

import { SeguimientoService } from '../../../shared/services/seguimiento.service';
import { Colaborador } from '../../../shared/models/colaborador.model';
import { HorasFormatPipe } from '../../../shared/pipes/horas-format.pipe';
import { PaginacionComponent } from '../../../shared/components/paginacion/paginacion.component';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import * as ExcelJS from 'exceljs';
// sm - Operadores para cancelar la descarga (takeUntil) y leer su progreso (tap/filter).
import { Observable, Subject, filter, lastValueFrom, takeUntil, tap } from 'rxjs';
import { MetricasSeguimiento } from '../../../shared/models/seguimiento.model';
// sm - Modal de "Ver calendario" (solo lectura) para inspeccionar el calendario de un colaborador desde Seguimiento.
import { CalendarioColaboradorModal } from './calendario-colaborador-modal/calendario-colaborador-modal';
// sm - SweetAlert2 para avisar con un pop up cuando la descarga de un solo colaborador no tiene actividades.
import Swal from 'sweetalert2';

// sm - Error propio para distinguir "colaborador sin actividades" de un fallo real de red o de generación.
class SinActividadesError extends Error {
    constructor(public readonly colaborador: string) {
        super(`No hay actividades registradas para ${colaborador} en este rango.`);
    }
}

// sm - Error propio para identificar que el usuario canceló la descarga desde el toast de progreso.
class DescargaCanceladaError extends Error {
    constructor() {
        super('Descarga cancelada por el usuario.');
    }
}

@Component({
    selector: 'app-seguimiento',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatTableModule,
        MatPaginatorModule,
        MatSortModule,
        MatInputModule,
        MatFormFieldModule,
        MatSelectModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatButtonModule,
        MatIconModule,
        MatCheckboxModule,
        MatMenuModule,
        MatAutocompleteModule,
        MatDialogModule,
        PaginacionComponent,
        HeaderComponent,
        HorasFormatPipe
    ],
    templateUrl: './seguimiento.html',
    styleUrl: './seguimiento.scss'
})
export class SeguimientoComponent implements AfterViewInit {
    private seguimientoService = inject(SeguimientoService);
    private http = inject(HttpClient);
    private dialog = inject(MatDialog);

    public columnas: string[] = [
        'select', 'nombre', 'proyecto', 'cliente', 'liderTecnico',
        'nroHoras', 'estado', 'diasConReporte', 'diasACompletar', 'acciones'
    ];
    public dataSource = new MatTableDataSource<Colaborador>(this.seguimientoService.colaboradores());
    public selection = new SelectionModel<Colaborador>(true, []);
    public isDownloading = false;
    public downloadMessage = '';
    public downloadMessageType: 'success' | 'error' | 'info' = 'info';
    private feedbackTimer?: ReturnType<typeof setTimeout>;
    // sm - Estado del toast animado de descarga (reemplaza al mensaje "Preparando..." en la descarga de seleccionados).
    public progresoDescarga = {
        visible: false,
        cerrando: false,
        titulo: '',
        detalle: '',
        progreso: 0,
        indeterminado: true,
        // sm - true cuando la descarga terminó con colaboradores sin actividades (el toast se pinta como advertencia).
        conAviso: false,
    };
    // sm - Emite cuando el usuario pulsa "Cancelar" en el toast para cortar la petición HTTP en curso.
    private cancelarDescarga$ = new Subject<void>();
    private descargaCancelada = false;

    // Filtros de búsqueda (Estado Local)
    public busqueda = '';
    public clienteSeleccionado = '';
    public clientes = signal<{ id: number, nombre: string }[]>([]);
    public clienteFilter = signal('');

    public clientesFiltrados = computed(() => {
        const q = this.clienteFilter().toLowerCase().trim();
        if (!q) return this.clientes();
        return this.clientes().filter(c => c.nombre.toLowerCase().includes(q));
    });
    public fechaDesde = (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    })();
    // sm - Se comenta el valor por defecto anterior (último día del mes actual) porque "Fecha hasta" debe iniciar en el día de hoy.
    // public fechaHasta = (() => {
    //     const d = new Date();
    //     const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    //     return `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
    // })();
    // sm - Nuevo valor por defecto: la fecha de hoy (fecha local del navegador, formato yyyy-MM-dd).
    public fechaHasta = (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })();
    public periodo: 'quincena' | 'mes-completo' = 'mes-completo';

    // Paginación (Estado Local para Rango)
    public pageIndex = 0;
    public pageSize = 5;

    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    // Reactividad vía Signals desde el Servicio de Negocio
    //public metricas = computed(() => this.seguimientoService.getMetricas());
    //SM - Esto hace que cuando se seleccionen colaboradores, las métricas se recalculen con base a los colaboradores seleccionados
    get metricas(): MetricasSeguimiento {
        if (this.selection.hasValue()) {
            return this.seguimientoService.calcularMetricas(this.selection.selected);
        }
        return this.seguimientoService.getMetricas();
    }

    // sm - La barra de métricas queda "en blanco" (valores con guion) cuando no hay ningún colaborador seleccionado
    // o cuando están seleccionados todos; solo muestra valores con una selección parcial (uno o varios, no todos).
    get metricasEnBlanco(): boolean {
        return !this.selection.hasValue() || this.isAllSelected();
    }

    // Ordenación manual para tabla HTML nativa
    public sortField: keyof Colaborador | '' = '';
    public sortAsc = true;

    private toTitleCase(str: string): string {
        if (!str) return '';
        return str
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    get colaboradoresPaginados(): Colaborador[] {
        const start = this.pageIndex * this.pageSize;
        return this.dataSource.filteredData.slice(start, start + this.pageSize);
    }

    public ordenar(campo: keyof Colaborador) {
        if (this.sortField === campo) {
            this.sortAsc = !this.sortAsc;
        } else {
            this.sortField = campo;
            this.sortAsc = true;
        }
        this.aplicarOrdenamiento();
    }

    private aplicarOrdenamiento() {
        if (!this.sortField) return;
        const data = [...this.dataSource.data];
        data.sort((a, b) => {
            const valA = a[this.sortField as keyof Colaborador];
            const valB = b[this.sortField as keyof Colaborador];
            
            if (typeof valA === 'number' && typeof valB === 'number') {
                return this.sortAsc ? valA - valB : valB - valA;
            }
            
            const strA = String(valA || '').toLowerCase();
            const strB = String(valB || '').toLowerCase();
            return this.sortAsc 
                ? strA.localeCompare(strB) 
                : strB.localeCompare(strA);
        });
        this.dataSource.data = data;
    }

    constructor() {
        effect(() => {
            const raw = this.seguimientoService.colaboradores();
            const formatted = raw.map(c => ({
                ...c,
                nombre: this.toTitleCase(c.nombre),
                proyecto: this.toTitleCase(c.proyecto),
                cliente: this.toTitleCase(c.cliente),
                liderTecnico: this.toTitleCase(c.liderTecnico)
            }));
            this.dataSource.data = formatted;
            this.aplicarOrdenamiento();
        });
    }

    ngAfterViewInit() {
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.dataSource.filterPredicate = (data: Colaborador, filter: string) => {
            const f = filter.toLowerCase();
            return data.nombre.toLowerCase().includes(f)
                || data.proyecto.toLowerCase().includes(f)
                || data.cliente.toLowerCase().includes(f)
                || data.liderTecnico.toLowerCase().includes(f);
        };

        // Cargar clientes desde lookups
        this.http.get<any>(`${environment.apiUrl}/proyectos/lookups`).subscribe({
            next: (res) => {
                if (res && res.clientes) {
                    this.clientes.set(res.clientes);
                }
            },
            error: (err) => console.error('Error al cargar clientes lookups', err)
        });

        // Cargar datos inicialmente
        this.seguimientoService.cargarColaboradores({
            fechaDesde: this.fechaDesde,
            fechaHasta: this.fechaHasta,
            periodo: this.periodo,
            busqueda: this.busqueda,
            clienteSeleccionado: this.clienteSeleccionado
        });
    }

    public onPageChange(event: any): void {
        this.pageIndex = event.pageIndex;
        this.pageSize = event.pageSize;
    }

    public onCustomPageChange(page: number): void {
        this.pageIndex = page - 1;
        if (this.dataSource.paginator) {
            this.dataSource.paginator.pageIndex = this.pageIndex;
            this.dataSource.paginator.page.next({
                pageIndex: this.pageIndex,
                pageSize: this.pageSize,
                length: this.totalRegistros
            });
        }
    }

    get totalRegistros(): number {
        return this.dataSource.filteredData.length || this.dataSource.data.length;
    }

    get totalPaginas(): number {
        return Math.ceil(this.totalRegistros / this.pageSize) || 1;
    }

    get paginaActualHuman(): number {
        return this.pageIndex + 1;
    }

    get registroDesde(): number {
        if (!this.totalRegistros) {
            return 0;
        }
        return this.pageIndex * this.pageSize + 1;
    }

    get registroHasta(): number {
        return Math.min((this.pageIndex + 1) * this.pageSize, this.totalRegistros);
    }

    public aplicarFiltros() {
        this.dataSource.filter = this.busqueda.trim().toLowerCase();
        if (this.dataSource.paginator) {
            this.pageIndex = 0;
            this.dataSource.paginator.firstPage();
        }
        this.seguimientoService.cargarColaboradores({
            fechaDesde: this.fechaDesde,
            fechaHasta: this.fechaHasta,
            periodo: this.periodo,
            busqueda: this.busqueda,
            clienteSeleccionado: this.clienteSeleccionado
        });
    }

    public isAllSelected() {
        return this.selection.selected.length === this.dataSource.data.length;
    }

    public masterToggle() {
        this.isAllSelected()
            ? this.selection.clear()
            : this.dataSource.data.forEach(row => this.selection.select(row));
    }

    public async descargarSeleccionados(formato: 'xlsx' | 'pdf') {
        if (!this.selection.hasValue() || this.isDownloading) return;

        const seleccionados = [...this.selection.selected];
        this.isDownloading = true;
        // sm - En lugar del mensaje "Preparando...", se muestra el toast animado con barra de progreso.
        this.iniciarProgresoDescarga(formato, seleccionados.length);

        try {
            // sm - Cantidad de colaboradores descargados sin actividades (solo aplica a descargas de 2 o más).
            let sinActividades = 0;
            if (seleccionados.length === 1 && formato === 'xlsx') {
                await this.descargarDetalle(seleccionados[0], true);
            } else {
                sinActividades = await this.descargarReportesZip(seleccionados, formato);
            }
            // sm - Ya no se limpia la selección al terminar la descarga: los colaboradores quedan seleccionados
            // y la barra de métricas (que depende de la selección) sigue visible.
            // sm - Con varios colaboradores no se usa pop up: si hubo vacíos se avisa en el texto final del toast.
            if (seleccionados.length > 1 && sinActividades > 0) {
                await this.finalizarProgresoDescarga(`Descarga completada · ${sinActividades} de ${seleccionados.length} sin actividades`, true);
            } else {
                // sm - Se completa la barra al 100% antes de cerrar el toast y mostrar el mensaje de éxito.
                await this.finalizarProgresoDescarga();
            }
            this.mostrarFeedback('Reportes preparados correctamente.', 'success');
        } catch (error) {
            // sm - Cualquier fin anticipado (sin actividades, cancelación o error) cierra el toast de progreso.
            this.cerrarProgresoDescarga();
            // sm - Si el único colaborador seleccionado no tiene actividades, se muestra el pop up en lugar del error genérico.
            if (error instanceof SinActividadesError) {
                this.mostrarPopupSinActividades(error.colaborador);
                return;
            }
            // sm - Si el usuario pulsó "Cancelar" en el toast, se informa sin tratarlo como error.
            if (error instanceof DescargaCanceladaError) {
                this.mostrarFeedback('Descarga cancelada.', 'info');
                return;
            }
            this.mostrarFeedback('No se pudieron preparar los reportes. Intenta nuevamente.', 'error');
        } finally {
            this.isDownloading = false;
        }
    }

    // sm - Muestra el toast de descarga. El PDF avanza por colaborador (progreso real);
    // el Excel se genera en el servidor, así que arranca con barra indeterminada hasta que llegan bytes.
    private iniciarProgresoDescarga(formato: 'xlsx' | 'pdf', cantidad: number): void {
        this.ocultarFeedback();
        this.descargaCancelada = false;
        this.progresoDescarga = {
            visible: true,
            cerrando: false,
            titulo: `Descargando ${formato === 'pdf' ? 'PDF' : 'Excel'}${cantidad > 1 ? ` de ${cantidad} colaboradores` : ''}`,
            detalle: formato === 'pdf' ? `0 de ${cantidad} reportes generados` : 'Generando reporte...',
            progreso: 0,
            indeterminado: formato === 'xlsx',
            conAviso: false,
        };
    }

    // sm - Actualiza el porcentaje y el texto del toast; al recibir un valor la barra deja de ser indeterminada.
    private actualizarProgresoDescarga(progreso: number, detalle: string): void {
        this.progresoDescarga = {
            ...this.progresoDescarga,
            progreso: Math.min(100, Math.max(0, Math.round(progreso))),
            detalle,
            indeterminado: false,
        };
    }

    // sm - Deja la barra en 100%, espera un instante para que se vea completa y cierra el toast con su animación de salida.
    // Si hay aviso (colaboradores sin actividades) el toast cambia a estilo de advertencia y se mantiene más tiempo para poder leerlo.
    private async finalizarProgresoDescarga(detalle = 'Descarga completada', conAviso = false): Promise<void> {
        this.actualizarProgresoDescarga(100, detalle);
        this.progresoDescarga = { ...this.progresoDescarga, conAviso };
        await new Promise(resolve => setTimeout(resolve, conAviso ? 3500 : 600));
        this.cerrarProgresoDescarga();
    }

    // sm - Cierra el toast con la animación de salida y luego lo quita del DOM.
    private cerrarProgresoDescarga(): void {
        if (!this.progresoDescarga.visible) return;
        this.progresoDescarga = { ...this.progresoDescarga, cerrando: true };
        setTimeout(() => {
            this.progresoDescarga = { ...this.progresoDescarga, visible: false, cerrando: false };
        }, 200);
    }

    // sm - Botón "Cancelar" del toast: corta la petición HTTP en curso y marca la descarga como cancelada.
    public cancelarDescarga(): void {
        if (!this.isDownloading || this.descargaCancelada) return;
        this.descargaCancelada = true;
        this.cancelarDescarga$.next();
        this.progresoDescarga = { ...this.progresoDescarga, detalle: 'Cancelando...' };
    }

    // sm - Espera una petición HTTP permitiendo cancelarla desde el toast; si se cancela lanza DescargaCanceladaError.
    private async esperarCancelable<T>(peticion: Observable<T>): Promise<T> {
        if (this.descargaCancelada) throw new DescargaCanceladaError();
        try {
            return await lastValueFrom(peticion.pipe(takeUntil(this.cancelarDescarga$)));
        } catch (error) {
            if (this.descargaCancelada) throw new DescargaCanceladaError();
            throw error;
        }
    }

    // sm - Devuelve cuántos colaboradores del ZIP no tenían actividades, para avisarlo al final del toast.
    private async descargarReportesZip(colaboradores: Colaborador[], formato: 'xlsx' | 'pdf'): Promise<number> {
        if (formato === 'pdf') {
            const fechaDesde = this.fechaDesde;
            const fechaHasta = this.fechaHasta;
            // sm - Contador de colaboradores ya consultados para calcular el avance real del toast.
            let procesados = 0;
            // sm - En PDF se cuentan los vacíos con la respuesta real de cada colaborador.
            let sinActividades = 0;
            const contenido = await crearZipSeguimientoPdf(colaboradores, fechaDesde, fechaHasta, async id => {
                // sm - Cuando se pide el colaborador N, el PDF del anterior ya se generó: se refleja en la barra.
                // El 90% se reparte entre colaboradores y el 10% restante queda para comprimir el ZIP.
                this.actualizarProgresoDescarga((procesados / colaboradores.length) * 90, `${procesados} de ${colaboradores.length} reportes generados`);
                const respuesta = await this.esperarCancelable(this.http.get<{ actividades: ActividadSeguimientoPdf[] }>(
                    `${environment.apiUrl}/time-report/seguimiento/colaborador/${id}/actividades`,
                    { params: { fechaDesde, fechaHasta } },
                ));
                procesados++;
                // sm - Con un solo colaborador y sin actividades no se genera el ZIP: se corta aquí para mostrar el pop up.
                // Con 2 o más colaboradores se sigue igual (PDF con "Sin actividades en el periodo") y sin pop up.
                if (colaboradores.length === 1 && (!respuesta.actividades || respuesta.actividades.length === 0)) {
                    throw new SinActividadesError(colaboradores[0].nombre);
                }
                if (!respuesta.actividades || respuesta.actividades.length === 0) sinActividades++;
                return respuesta.actividades;
            });
            // sm - Si se canceló mientras se generaba el último PDF, no se descarga el ZIP.
            if (this.descargaCancelada) throw new DescargaCanceladaError();
            const url = URL.createObjectURL(new Blob([contenido], { type: 'application/zip' }));
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `Seguimiento_PDF_${fechaDesde}_a_${fechaHasta}.zip`;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            return sinActividades;
        }
        // Excel conserva la descarga múltiple del servidor.
        const endpoint = environment.apiUrl + '/time-report/seguimiento/descarga-multiple';
        // sm - Se piden los eventos HTTP para mostrar en el toast el avance de la descarga del ZIP (bytes recibidos).
        const response = await this.esperarCancelable(this.http.post(endpoint, {
            ids: colaboradores.map(col => Number(col.id)),
            fechaDesde: this.fechaDesde,
            fechaHasta: this.fechaHasta,
            formato
        }, { observe: 'events', reportProgress: true, responseType: 'blob' }).pipe(
            tap(evento => {
                // sm - Mientras el servidor genera el ZIP la barra sigue indeterminada; al llegar bytes se muestra el porcentaje.
                if (evento.type === HttpEventType.DownloadProgress && evento.total) {
                    this.actualizarProgresoDescarga((evento.loaded / evento.total) * 100, `Descargando ${this.formatearTamano(evento.loaded)} de ${this.formatearTamano(evento.total)}`);
                }
            }),
            filter((evento): evento is HttpResponse<Blob> => evento.type === HttpEventType.Response),
        ));

        if (!response.body || response.body.size === 0) {
            throw new Error('El servidor no devolvió un ZIP válido.');
        }

        if (response.headers.get('Content-Type')?.toLowerCase().split(';')[0] !== 'application/zip') {
            throw new Error(`El servidor no devolvió un ZIP ${formato.toUpperCase()}.`);
        }

        const url = window.URL.createObjectURL(response.body);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `Seguimiento_Excel_${this.fechaDesde}_a_${this.fechaHasta}.zip`;
        anchor.click();
        window.URL.revokeObjectURL(url);
        // sm - En Excel el ZIP lo arma el servidor, así que los vacíos se cuentan con los datos de la tabla
        // (mismo rango de fechas): sin horas ni días con reporte = sin actividades.
        return colaboradores.filter(col => !Number(col.nroHoras) && !Number(col.diasConReporte)).length;
    }

    private mostrarFeedback(message: string, type: 'success' | 'error' | 'info', autoHide = true): void {
        if (this.feedbackTimer) clearTimeout(this.feedbackTimer);
        this.downloadMessage = message;
        this.downloadMessageType = type;
        if (autoHide) {
            this.feedbackTimer = setTimeout(() => {
                this.downloadMessage = '';
            }, 4500);
        }
    }

    private ocultarFeedback(): void {
        if (this.feedbackTimer) clearTimeout(this.feedbackTimer);
        this.downloadMessage = '';
    }

    // sm - Pop up de SweetAlert2 que avisa que el colaborador no tiene actividades en el rango de fechas seleccionado.
    // sm - Usa las clases "tmr-swal" (styles/_sweetalert.scss) para verse igual que los modales de la app:
    // tarjeta blanca, icono en círculo azul, título oscuro, texto gris y botón primario #163572 (con soporte de tema oscuro).
    private mostrarPopupSinActividades(colaborador: string): void {
        void Swal.fire({
            icon: 'info',
            iconHtml: '<span class="material-symbols-outlined">event_busy</span>',
            title: 'Sin actividades',
            html: `<strong>${this.escaparHtml(colaborador)}</strong> no tiene actividades registradas entre `
                + `<strong>${this.formatearFechaPopup(this.fechaDesde)}</strong> y <strong>${this.formatearFechaPopup(this.fechaHasta)}</strong>.`,
            confirmButtonText: 'Entendido',
            buttonsStyling: false,
            customClass: {
                container: 'tmr-swal-container',
                popup: 'tmr-swal',
                icon: 'tmr-swal__icon',
                title: 'tmr-swal__title',
                htmlContainer: 'tmr-swal__text',
                actions: 'tmr-swal__actions',
                confirmButton: 'tmr-swal__btn-primary',
            },
        });
    }

    private escaparHtml(texto: string): string {
        return String(texto ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    private formatearTamano(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    private formatearFechaPopup(fecha: string): string {
        const [anio, mes, dia] = (fecha ?? '').split('-');
        return anio && mes && dia ? `${dia}/${mes}/${anio}` : fecha;
    }

    public async descargarSeguimientoColaborador(col: Colaborador) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Seguimiento');

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

        worksheet.mergeCells('A1:H1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = `Seguimiento de Colaborador - ${col.nombre}`;
        titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF163572' } };
        titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
        worksheet.getRow(1).height = 30;

        worksheet.mergeCells('A2:H2');
        const subtitleCell = worksheet.getCell('A2');
        subtitleCell.value = `Periodo: del ${this.fechaDesde} al ${this.fechaHasta}`;
        subtitleCell.font = { name: 'Arial', size: 10, italic: true };
        worksheet.getRow(2).height = 20;

        worksheet.addRow([]);

        const headers = [
            'Colaborador', 'Proyecto', 'Cliente', 'Líder Técnico', 'Horas Registradas', 'Seguimiento', 'Días con Reporte', 'Días a Completar'
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

        const row = worksheet.addRow([
            col.nombre,
            col.proyecto,
            col.cliente,
            col.liderTecnico,
            Number(col.nroHoras),
            col.estado,
            Number(col.diasConReporte),
            Number(col.diasACompletar)
        ]);
        row.height = 22;
        
        row.getCell(5).alignment = { horizontal: 'right' };
        row.getCell(6).alignment = { horizontal: 'center' };
        row.getCell(7).alignment = { horizontal: 'center' };
        row.getCell(8).alignment = { horizontal: 'center' };

        row.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
            };
        });

        worksheet.columns.forEach((column, i) => {
            if (i === 0) column.width = 30;
            else if (i === 1) column.width = 25;
            else if (i === 2) column.width = 25;
            else if (i === 3) column.width = 25;
            else if (i === 4) column.width = 18;
            else if (i === 5) column.width = 15;
            else if (i === 6) column.width = 18;
            else if (i === 7) column.width = 18;
        });

        await estandarizarCabeceraExcelExistente(
            workbook,
            worksheet,
            `Seguimiento de Colaborador - ${col.nombre}`,
            8,
            `Periodo: del ${this.fechaDesde} al ${this.fechaHasta}`,
        );
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Seguimiento_${col.nombre.replace(/\s+/g, '_')}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    public async exportarExcel() {
        await exportarReporteExcel({
            titulo: 'Reporte de Seguimiento',
            nombreArchivo: 'Seguimiento',
            nombreHoja: 'Seguimiento',
            columnas: [
                { encabezado: 'Colaborador', anchoExcel: 30 },
                { encabezado: 'Proyecto', anchoExcel: 25 },
                { encabezado: 'Cliente', anchoExcel: 25 },
                { encabezado: 'Líder técnico', anchoExcel: 25 },
                { encabezado: 'Horas registradas', anchoExcel: 18, alineacion: 'center' },
                { encabezado: 'Seguimiento', anchoExcel: 18, alineacion: 'center' },
                { encabezado: 'Días con reporte', anchoExcel: 18, alineacion: 'center' },
                { encabezado: 'Días a completar', anchoExcel: 18, alineacion: 'center' },
            ],
            filas: this.dataSource.filteredData.map((colaborador) => [
                colaborador.nombre,
                colaborador.proyecto,
                colaborador.cliente,
                colaborador.liderTecnico,
                Number(colaborador.nroHoras),
                colaborador.estado,
                Number(colaborador.diasConReporte),
                Number(colaborador.diasACompletar),
            ]),
            orientacionPdf: 'landscape',
        });
        return;

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Seguimiento');

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

        worksheet.mergeCells('A1:H1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = 'Consolidado de Seguimiento';
        titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF163572' } };
        titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
        worksheet.getRow(1).height = 30;

        worksheet.mergeCells('A2:H2');
        const subtitleCell = worksheet.getCell('A2');
        subtitleCell.value = `Periodo: del ${this.fechaDesde} al ${this.fechaHasta}`;
        subtitleCell.font = { name: 'Arial', size: 10, italic: true };
        worksheet.getRow(2).height = 20;

        worksheet.addRow([]);

        const headers = [
            'Colaborador', 'Proyecto', 'Cliente', 'Líder Técnico', 'Horas Registradas', 'Seguimiento', 'Días con Reporte', 'Días a Completar'
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

        this.dataSource.filteredData.forEach(c => {
            const row = worksheet.addRow([
                c.nombre,
                c.proyecto,
                c.cliente,
                c.liderTecnico,
                Number(c.nroHoras),
                c.estado,
                Number(c.diasConReporte),
                Number(c.diasACompletar)
            ]);
            row.height = 20;
            
            row.getCell(5).alignment = { horizontal: 'right' };
            row.getCell(6).alignment = { horizontal: 'center' };
            row.getCell(7).alignment = { horizontal: 'center' };
            row.getCell(8).alignment = { horizontal: 'center' };

            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                    left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                    bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                    right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
                };
            });
        });

        worksheet.columns.forEach((column, i) => {
            if (i === 0) column.width = 30;
            else if (i === 1) column.width = 25;
            else if (i === 2) column.width = 25;
            else if (i === 3) column.width = 25;
            else if (i === 4) column.width = 18;
            else if (i === 5) column.width = 15;
            else if (i === 6) column.width = 18;
            else if (i === 7) column.width = 18;
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Consolidado_Seguimiento_${this.fechaDesde}_a_${this.fechaHasta}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    public exportarPDF() {
        void exportarReportePdf({
            titulo: 'Reporte de Seguimiento',
            nombreArchivo: 'Seguimiento',
            nombreHoja: 'Seguimiento',
            columnas: [
                { encabezado: 'Colaborador', anchoPdf: 48 },
                { encabezado: 'Proyecto', anchoPdf: 45 },
                { encabezado: 'Cliente', anchoPdf: 42 },
                { encabezado: 'Líder técnico', anchoPdf: 42 },
                { encabezado: 'Horas', anchoPdf: 22, alineacion: 'center' },
                { encabezado: 'Seguimiento', anchoPdf: 28, alineacion: 'center' },
                { encabezado: 'Días con reporte', anchoPdf: 24, alineacion: 'center' },
                { encabezado: 'Días a completar', anchoPdf: 24, alineacion: 'center' },
            ],
            filas: this.dataSource.filteredData.map((colaborador) => [
                colaborador.nombre,
                colaborador.proyecto,
                colaborador.cliente,
                colaborador.liderTecnico,
                Number(colaborador.nroHoras),
                colaborador.estado,
                Number(colaborador.diasConReporte),
                Number(colaborador.diasACompletar),
            ]),
            orientacionPdf: 'landscape',
        });
        return;

        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

        doc.setFillColor(22, 53, 114);
        doc.rect(0, 0, 297, 20, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('REPORTE DE SEGUIMIENTO', 148, 13, { align: 'center' });

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const fecha = new Date().toLocaleDateString('es-EC', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        doc.text(`Generado el: ${fecha}`, 285, 13, { align: 'right' });

        const rows = this.dataSource.filteredData;

        autoTable(doc, {
            startY: 26,
            head: [[
                'Colaborador', 'Proyecto', 'Cliente', 'Líder Técnico', 'Nro Horas', 'Estado'
            ]],
            body: rows.map(c => [
                c.nombre,
                c.proyecto,
                c.cliente,
                c.liderTecnico,
                c.nroHoras,
                c.estado
            ]),
            styles: {
                font: 'helvetica',
                fontSize: 8,
                cellPadding: 4,
                valign: 'middle',
            },
            headStyles: {
                fillColor: [22, 53, 114],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 8.5,
                halign: 'center',
            },
            bodyStyles: {
                textColor: [55, 65, 81],
            },
            alternateRowStyles: {
                fillColor: [245, 247, 255],
            },
            columnStyles: {
                0: { cellWidth: 55 },
                1: { cellWidth: 55 },
                2: { cellWidth: 55 },
                3: { cellWidth: 55 },
                4: { halign: 'center', cellWidth: 25 },
                5: { halign: 'center', cellWidth: 32 }
            },
            willDrawCell: (data) => {
                if (data.section === 'body' && data.column.index === 5) {
                    const estado = data.cell.raw as string;
                    if (estado === 'Aprobado' || estado === 'Activo') {
                        data.cell.styles.textColor = [22, 163, 74];
                    } else {
                        data.cell.styles.textColor = [220, 38, 38];
                    }
                }
            },
            margin: { left: 10, right: 10 },
            tableLineColor: [229, 231, 235],
            tableLineWidth: 0.1,
        });

        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(7);
            doc.setTextColor(156, 163, 175);
            doc.text(
                `Página ${i} de ${pageCount} — Integrity Solutions`,
                148, 205, { align: 'center' }
            );
        }

        const dateStr = new Date().toLocaleDateString('es-EC').replace(/\//g, '-');
        doc.save(`seguimiento_${dateStr}.pdf`);
    }

    public filtrarClientes(event: any) {
        const val = event?.target ? event.target.value : event;
        this.clienteFilter.set(val || '');
    }

    // sm - Abre el calendario del colaborador en un modal (encima de Seguimiento, sin navegar de página) y solo lectura.
    public verCalendarioColaborador(col: Colaborador): void {
        this.dialog.open(CalendarioColaboradorModal, {
            data: { colaborador: col },
            width: '900px',
            maxHeight: '90vh',
            panelClass: 'tmr-dialog-panel'
        });
    }

    public async descargarDetalle(col: Colaborador, propagarError = false) {
        try {
            const urlDetalle = `${environment.apiUrl}/time-report/seguimiento/colaborador/${col.id}/actividades`;
            const peticionDetalle = this.http.get<{ actividades: any[], feriados: string[] }>(urlDetalle, {
                params: { fechaDesde: this.fechaDesde, fechaHasta: this.fechaHasta }
            });
            // sm - Desde el botón "Descargar" (propagarError) la petición se puede cancelar con el toast; desde el menú de la fila no hay toast.
            const res = propagarError
                ? await this.esperarCancelable(peticionDetalle)
                : await lastValueFrom(peticionDetalle);

            const rawActividades = res.actividades || [];
            const feriados = res.feriados || [];

            if (!rawActividades || rawActividades.length === 0) {
                // sm - Descarga individual sin actividades: si viene del botón "Descargar" se propaga para que lo maneje
                // descargarSeleccionados; si viene del menú de la fila se muestra el pop up directamente.
                if (propagarError) throw new SinActividadesError(col.nombre);
                this.mostrarPopupSinActividades(col.nombre);
                return;
            }

            // Agrupación de actividades por Cliente
            const groupsByClient: { [clientName: string]: any[] } = {};
            rawActividades.forEach(act => {
                const client = act.clienteProyecto || 'Sin Cliente';
                if (!groupsByClient[client]) {
                    groupsByClient[client] = [];
                }
                groupsByClient[client].push(act);
            });

            const startDate = new Date(this.fechaDesde + 'T00:00:00');
            const endDate = new Date(this.fechaHasta + 'T00:00:00');
            const listDates: Date[] = [];
            let cur = new Date(startDate);
            while (cur <= endDate) {
                listDates.push(new Date(cur));
                cur.setDate(cur.getDate() + 1);
            }
            const totalDays = listDates.length;
            const totalCols = 6 + totalDays + 1; // N° + Tipo + Líder + Req + Desc + TotalAct + Días + TotalActFinal

            const workbook = new ExcelJS.Workbook();

            const clientNames = Object.keys(groupsByClient);
            for (let clientIdx = 0; clientIdx < clientNames.length; clientIdx++) {
                const clientName = clientNames[clientIdx];
                const clientActividades = groupsByClient[clientName];

                // Limpiar nombre de hoja para que sea válido en Excel
                let sheetName = `Reporte_${clientName}`.replace(/[*?:\\/\[\]]/g, '').substring(0, 31);
                if (sheetName.length === 0) sheetName = `Reporte_${clientIdx + 1}`;
                const worksheet = workbook.addWorksheet(sheetName);

                // Configurar anchos de columna
                const colWidths = [5, 20, 25, 25, 60, 15]; // N°, Tipo, Líder, Req, Desc, Total
                for (let i = 0; i < totalDays; i++) {
                    colWidths.push(4.5); // Días
                }
                colWidths.push(15); // Total Final
                worksheet.columns = colWidths.map((w, idx) => ({
                    key: `col_${idx + 1}`,
                    width: w
                }));

                // Fila 4: Cliente
                worksheet.getCell(4, 1).value = 'Cliente:';
                worksheet.getCell(4, 1).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF163572' } };
                worksheet.getCell(4, 3).value = clientName;
                worksheet.getCell(4, 3).font = { name: 'Arial', size: 11, bold: true };

                // Fila 5: Nombre del consultor
                worksheet.getCell(5, 1).value = 'Nombre del consultor:';
                worksheet.getCell(5, 1).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF163572' } };
                worksheet.getCell(5, 3).value = col.nombre;
                worksheet.getCell(5, 3).font = { name: 'Arial', size: 11, bold: true };

                // Fila 6: Encabezados de tabla
                worksheet.getCell(6, 1).value = 'N°';
                worksheet.getCell(6, 2).value = 'TIPO DE ACTIVIDAD';
                worksheet.getCell(6, 3).value = 'LIDER DE PROYECTO';
                worksheet.getCell(6, 4).value = 'CODIGO REQUERIMIENTO / INCIDENTE';
                worksheet.getCell(6, 5).value = 'DESCRIPCION DE TRABAJOS REALIZADOS';
                worksheet.getCell(6, 6).value = 'TOTAL HORAS POR ACTIVIDAD';
                worksheet.getCell(6, 7).value = 'DISTRIBUCION DE TIEMPO DEL DIA';
                worksheet.getCell(6, totalCols).value = 'TOTAL HORAS POR ACT.';

                // Combinaciones de encabezado
                worksheet.mergeCells(6, 1, 8, 1); // N°
                worksheet.mergeCells(6, 2, 8, 2); // Tipo
                worksheet.mergeCells(6, 3, 8, 3); // Líder
                worksheet.mergeCells(6, 4, 8, 4); // Req
                worksheet.mergeCells(6, 5, 8, 5); // Desc
                worksheet.mergeCells(6, 6, 8, 6); // Total
                worksheet.mergeCells(6, 7, 6, 6 + totalDays); // Distribución del tiempo
                worksheet.mergeCells(6, totalCols, 8, totalCols); // Total Final

                // Fila 7: Números de día (01..31)
                listDates.forEach((date, dateIdx) => {
                    const dayNum = String(date.getDate()).padStart(2, '0');
                    worksheet.getCell(7, 7 + dateIdx).value = dayNum;
                });

                // Fila 8: Iniciales de día de la semana (L, M, M, J, V, S, D)
                const weekdays = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
                listDates.forEach((date, dateIdx) => {
                    const dayName = weekdays[date.getDay()];
                    worksheet.getCell(8, 7 + dateIdx).value = dayName;
                });

                // Estilo del encabezado
                const tableHeaderFill: ExcelJS.Fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF163572' }
                };

                for (let r = 6; r <= 8; r++) {
                    for (let c = 1; c <= totalCols; c++) {
                        const cell = worksheet.getCell(r, c);
                        cell.fill = tableHeaderFill;
                        cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
                        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                        cell.border = {
                            top: { style: 'thin', color: { argb: 'FFFFFFFF' } },
                            left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
                            bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } },
                            right: { style: 'thin', color: { argb: 'FFFFFFFF' } }
                        };
                    }
                }

                // Agrupar actividades por combinación única
                const groupedRows: { [key: string]: {
                    tipo: string,
                    lider: string,
                    req: string,
                    desc: string,
                    isRecurrente: boolean,
                    hoursByDay: { [dateStr: string]: number }
                } } = {};

                clientActividades.forEach(act => {
                    const isRec = !!(act.esRecurrente || act.recurrente);
                    const key = `${act.tipoActividad}|${act.liderProyecto}|${act.codigoRequerimiento}|${act.descripcion}|${isRec}`;
                    if (!groupedRows[key]) {
                        groupedRows[key] = {
                            tipo: act.tipoActividad,
                            lider: act.liderProyecto,
                            req: act.codigoRequerimiento,
                            desc: act.descripcion,
                            isRecurrente: isRec,
                            hoursByDay: {}
                        };
                    }
                    const dateStr = act.fecha;
                    groupedRows[key].hoursByDay[dateStr] = (groupedRows[key].hoursByDay[dateStr] || 0) + Number(act.horas);
                });

                // Escribir datos
                let currentRow = 9;
                let seqNum = 1;

                const alternatingFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
                const whiteFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
                const weekendFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8DB4E2' } };
                const feriadoFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }; 
                const vacacionesFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } }; 
                const permisoFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF76933C' } };
                const recurrenteFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCC0DA' } };

                Object.keys(groupedRows).forEach(key => {
                    const group = groupedRows[key];
                    const isAlternating = (seqNum % 2 === 0);
                    const baseFill = isAlternating ? alternatingFill : whiteFill;

                    worksheet.getCell(currentRow, 1).value = seqNum++;
                    worksheet.getCell(currentRow, 2).value = group.tipo;
                    worksheet.getCell(currentRow, 3).value = group.lider;
                    worksheet.getCell(currentRow, 4).value = group.req;
                    worksheet.getCell(currentRow, 5).value = group.desc;

                    // Días
                    listDates.forEach((date, dateIdx) => {
                        const dateStr = this.formatDate(date);
                        const hrs = group.hoursByDay[dateStr];
                        if (hrs > 0) {
                            worksheet.getCell(currentRow, 7 + dateIdx).value = hrs;
                        }
                    });

                    // Fórmulas
                    const startAddr = worksheet.getCell(currentRow, 7).address.replace(/[0-9]/g, '');
                    const endAddr = worksheet.getCell(currentRow, 6 + totalDays).address.replace(/[0-9]/g, '');
                    worksheet.getCell(currentRow, 6).value = { formula: `SUM(${startAddr}${currentRow}:${endAddr}${currentRow})` } as any;
                    worksheet.getCell(currentRow, totalCols).value = { formula: `SUM(${startAddr}${currentRow}:${endAddr}${currentRow})` } as any;

                    // Estilo de fila de datos
                    for (let c = 1; c <= totalCols; c++) {
                        const cell = worksheet.getCell(currentRow, c);
                        cell.fill = baseFill;
                        cell.font = { name: 'Arial', size: 10, color: { argb: 'FF334155' } };
                        cell.border = {
                            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                        };

                        if (c === 1 || c === 6 || c === totalCols) {
                            cell.alignment = { horizontal: 'center', vertical: 'middle' };
                            cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF334155' } };
                        } else if (c >= 7 && c <= 6 + totalDays) {
                            cell.alignment = { horizontal: 'center', vertical: 'middle' };
                            
                            // Aplicar rellenos por nomenclatura
                            const dateIdx = c - 7;
                            const date = listDates[dateIdx];
                            const dateStr = this.formatDate(date);
                            const isWeekend = (date.getDay() === 0 || date.getDay() === 6);
                            const isFeriado = feriados.includes(dateStr);
                            const hasVal = (cell.value !== null && cell.value !== undefined && cell.value !== '');

                            if (hasVal && group.tipo === 'Vacaciones') {
                                cell.fill = vacacionesFill;
                            } else if (hasVal && group.tipo === 'Permiso') {
                                cell.fill = permisoFill;
                            } else if (hasVal && group.isRecurrente) {
                                cell.fill = recurrenteFill;
                            } else if (isFeriado) {
                                cell.fill = feriadoFill;
                            } else if (isWeekend) {
                                cell.fill = weekendFill;
                            }
                        } else {
                            cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
                        }
                    }

                    currentRow++;
                });

                // Fila de Totales
                const totalRow = currentRow;
                worksheet.getCell(totalRow, 1).value = 'TOTAL';
                worksheet.getCell(totalRow, 6).value = { formula: `SUM(F9:F${totalRow - 1})` } as any;
                worksheet.getCell(totalRow, totalCols).value = { formula: `SUM(${worksheet.getCell(totalRow, totalCols).address.replace(/[0-9]/g, '')}9:${worksheet.getCell(totalRow, totalCols).address.replace(/[0-9]/g, '')}${totalRow - 1})` } as any;

                listDates.forEach((date, dateIdx) => {
                    const colNum = 7 + dateIdx;
                    const colLetter = worksheet.getCell(totalRow, colNum).address.replace(/[0-9]/g, '');
                    worksheet.getCell(totalRow, colNum).value = { formula: `SUM(${colLetter}9:${colLetter}${totalRow - 1})` } as any;
                });

                // Estilo de la fila de totales
                for (let c = 1; c <= totalCols; c++) {
                    const cell = worksheet.getCell(totalRow, c);
                    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF163572' } };
                    cell.alignment = { horizontal: c === 1 ? 'left' : 'center', vertical: 'middle' };
                    cell.border = {
                        top: { style: 'medium', color: { argb: 'FF163572' } },
                        bottom: { style: 'double', color: { argb: 'FF163572' } }
                    };

                    const dateIdx = c - 7;
                    if (dateIdx >= 0 && dateIdx < totalDays) {
                        const date = listDates[dateIdx];
                        const dateStr = this.formatDate(date);
                        const isWeekend = (date.getDay() === 0 || date.getDay() === 6);
                        const isFeriado = feriados.includes(dateStr);

                        if (isFeriado) {
                            cell.fill = feriadoFill;
                        } else if (isWeekend) {
                            cell.fill = weekendFill;
                        } else {
                            cell.fill = whiteFill;
                        }
                    } else {
                        cell.fill = whiteFill;
                    }
                }

                // Firmas
                const sigRow1 = totalRow + 5;
                const sigRow2 = totalRow + 6;

                worksheet.getCell(sigRow1, 2).value = `Elaborado por: ${col.nombre}`;
                worksheet.getCell(sigRow1, 2).font = { name: 'Arial', size: 10, italic: true };
                worksheet.getCell(sigRow2, 2).value = `ISC INTEGRITY SOLUTIONS & CONSULTING CIA. LTDA.`;
                worksheet.getCell(sigRow2, 2).font = { name: 'Arial', size: 10, bold: true };

                const distinctLeaders = Array.from(new Set(clientActividades.map(act => act.liderProyecto).filter(Boolean)));
                const leaderName = distinctLeaders.length > 0 ? distinctLeaders.join(', ') : 'Sin Líder';
                worksheet.getCell(sigRow1, 8).value = `Revisado y Aprobado por: ${leaderName}`;
                worksheet.getCell(sigRow1, 8).font = { name: 'Arial', size: 10, italic: true };
                worksheet.getCell(sigRow2, 8).value = `Empresa: ${clientName}`;
                worksheet.getCell(sigRow2, 8).font = { name: 'Arial', size: 10, bold: true };

                // Nomenclatura (Leyenda)
                const nomTitleRow = totalRow + 9;
                const nomVacRow = totalRow + 10;
                const nomFerRow = totalRow + 11;
                const nomPermRow = totalRow + 12;
                const nomWkRow = totalRow + 13;
                const nomRecRow = totalRow + 14;

                worksheet.getCell(nomTitleRow, 2).value = 'Nomenclatura';
                worksheet.getCell(nomTitleRow, 2).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF163572' } };

                const legendCells = [
                    { row: nomVacRow, label: 'Vacaciones', fill: vacacionesFill },
                    { row: nomFerRow, label: 'Feriado', fill: feriadoFill },
                    { row: nomPermRow, label: 'Permiso', fill: permisoFill },
                    { row: nomWkRow, label: 'Fines de Semana', fill: weekendFill },
                    { row: nomRecRow, label: 'Actividad Recurrente', fill: recurrenteFill }
                ];

                legendCells.forEach(item => {
                    const cLabel = worksheet.getCell(item.row, 3);
                    cLabel.value = item.label;
                    cLabel.fill = item.fill;
                    cLabel.font = { name: 'Arial', size: 9 };
                    cLabel.alignment = { horizontal: 'center', vertical: 'middle' };
                    cLabel.border = {
                        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                    };
                });

                // Llamar a la estandarización de cabeceras corporativas
                const currentMonthName = startDate.toLocaleString('es-EC', { month: 'long' }).toUpperCase();
                await estandarizarCabeceraExcelExistente(
                    workbook,
                    worksheet,
                    `TIME REPORT - ${clientName.toUpperCase()}`,
                    totalCols,
                    `${currentMonthName} ${startDate.getFullYear()}`,
                    8,
                    false
                );
            }

            // Guardar archivo y disparar descarga
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Reporte_${col.nombre.replace(/\s+/g, '_')}.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error(`Error descargando el detalle de ${col.nombre}:`, error);
            if (propagarError) throw error;
        }
    }

    private formatDate(date: Date): string {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    public cambiarPeriodo(nuevoPeriodo: 'quincena' | 'mes-completo') {
        this.periodo = nuevoPeriodo;
        this.ajustarFechasPorPeriodo();
        this.aplicarFiltros();
    }

    private ajustarFechasPorPeriodo() {
        // Usar la fechaDesde actual si existe para preservar el mes/año consultado, sino usar la fecha actual del sistema
        const fechaBase = this.fechaDesde ? new Date(this.fechaDesde + 'T00:00:00') : new Date();
        const anio = fechaBase.getFullYear();
        const mes = fechaBase.getMonth();

        if (this.periodo === 'quincena') {
            const dia = fechaBase.getDate();
            if (dia <= 15) {
                // Primera Quincena: del 1 al 15
                this.fechaDesde = this.formatDate(new Date(anio, mes, 1));
                this.fechaHasta = this.formatDate(new Date(anio, mes, 15));
            } else {
                // Segunda Quincena: del 16 al último día del mes
                this.fechaDesde = this.formatDate(new Date(anio, mes, 16));
                const ultimoDia = new Date(anio, mes + 1, 0);
                this.fechaHasta = this.formatDate(ultimoDia);
            }
        } else {
            // Mes Completo: del 1 al último día del mes
            this.fechaDesde = this.formatDate(new Date(anio, mes, 1));
            const ultimoDia = new Date(anio, mes + 1, 0);
            this.fechaHasta = this.formatDate(ultimoDia);
        }
    }

    public onFechaManualChange() {
        if (this.fechaDesde && this.fechaHasta) {
            let desde = new Date(this.fechaDesde + 'T00:00:00');
            let hasta = new Date(this.fechaHasta + 'T00:00:00');

            if (hasta < desde) {
                this.fechaHasta = this.fechaDesde;
                hasta = new Date(this.fechaHasta + 'T00:00:00');
            }

            const anioDesde = desde.getFullYear();
            const mesDesde = desde.getMonth();

            const primerDiaMes = this.formatDate(new Date(anioDesde, mesDesde, 1));
            const dia15Mes = this.formatDate(new Date(anioDesde, mesDesde, 15));
            const dia16Mes = this.formatDate(new Date(anioDesde, mesDesde, 16));
            const ultimoDiaMes = this.formatDate(new Date(anioDesde, mesDesde + 1, 0));

            if (this.fechaDesde === primerDiaMes && this.fechaHasta === ultimoDiaMes) {
                this.periodo = 'mes-completo';
            } else if (
                (this.fechaDesde === primerDiaMes && this.fechaHasta === dia15Mes) ||
                (this.fechaDesde === dia16Mes && this.fechaHasta === ultimoDiaMes)
            ) {
                this.periodo = 'quincena';
            } else {
                this.periodo = '' as any;
            }
        }
        this.aplicarFiltros();
    }
}

//comentario de prueba
