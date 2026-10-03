import { Component, inject, ViewChild, AfterViewInit, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { SelectionModel } from '@angular/cdk/collections';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ReporteTabularConfig, estandarizarCabeceraExcelExistente, exportarReporteExcel, exportarReportePdf } from '../../../shared/utils/reporte-export.utils';
import { HttpClient } from '@angular/common/http';
import { DatosSeguimientoPdf, crearReporteSeguimientoPdf } from '../../../shared/utils/seguimiento-pdf.utils';
import { environment } from '../../../../environments/environment';

import { SeguimientoService } from '../../../shared/services/seguimiento.service';
import { Colaborador, ProyectoResumen } from '../../../shared/models/colaborador.model';
import { HorasFormatPipe } from '../../../shared/pipes/horas-format.pipe';
import { PaginacionComponent } from '../../../shared/components/paginacion/paginacion.component';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { MetricasHorasComponent } from '../../../shared/components/metricas-horas/metricas-horas.component';
import * as ExcelJS from 'exceljs';
import JSZip from 'jszip';
// sm - Operadores para cancelar la descarga desde el toast (takeUntil).
import { Observable, Subject, lastValueFrom, takeUntil } from 'rxjs';
import { MetricasSeguimiento } from '../../../shared/models/seguimiento.model';
// sm - Modal de "Ver calendario" (solo lectura) para inspeccionar el calendario de un colaborador desde Seguimiento.
import { CalendarioColaboradorModal } from './calendario-colaborador-modal/calendario-colaborador-modal';
// sm - SweetAlert2 para los pop ups de las descargas (sin actividades, descarga parcial y error).
import { PopupService } from '../../../shared/services/popup.service';

// sm - Error propio para distinguir "colaborador sin actividades" de un fallo real de red o de generación.
class SinActividadesError extends Error {
    constructor(public readonly colaborador: string) {
        super(`No hay actividades registradas para ${colaborador} en este rango.`);
    }
}

// sm - Rango de fechas (yyyy-MM-dd) fijado al iniciar una descarga.
interface RangoDescarga {
    desde: string;
    hasta: string;
}

// sm - Un archivo a generar: un colaborador y, si tiene proyectos, el proyecto al que se limita ese archivo
// (una persona con 2 proyectos genera 2 items, uno por proyecto). Sin proyectos, un solo item sin filtrar.
interface ItemDescarga {
    colaborador: Colaborador;
    proyecto?: ProyectoResumen;
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
        MatTableModule,
        MatPaginatorModule,
        MatInputModule,
        MatFormFieldModule,
        MatButtonModule,
        MatIconModule,
        MatCheckboxModule,
        MatMenuModule,
        MatAutocompleteModule,
        MatDialogModule,
        PaginacionComponent,
        HeaderComponent,
        HorasFormatPipe,
        MetricasHorasComponent
    ],
    templateUrl: './seguimiento.html',
    styleUrl: './seguimiento.scss'
})
export class SeguimientoComponent implements AfterViewInit {
    private seguimientoService = inject(SeguimientoService);
    private http = inject(HttpClient);
    private dialog = inject(MatDialog);
    private popup = inject(PopupService);

    public columnas: string[] = [
        'select', 'nombre', 'proyecto', 'cliente', 'liderTecnico',
        'nroHoras', 'estado', 'diasConReporte', 'diasACompletar', 'acciones'
    ];
    public dataSource = new MatTableDataSource<Colaborador>(this.seguimientoService.colaboradores());
    public selection = new SelectionModel<Colaborador>(true, []);
    public isDownloading = false;
    // sm - Estado del toast animado de descarga (reemplaza al mensaje "Preparando..." en la descarga de seleccionados).
    public progresoDescarga = {
        visible: false,
        cerrando: false,
        titulo: '',
        detalle: '',
        progreso: 0,
        indeterminado: true,
    };
    // sm - Emite cuando el usuario pulsa "Cancelar" en el toast para cortar la petición HTTP en curso.
    private cancelarDescarga$ = new Subject<void>();
    private descargaCancelada = false;

    // Filtros de búsqueda (Estado Local)
    public busqueda = '';
    // sm - clienteSeleccionado es el texto del campo; clienteAplicado es el cliente con el que se filtró la tabla.
    public clienteSeleccionado = '';
    private clienteAplicado = '';
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

    // Paginación (Estado Local para Rango)
    public pageIndex = 0;
    public pageSize = 5;

    @ViewChild(MatPaginator) paginator!: MatPaginator;

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
        this.irAPrimeraPagina();
    }

    public direccionOrden(campo: keyof Colaborador): 'ascending' | 'descending' | 'none' {
        if (this.sortField !== campo) return 'none';
        return this.sortAsc ? 'ascending' : 'descending';
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
                liderTecnico: this.toTitleCase(c.liderTecnico),
                // sm - El desglose por proyecto (chips del modal "Ver detalle") debe verse igual de prolijo
                // que las columnas de la tabla; sin esto quedaba con el casing crudo que manda el backend.
                proyectos: c.proyectos?.map(p => ({
                    ...p,
                    nombre: this.toTitleCase(p.nombre),
                    cliente: this.toTitleCase(p.cliente),
                    liderTecnico: this.toTitleCase(p.liderTecnico)
                }))
            }));
            this.dataSource.data = formatted;
            this.aplicarOrdenamiento();
            // sm - Cada recarga reconstruye los colaboradores como objetos nuevos, así que cualquier
            // selección previa queda con referencias huérfanas (el checkbox del header se veía
            // "indeterminado" y el footer de métricas podía mostrar la selección vieja). Se limpia
            // para que la selección siempre corresponda a la data recién cargada/filtrada.
            this.selection.clear();
        });
    }

    ngAfterViewInit() {
        this.dataSource.paginator = this.paginator;
        // sm - La búsqueda es solo por colaborador (nombre completo) y proyecto. Se normaliza el texto (sin tildes,
        // minúsculas y espacios simples) para que "juan  perez" encuentre a "Juan Pérez".
        this.dataSource.filterPredicate = (data: Colaborador, filter: string) =>
            this.normalizarBusqueda(data.nombre).includes(filter)
            || this.normalizarBusqueda(data.proyecto).includes(filter);

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
        this.recargarColaboradores();
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
        // sm - Solo filteredData: antes, si la búsqueda no encontraba nada, mostraba el total sin filtrar.
        return this.dataSource.filteredData.length;
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

    // sm - Filtros que dependen del servidor (fechas y cliente): recargan los datos desde el backend.
    public aplicarFiltros() {
        this.irAPrimeraPagina();
        this.recargarColaboradores();
    }

    // sm - Búsqueda por colaborador/proyecto: se aplica sobre los datos ya cargados, sin llamar al servidor en cada tecla.
    // Se limpia la selección para que siempre corresponda a los resultados visibles (igual que al recargar).
    public aplicarBusqueda() {
        this.dataSource.filter = this.normalizarBusqueda(this.busqueda);
        this.selection.clear();
        this.irAPrimeraPagina();
    }

    // sm - Cliente: mientras se escribe solo se filtran las opciones del autocompletado; la tabla se recarga
    // al elegir una opción o al borrar el campo (todos los clientes), no con cada letra.
    public onClienteInput(event: Event) {
        this.filtrarClientes(event);
        if (!this.clienteSeleccionado.trim() && this.clienteAplicado) {
            this.seleccionarCliente('');
        }
    }

    public seleccionarCliente(cliente: string) {
        this.clienteSeleccionado = cliente;
        this.clienteAplicado = cliente;
        this.aplicarFiltros();
    }

    // sm - Al cerrar el autocompletado sin elegir una opción, el campo vuelve a mostrar el cliente realmente aplicado.
    public onClientePanelCerrado() {
        this.clienteSeleccionado = this.clienteAplicado;
        this.clienteFilter.set('');
    }

    private recargarColaboradores() {
        this.seguimientoService.cargarColaboradores({
            fechaDesde: this.fechaDesde,
            fechaHasta: this.fechaHasta,
            clienteSeleccionado: this.clienteAplicado
        });
    }

    private irAPrimeraPagina() {
        this.pageIndex = 0;
        this.dataSource.paginator?.firstPage();
    }

    private normalizarBusqueda(texto: string): string {
        return (texto ?? '')
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();
    }

    // sm - "Seleccionar todos" debe cubrir todas las páginas del resultado ya filtrado
    // (rango de fechas/cliente del backend + búsqueda de texto del cliente), no solo dataSource.data
    // (que ignora la búsqueda de texto) ni la página visible.
    public isAllSelected() {
        const filtrados = this.dataSource.filteredData;
        return filtrados.length > 0 && this.selection.selected.length === filtrados.length;
    }

    public masterToggle() {
        this.isAllSelected()
            ? this.selection.clear()
            : this.dataSource.filteredData.forEach(row => this.selection.select(row));
    }

    // sm - Expande los colaboradores seleccionados a un item por archivo a generar: si un colaborador tiene varios
    // proyectos, se genera un archivo por proyecto (en vez de uno solo mezclando todo).
    private itemsParaDescarga(colaboradores: Colaborador[]): ItemDescarga[] {
        const items: ItemDescarga[] = [];
        for (const colaborador of colaboradores) {
            const proyectos = colaborador.proyectos && colaborador.proyectos.length > 0 ? colaborador.proyectos : [undefined];
            for (const proyecto of proyectos) items.push({ colaborador, proyecto });
        }
        return items;
    }

    public async descargarSeleccionados(formato: 'xlsx' | 'pdf') {
        if (!this.selection.hasValue() || this.isDownloading) return;

        const seleccionados = [...this.selection.selected];
        // sm - Un colaborador con varios proyectos genera un archivo por proyecto, así que el total de archivos
        // puede ser mayor que la cantidad de filas seleccionadas.
        const items = this.itemsParaDescarga(seleccionados);
        // sm - El rango se fija al iniciar: si el usuario cambia las fechas durante la descarga,
        // todos los reportes (y los pop ups) siguen usando el mismo rango.
        const rango: RangoDescarga = { desde: this.fechaDesde, hasta: this.fechaHasta };
        this.isDownloading = true;
        // sm - En lugar del mensaje "Preparando...", se muestra el toast animado con barra de progreso.
        this.iniciarProgresoDescarga(formato, items.length);

        try {
            if (items.length === 1) {
                if (formato === 'xlsx') {
                    await this.descargarDetalle(items[0].colaborador, rango, false, items[0].proyecto);
                } else {
                    await this.descargarPdfDetalle(items[0].colaborador, rango, items[0].proyecto);
                }
                await this.finalizarProgresoDescarga();
                return;
            }

            if (seleccionados.length === 1) {
                // sm - Un solo colaborador con varios proyectos: se descargan sus archivos directo, sin ZIP
                // (un ZIP con un solo colaborador adentro no aporta nada, y evita que al seleccionar varios
                // colaboradores se termine armando un ZIP con otros ZIPs adentro; ese caso sí usa un único
                // ZIP plano con todos los archivos, ver descargarReportesZip).
                const incluidos = await this.descargarReportesDirecto(items, formato, rango);
                const sinActividades = items.length - incluidos;
                if (incluidos === 0) {
                    this.cerrarProgresoDescarga();
                    this.mostrarPopup('event_busy', 'Sin actividades',
                        `<strong>${this.escaparHtml(seleccionados[0].nombre)}</strong> no tiene actividades registradas en ninguno de sus `
                        + `<strong>${items.length}</strong> proyectos entre ${this.rangoPopup(rango)}. No se generó ningún archivo.`);
                    return;
                }
                await this.finalizarProgresoDescarga();
                if (sinActividades > 0) {
                    const uno = sinActividades === 1;
                    this.mostrarPopup('rule', 'Descarga parcial',
                        `Se descargaron <strong>${incluidos} de ${items.length}</strong> reportes de `
                        + `<strong>${this.escaparHtml(seleccionados[0].nombre)}</strong>. <strong>${sinActividades}</strong> `
                        + `${uno ? 'proyecto no tiene' : 'proyectos no tienen'} actividades entre ${this.rangoPopup(rango)}.`);
                }
                return;
            }

            // sm - Varios colaboradores seleccionados: un único ZIP plano con todos los reportes (cada colaborador
            // aporta un archivo por proyecto), sin anidar un ZIP dentro de otro.
            const incluidos = await this.descargarReportesZip(items, formato, rango);
            const sinActividades = items.length - incluidos;
            if (incluidos === 0) {
                // sm - Todos los seleccionados están vacíos: no se descarga ningún ZIP.
                this.cerrarProgresoDescarga();
                this.mostrarPopup('event_busy', 'Sin actividades',
                    `Ninguno de los <strong>${items.length}</strong> reportes seleccionados tiene actividades registradas entre `
                    + `${this.rangoPopup(rango)}. No se generó ningún archivo.`);
                return;
            }
            // sm - Se completa la barra al 100% antes de cerrar el toast.
            await this.finalizarProgresoDescarga();
            if (sinActividades > 0) {
                // sm - Mezcla de vacíos y llenos: se informa solo el conteo de lo descargado y lo omitido.
                const uno = sinActividades === 1;
                this.mostrarPopup('rule', 'Descarga parcial',
                    `Se descargaron <strong>${incluidos} de ${items.length}</strong> reportes. `
                    + `<strong>${sinActividades}</strong> ${uno ? 'reporte no tiene' : 'reportes no tienen'} `
                    + `actividades entre ${this.rangoPopup(rango)} y no se ${uno ? 'incluyó' : 'incluyeron'} en el ZIP.`);
            }
        } catch (error) {
            // sm - Cualquier fin anticipado (sin actividades, cancelación o error) cierra el toast de progreso.
            this.cerrarProgresoDescarga();
            // sm - Si el único colaborador seleccionado no tiene actividades, se muestra el pop up en lugar del error genérico.
            if (error instanceof SinActividadesError) {
                this.mostrarPopup('event_busy', 'Sin actividades',
                    `<strong>${this.escaparHtml(error.colaborador)}</strong> no tiene actividades registradas entre ${this.rangoPopup(rango)}.`);
                return;
            }
            // sm - Si el usuario pulsó "Cancelar" en el toast, no se muestra nada más.
            if (error instanceof DescargaCanceladaError) {
                return;
            }
            console.error('Error al descargar los reportes de seguimiento:', error);
            this.mostrarPopup('error', 'No se pudo descargar', 'No se pudieron preparar los reportes. Intenta nuevamente.');
        } finally {
            this.isDownloading = false;
        }
    }

    // sm - Muestra el toast de descarga. La descarga múltiple avanza por archivo/reporte (progreso real);
    // el Excel individual no reporta avance, así que usa barra indeterminada.
    private iniciarProgresoDescarga(formato: 'xlsx' | 'pdf', cantidad: number): void {
        this.descargaCancelada = false;
        this.progresoDescarga = {
            visible: true,
            cerrando: false,
            titulo: `Descargando ${formato === 'pdf' ? 'PDF' : 'Excel'}${cantidad > 1 ? ` (${cantidad} reportes)` : ''}`,
            detalle: cantidad > 1 ? `0 de ${cantidad} reportes generados` : 'Generando reporte...',
            progreso: 0,
            indeterminado: cantidad === 1 && formato === 'xlsx',
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
    private async finalizarProgresoDescarga(): Promise<void> {
        this.actualizarProgresoDescarga(100, 'Descarga completada');
        await new Promise(resolve => setTimeout(resolve, 600));
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

    // sm - Descarga cada reporte directo al navegador (sin ZIP): se usa cuando se selecciona un solo colaborador
    // con varios proyectos, para no armar un ZIP con un único colaborador adentro. Devuelve cuántos se descargaron;
    // los que no tengan actividades en el rango se omiten.
    private async descargarReportesDirecto(items: ItemDescarga[], formato: 'xlsx' | 'pdf', rango: RangoDescarga): Promise<number> {
        let incluidos = 0;
        for (const [indice, item] of items.entries()) {
            if (this.descargaCancelada) throw new DescargaCanceladaError();
            const nombreBase = this.nombreArchivo(item.colaborador.nombre, item.proyecto?.nombre);
            if (formato === 'pdf') {
                const contenido = await this.generarPdfColaborador(item.colaborador, rango, item.proyecto);
                if (contenido) {
                    this.guardarArchivo(new Blob([contenido], { type: 'application/pdf' }), `${nombreBase}.pdf`);
                    incluidos++;
                }
            } else {
                const contenido = await this.descargarDetalle(item.colaborador, rango, true, item.proyecto);
                if (contenido) {
                    this.guardarArchivo(
                        new Blob([contenido], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
                        `${nombreBase}.xlsx`,
                    );
                    incluidos++;
                }
            }
            this.actualizarProgresoDescarga(((indice + 1) / items.length) * 100, `${indice + 1} de ${items.length} reportes generados`);
        }
        return incluidos;
    }

    // sm - Arma un único ZIP (PDF o Excel) solo con los reportes que tienen actividades en el rango. Un colaborador
    // con varios proyectos aporta un item por proyecto (ver itemsParaDescarga), cada uno con su propio archivo.
    // Devuelve cuántos reportes se incluyeron; si es 0 no se descarga nada.
    private async descargarReportesZip(items: ItemDescarga[], formato: 'xlsx' | 'pdf', rango: RangoDescarga): Promise<number> {
        const zip = new JSZip();
        const nombresUsados = new Set<string>();
        let incluidos = 0;
        for (const [indice, item] of items.entries()) {
            if (this.descargaCancelada) throw new DescargaCanceladaError();
            const contenido = formato === 'pdf'
                ? await this.generarPdfColaborador(item.colaborador, rango, item.proyecto)
                : await this.descargarDetalle(item.colaborador, rango, true, item.proyecto);
            if (contenido) {
                // sm - Nombres repetidos (homónimos, o el mismo proyecto por alguna razón) no se sobrescriben: se les agrega un sufijo.
                const base = this.nombreArchivo(item.colaborador.nombre, item.proyecto?.nombre);
                let nombre = base;
                for (let sufijo = 2; nombresUsados.has(nombre.toLowerCase()); sufijo++) nombre = `${base}_${sufijo}`;
                nombresUsados.add(nombre.toLowerCase());
                zip.file(`${nombre}.${formato}`, contenido);
                incluidos++;
            }
            // sm - El 90% de la barra se reparte entre reportes y el 10% restante queda para comprimir el ZIP.
            this.actualizarProgresoDescarga(
                ((indice + 1) / items.length) * 90,
                `${indice + 1} de ${items.length} reportes generados`,
            );
        }
        if (incluidos === 0) return 0;

        const contenidoZip = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }, metadata => {
            this.actualizarProgresoDescarga(90 + metadata.percent * 0.1, 'Comprimiendo archivos...');
        });
        if (this.descargaCancelada) throw new DescargaCanceladaError();
        this.guardarArchivo(contenidoZip, `Seguimiento_${formato === 'pdf' ? 'PDF' : 'Excel'}_${rango.desde}_a_${rango.hasta}.zip`);
        return incluidos;
    }

    // sm - Dispara la descarga de un archivo generado en el navegador.
    private guardarArchivo(contenido: Blob, nombre: string): void {
        const url = URL.createObjectURL(contenido);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = nombre;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    // sm - Nombre de archivo (sin extensión) igual para Excel y PDF, individual o dentro del ZIP: "Reporte_Juan_Perez_Proyecto".
    // Se agrega el proyecto porque una misma persona puede generar varios archivos (uno por proyecto).
    private nombreArchivo(nombre: string, proyecto?: string): string {
        const limpiar = (texto: string) => texto.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim().replace(/\s+/g, '_').slice(0, 100);
        const nombreLimpio = limpiar(nombre) || 'colaborador';
        const proyectoLimpio = proyecto ? limpiar(proyecto) : '';
        return proyectoLimpio ? `Reporte_${nombreLimpio}_${proyectoLimpio}` : `Reporte_${nombreLimpio}`;
    }

    // sm - Pop up base de las descargas de Seguimiento. Usa las clases "tmr-swal" (styles/_sweetalert.scss) para verse
    // igual que los modales de la app: tarjeta blanca, icono en círculo azul, título oscuro, texto gris y botón primario
    // #163572 (con soporte de tema oscuro).
    private mostrarPopup(icono: string, titulo: string, html: string): void {
        void this.popup.show(icono, titulo, html, icono === 'download_done');
    }

    private rangoPopup(rango: RangoDescarga): string {
        return `<strong>${this.formatearFechaPopup(rango.desde)}</strong> y <strong>${this.formatearFechaPopup(rango.hasta)}</strong>`;
    }

    private escaparHtml(texto: string): string {
        return String(texto ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    private formatearFechaPopup(fecha: string): string {
        const [anio, mes, dia] = (fecha ?? '').split('-');
        return anio && mes && dia ? `${dia}/${mes}/${anio}` : fecha;
    }

    // sm - Botón "Reporte": exporta la tabla (resultados filtrados) con el formato estándar de reportes de la app.
    // Se eliminó la versión anterior (ExcelJS/jsPDF manual) que quedaba después de un "return" y nunca se ejecutaba.
    public async exportarExcel() {
        await exportarReporteExcel(this.configuracionReporteTabla());
    }

    public exportarPDF() {
        void exportarReportePdf(this.configuracionReporteTabla());
    }

    // sm - Columnas y filas compartidas por el Excel y el PDF del reporte de la tabla.
    private configuracionReporteTabla(): ReporteTabularConfig {
        return {
            titulo: 'Reporte de Seguimiento',
            nombreArchivo: 'Seguimiento',
            nombreHoja: 'Seguimiento',
            columnas: [
                { encabezado: 'Colaborador', anchoExcel: 30, anchoPdf: 48 },
                { encabezado: 'Proyecto', anchoExcel: 25, anchoPdf: 45 },
                { encabezado: 'Cliente', anchoExcel: 25, anchoPdf: 42 },
                { encabezado: 'Líder técnico', anchoExcel: 25, anchoPdf: 42 },
                { encabezado: 'Horas registradas', anchoExcel: 18, anchoPdf: 22, alineacion: 'center' },
                { encabezado: 'Seguimiento', anchoExcel: 18, anchoPdf: 28, alineacion: 'center' },
                { encabezado: 'Días con reporte', anchoExcel: 18, anchoPdf: 24, alineacion: 'center' },
                { encabezado: 'Días a completar', anchoExcel: 18, anchoPdf: 24, alineacion: 'center' },
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
        };
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

    // sm - Actividades y feriados de un colaborador en el rango (misma consulta para el reporte Excel y el PDF).
    // Con proyecto, filtra el reporte a solo ese proyecto (una persona con varios proyectos genera un archivo por
    // proyecto: ver itemsParaDescarga). Se puede cancelar desde el toast de descarga.
    private obtenerActividadesColaborador(col: Colaborador, rango: RangoDescarga, proyecto?: ProyectoResumen): Promise<DatosSeguimientoPdf> {
        const params: Record<string, string> = { fechaDesde: rango.desde, fechaHasta: rango.hasta };
        // sm - Ahora cada fila de Seguimiento es un colaborador+proyecto puntual (ya no una fila por colaborador
        // con todos sus proyectos mezclados), así que siempre se filtra por el proyecto de la fila para no mezclar
        // horas de otro proyecto del mismo colaborador en el reporte.
        if (proyecto) params['idProyecto'] = String(proyecto.idProyecto);
        return this.esperarCancelable(this.http.get<DatosSeguimientoPdf>(
            `${environment.apiUrl}/time-report/seguimiento/colaborador/${col.id}/actividades`,
            { params },
        ));
    }

    // sm - Genera el PDF de un colaborador (o de uno de sus proyectos); devuelve undefined si no tiene actividades en el rango.
    private async generarPdfColaborador(col: Colaborador, rango: RangoDescarga, proyecto?: ProyectoResumen): Promise<ArrayBuffer | undefined> {
        const respuesta = await this.obtenerActividadesColaborador(col, rango, proyecto);
        if (!respuesta.actividades || respuesta.actividades.length === 0) return undefined;
        const contenido = await crearReporteSeguimientoPdf(col.nombre, rango.desde, rango.hasta, respuesta);
        if (this.descargaCancelada) throw new DescargaCanceladaError();
        return contenido;
    }

    private async descargarPdfDetalle(col: Colaborador, rango: RangoDescarga, proyecto?: ProyectoResumen): Promise<void> {
        const contenido = await this.generarPdfColaborador(col, rango, proyecto);
        if (!contenido) throw new SinActividadesError(proyecto ? `${col.nombre} (${proyecto.nombre})` : col.nombre);
        this.guardarArchivo(new Blob([contenido], { type: 'application/pdf' }), `${this.nombreArchivo(col.nombre, proyecto?.nombre)}.pdf`);
    }

    // sm - Genera el Excel de un colaborador (o de uno de sus proyectos). Con devolverBuffer devuelve el contenido
    // (para el ZIP) o undefined si no tiene actividades; sin él lo descarga directamente o lanza SinActividadesError
    // para mostrar el pop up.
    private async descargarDetalle(col: Colaborador, rango: RangoDescarga, devolverBuffer = false, proyecto?: ProyectoResumen) {
        const res = await this.obtenerActividadesColaborador(col, rango, proyecto);

        const rawActividades: any[] = res.actividades || [];
        const feriados = res.feriados || [];

        if (rawActividades.length === 0) {
            if (devolverBuffer) return undefined;
            throw new SinActividadesError(proyecto ? `${col.nombre} (${proyecto.nombre})` : col.nombre);
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

        const startDate = new Date(rango.desde + 'T00:00:00');
        const endDate = new Date(rango.hasta + 'T00:00:00');
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
        // sm - Si el usuario canceló mientras se armaba el Excel, no se descarga ni se agrega al ZIP.
        if (this.descargaCancelada) throw new DescargaCanceladaError();
        if (devolverBuffer) return buffer;
        this.guardarArchivo(
            new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
            `${this.nombreArchivo(col.nombre, proyecto?.nombre)}.xlsx`,
        );
        return undefined;
    }

    private formatDate(date: Date): string {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    // sm - Se eliminaron cambiarPeriodo/ajustarFechasPorPeriodo (ya no existen los botones Quincena/Mes completo) y el
    // cálculo del "periodo" que se enviaba al backend sin usarse. Solo se asegura que "hasta" no sea menor que "desde".
    public onFechaManualChange() {
        if (this.fechaDesde && this.fechaHasta && this.fechaHasta < this.fechaDesde) {
            this.fechaHasta = this.fechaDesde;
        }
        this.aplicarFiltros();
    }
}

//comentario de prueba
