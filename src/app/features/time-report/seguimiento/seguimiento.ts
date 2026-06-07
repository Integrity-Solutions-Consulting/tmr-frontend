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
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

import { SeguimientoService } from '../../../shared/services/seguimiento.service';
import { Colaborador } from '../../../shared/models/colaborador.model';
import { HorasFormatPipe } from '../../../shared/pipes/horas-format.pipe';
import { PaginacionComponent } from '../../../shared/components/paginacion/paginacion.component';
import { BadgeEstadoComponent } from '../../../shared/components/badge-estado/badge-estado.component';
import * as XLSX from 'xlsx';

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
        HorasFormatPipe,
        PaginacionComponent,
        BadgeEstadoComponent
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
    public clientes = signal<{id: number, nombre: string}[]>([]);
    public fechaDesde = '2026-04-01';
    public fechaHasta = '2026-04-30';
    public periodo: 'quincena' | 'mes-completo' = 'mes-completo';

    // Paginación (Estado Local para Rango)
    public pageIndex = 0;
    public pageSize = 5;

    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    // Reactividad vía Signals desde el Servicio de Negocio
    public metricas = computed(() => this.seguimientoService.getMetricas());

    constructor() {
        effect(() => {
            this.dataSource.data = this.seguimientoService.colaboradores();
        });
    }

    ngAfterViewInit() {
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.dataSource.filterPredicate = (data: Colaborador, filter: string) => {
            const f = filter.toLowerCase();
            return data.nombre.toLowerCase().includes(f)
                || data.proyecto.toLowerCase().includes(f)
                || data.cliente.toLowerCase().includes(f);
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

    public aprobarSeleccionados() {
        const ids = this.selection.selected.map(s => s.id);
        this.seguimientoService.aprobarColaboradores(ids);
        this.selection.clear();
        this.dataSource.data = this.seguimientoService.colaboradores();
    }

    public exportarExcel() {
        const rows = this.dataSource.filteredData.map(c => ({
            Colaborador: c.nombre,
            Proyecto: c.proyecto,
            Cliente: c.cliente,
            Líder: c.liderTecnico,
            Horas: c.nroHoras,
            Estado: c.estado,
            'Días Reporte': c.diasConReporte,
            'Días Completar': c.diasACompletar
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Seguimiento');
        XLSX.writeFile(wb, 'Seguimiento.xlsx');
    }

    public exportarCSV() {
        const rows = this.dataSource.filteredData;
        const headers = ['Colaborador', 'Proyecto', 'Cliente', 'Líder', 'Horas', 'Estado'];
        const csv = [
            headers.join(','),
            ...rows.map(c => `"${c.nombre}","${c.proyecto}","${c.cliente}","${c.liderTecnico}",${c.nroHoras},"${c.estado}"`)
        ].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'seguimiento.csv';
        a.click();
        URL.revokeObjectURL(url);
    }

    public descargarDetalle(col: Colaborador) {
        const data = [{ Colaborador: col.nombre, Horas: col.nroHoras, Estado: col.estado }];
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Detalle');
        XLSX.writeFile(wb, `Detalle_${col.nombre.split(' ')[0]}.xlsx`);
    }
}
