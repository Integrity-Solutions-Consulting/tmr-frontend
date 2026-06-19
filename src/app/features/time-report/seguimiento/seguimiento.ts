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
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { estandarizarCabeceraExcelExistente, exportarReporteExcel, exportarReportePdf } from '../../../shared/utils/reporte-export.utils';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

import { SeguimientoService } from '../../../shared/services/seguimiento.service';
import { Colaborador } from '../../../shared/models/colaborador.model';
import { HorasFormatPipe } from '../../../shared/pipes/horas-format.pipe';
import { PaginacionComponent } from '../../../shared/components/paginacion/paginacion.component';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import * as ExcelJS from 'exceljs';
import { lastValueFrom } from 'rxjs';

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

    public columnas: string[] = [
        'select', 'nombre', 'proyecto', 'cliente', 'liderTecnico',
        'nroHoras', 'estado', 'diasConReporte', 'diasACompletar', 'acciones'
    ];
    public dataSource = new MatTableDataSource<Colaborador>(this.seguimientoService.colaboradores());
    public selection = new SelectionModel<Colaborador>(true, []);

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
    public fechaHasta = (() => {
        const d = new Date();
        const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        return `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
    })();
    public periodo: 'quincena' | 'mes-completo' = 'mes-completo';

    // Paginación (Estado Local para Rango)
    public pageIndex = 0;
    public pageSize = 5;

    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    // Reactividad vía Signals desde el Servicio de Negocio
    public metricas = computed(() => this.seguimientoService.getMetricas());

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

    public async descargarSeleccionados() {
        if (!this.selection.hasValue()) return;
        const seleccionados = [...this.selection.selected];
        for (const col of seleccionados) {
            await this.descargarSeguimientoColaborador(col);
        }
        this.selection.clear();
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

    public async descargarDetalle(col: Colaborador) {
        try {
            const urlDetalle = `${environment.apiUrl}/time-report/seguimiento/colaborador/${col.id}/actividades`;
            const actividades = await lastValueFrom(
                this.http.get<any[]>(urlDetalle, {
                    params: { fechaDesde: this.fechaDesde, fechaHasta: this.fechaHasta }
                })
            );

            if (!actividades || actividades.length === 0) {
                console.warn(`No hay actividades registradas para ${col.nombre} en este rango.`);
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

            worksheet.mergeCells('A1:H1');
            const titleCell = worksheet.getCell('A1');
            titleCell.value = `Detalle de Actividades - Colaborador: ${col.nombre}`;
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
                'Fecha', 'Proyecto', 'Tipo Actividad', 'Req / Ticket', 'Horas', 'Descripción', 'Notas', 'Es Billable'
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
            actividades.forEach(act => {
                const row = worksheet.addRow([
                    act.fecha,
                    act.proyecto,
                    act.tipoActividad,
                    act.codigoRequerimiento,
                    Number(act.horas),
                    act.descripcion,
                    act.notas,
                    act.esBillable
                ]);
                row.height = 20;
                totalHoras += Number(act.horas);

                row.getCell(1).alignment = { horizontal: 'center' };
                row.getCell(4).alignment = { horizontal: 'center' };
                row.getCell(5).alignment = { horizontal: 'right' };
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

            const totalRow = worksheet.addRow([
                'TOTAL HORAS', '', '', '', totalHoras, '', '', ''
            ]);
            worksheet.mergeCells(`A${totalRow.number}:D${totalRow.number}`);
            totalRow.height = 22;
            totalRow.getCell(1).font = { bold: true };
            totalRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
            totalRow.getCell(5).font = { bold: true };
            totalRow.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };

            totalRow.eachCell((cell, colNum) => {
                if (colNum <= 5) {
                    cell.border = {
                        top: { style: 'medium' },
                        bottom: { style: 'double' }
                    };
                }
            });

            worksheet.columns.forEach((column, i) => {
                if (i === 0) column.width = 12;
                else if (i === 1) column.width = 25;
                else if (i === 2) column.width = 20;
                else if (i === 3) column.width = 15;
                else if (i === 4) column.width = 10;
                else if (i === 5) column.width = 35;
                else if (i === 6) column.width = 25;
                else if (i === 7) column.width = 12;
            });

            await estandarizarCabeceraExcelExistente(
                workbook,
                worksheet,
                `Detalle de Actividades - ${col.nombre}`,
                8,
                `Periodo: del ${this.fechaDesde} al ${this.fechaHasta}`,
            );
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
