import { Component, inject, ViewChild, AfterViewInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder } from '@angular/forms';
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
import { SeguimientoService } from '../../../shared/services/seguimiento.service';
import { Colaborador } from '../../../shared/models/colaborador.model';
import { HorasFormatPipe } from '../../../shared/pipes/horas-format.pipe';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-seguimiento',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatTableModule, MatPaginatorModule, MatSortModule,
    MatInputModule, MatFormFieldModule, MatSelectModule,
    MatDatepickerModule, MatNativeDateModule,
    MatButtonModule, MatIconModule, MatCheckboxModule, MatMenuModule,
    HorasFormatPipe
  ],
  template: `
    <div class="seguimiento-page">

      <!-- ===== HEADER ===== -->
      <div class="page-header">
        <h1 class="page-title">Seguimiento</h1>
        <div class="header-right">
          <div class="horas-badge">
            <mat-icon>schedule</mat-icon>
            <span>Horas por registrar: {{ metricas().horasPendientes | horasFormat }}</span>
          </div>
          <button mat-flat-button class="btn-reporte" [matMenuTriggerFor]="reporteMenu">
            <mat-icon>upload</mat-icon>
            Reporte
            <mat-icon>expand_more</mat-icon>
          </button>
          <mat-menu #reporteMenu="matMenu">
            <button mat-menu-item (click)="exportarExcel()">
              <mat-icon>table_view</mat-icon> Exportar Excel (.xlsx)
            </button>
            <button mat-menu-item (click)="exportarCSV()">
              <mat-icon>description</mat-icon> Exportar CSV
            </button>
          </mat-menu>
        </div>
      </div>

      <!-- ===== FILTER BAR ===== -->
      <div class="filters-card">

        <!-- Search -->
        <div class="filter-group search-group">
          <input
            class="search-input"
            type="text"
            placeholder="Buscar colaborador, proyecto, cliente..."
            [(ngModel)]="busqueda"
            (input)="aplicarFiltros()"
          />
          <mat-icon class="search-icon">search</mat-icon>
        </div>

        <!-- Cliente -->
        <div class="filter-group">
          <select class="filter-select" [(ngModel)]="clienteSeleccionado" (change)="aplicarFiltros()">
            <option value="">Todos los clientes</option>
            <option value="BANCO DEL PACÍFICO">BANCO DEL PACÍFICO</option>
            <option value="BANCO BOLIVARIANO">BANCO BOLIVARIANO</option>
            <option value="INTEGRITY SOLUTIONS">INTEGRITY SOLUTIONS</option>
          </select>
          <mat-icon class="select-chevron">expand_more</mat-icon>
        </div>

        <!-- Fecha Desde -->
        <div class="filter-group date-group">
          <label class="filter-label">Fecha desde</label>
          <div class="date-input-wrap">
            <input class="date-input" type="date" [(ngModel)]="fechaDesde" (change)="aplicarFiltros()">
            <mat-icon class="date-icon">calendar_today</mat-icon>
          </div>
        </div>

        <!-- Fecha Hasta -->
        <div class="filter-group date-group">
          <label class="filter-label">Fecha hasta</label>
          <div class="date-input-wrap">
            <input class="date-input" type="date" [(ngModel)]="fechaHasta" (change)="aplicarFiltros()">
            <mat-icon class="date-icon">calendar_today</mat-icon>
          </div>
        </div>

        <!-- Período toggle -->
        <div class="filter-group periodo-group">
          <span class="periodo-label">Período:</span>
          <div class="toggle-group">
            <button
              class="toggle-btn"
              [class.active]="periodo === 'quincena'"
              (click)="periodo = 'quincena'; aplicarFiltros()">
              Quincena
            </button>
            <button
              class="toggle-btn"
              [class.active]="periodo === 'mes-completo'"
              (click)="periodo = 'mes-completo'; aplicarFiltros()">
              @if (periodo === 'mes-completo') {
                <mat-icon class="check-icon">check</mat-icon>
              }
              Mes Completo
            </button>
          </div>
        </div>

        <!-- Aprobar -->
        <button
          class="btn-aprobar"
          [class.enabled]="selection.hasValue()"
          [disabled]="!selection.hasValue()"
          (click)="aprobarSeleccionados()">
          <mat-icon>check_circle</mat-icon>
          Aprobar
        </button>
      </div>

      <!-- ===== TABLE ===== -->
      <div class="table-card">
        <table mat-table [dataSource]="dataSource" matSort class="data-table">

          <!-- Checkbox col -->
          <ng-container matColumnDef="select">
            <th mat-header-cell *matHeaderCellDef>
              <mat-checkbox
                color="primary"
                (change)="$event ? masterToggle() : null"
                [checked]="selection.hasValue() && isAllSelected()"
                [indeterminate]="selection.hasValue() && !isAllSelected()">
              </mat-checkbox>
            </th>
            <td mat-cell *matCellDef="let row">
              <mat-checkbox
                color="primary"
                (click)="$event.stopPropagation()"
                (change)="$event ? selection.toggle(row) : null"
                [checked]="selection.isSelected(row)">
              </mat-checkbox>
            </td>
          </ng-container>

          <!-- Colaborador -->
          <ng-container matColumnDef="nombre">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Colaborador</th>
            <td mat-cell *matCellDef="let el"><strong>{{ el.nombre }}</strong></td>
          </ng-container>

          <!-- Proyecto -->
          <ng-container matColumnDef="proyecto">
            <th mat-header-cell *matHeaderCellDef>Proyecto</th>
            <td mat-cell *matCellDef="let el">{{ el.proyecto }}</td>
          </ng-container>

          <!-- Cliente -->
          <ng-container matColumnDef="cliente">
            <th mat-header-cell *matHeaderCellDef>Cliente</th>
            <td mat-cell *matCellDef="let el">{{ el.cliente }}</td>
          </ng-container>

          <!-- Líder -->
          <ng-container matColumnDef="liderTecnico">
            <th mat-header-cell *matHeaderCellDef>Líder Técnico</th>
            <td mat-cell *matCellDef="let el">{{ el.liderTecnico }}</td>
          </ng-container>

          <!-- Horas -->
          <ng-container matColumnDef="nroHoras">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Nro de Horas</th>
            <td mat-cell *matCellDef="let el">{{ el.nroHoras | horasFormat }}</td>
          </ng-container>

          <!-- Estado -->
          <ng-container matColumnDef="estado">
            <th mat-header-cell *matHeaderCellDef>Estado</th>
            <td mat-cell *matCellDef="let el">
              <span class="badge"
                [class.badge-progress]="el.estado === 'En progreso'"
                [class.badge-complete]="el.estado === 'Completo'"
                [class.badge-pending]="el.estado === 'Pendiente'">
                <span class="dot"></span>
                {{ el.estado }}
              </span>
            </td>
          </ng-container>

          <!-- Días con reporte -->
          <ng-container matColumnDef="diasConReporte">
            <th mat-header-cell *matHeaderCellDef>Días con Reporte</th>
            <td mat-cell *matCellDef="let el" class="center">{{ el.diasConReporte }}</td>
          </ng-container>

          <!-- Días a completar -->
          <ng-container matColumnDef="diasACompletar">
            <th mat-header-cell *matHeaderCellDef>Días a Completar</th>
            <td mat-cell *matCellDef="let el" class="center">{{ el.diasACompletar }}</td>
          </ng-container>

          <!-- Acciones -->
          <ng-container matColumnDef="acciones">
            <th mat-header-cell *matHeaderCellDef>Acciones</th>
            <td mat-cell *matCellDef="let el">
              <button mat-icon-button [matMenuTriggerFor]="rowMenu" (click)="$event.stopPropagation()">
                <mat-icon>more_vert</mat-icon>
              </button>
              <mat-menu #rowMenu="matMenu">
                <button mat-menu-item (click)="descargarDetalle(el)">
                  <mat-icon>download</mat-icon> Descargar detalle
                </button>
                <button mat-menu-item>
                  <mat-icon>visibility</mat-icon> Ver detalle
                </button>
              </mat-menu>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columnas"></tr>
          <tr mat-row *matRowDef="let row; columns: columnas;"
              (click)="selection.toggle(row)"
              [class.selected-row]="selection.isSelected(row)">
          </tr>
        </table>

        <mat-paginator [pageSizeOptions]="[5, 10, 25]" showFirstLastButtons></mat-paginator>
      </div>

      <!-- ===== FOOTER METRICS ===== -->
      <div class="metrics-footer">
        <div class="metric-item">
          <div class="metric-icon-wrap blue">
            <mat-icon>schedule</mat-icon>
          </div>
          <div class="metric-texts">
            <span class="metric-value">{{ metricas().horasPendientes | horasFormat }}</span>
            <span class="metric-name">Horas por registrar</span>
            <span class="metric-desc">Pendientes por completar</span>
          </div>
        </div>

        <div class="metric-item">
          <div class="metric-icon-wrap green">
            <mat-icon>check_circle</mat-icon>
          </div>
          <div class="metric-texts">
            <span class="metric-value">{{ metricas().horasRegistradas | horasFormat }}</span>
            <span class="metric-name">Horas registradas</span>
            <span class="metric-desc">Total del periodo</span>
          </div>
        </div>

        <div class="metric-item">
          <div class="metric-icon-wrap purple">
            <mat-icon>calendar_today</mat-icon>
          </div>
          <div class="metric-texts">
            <span class="metric-value">{{ metricas().promedioPorDia | horasFormat }}</span>
            <span class="metric-name">Promedio por día</span>
            <span class="metric-desc">Horas registradas</span>
          </div>
        </div>

        <div class="metric-item">
          <div class="metric-icon-wrap orange">
            <mat-icon>groups</mat-icon>
          </div>
          <div class="metric-texts">
            <span class="metric-value">{{ metricas().colaboradoresActivos }}</span>
            <span class="metric-name">Colaboradores activos</span>
            <span class="metric-desc">Con reporte en el periodo</span>
          </div>
        </div>

        <div class="metric-item">
          <div class="metric-icon-wrap gray">
            <mat-icon>folder</mat-icon>
          </div>
          <div class="metric-texts">
            <span class="metric-value">{{ metricas().proyectosUnicos }}</span>
            <span class="metric-name">Proyectos</span>
            <span class="metric-desc">Con actividades</span>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .seguimiento-page {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* ---- HEADER ---- */
    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .page-title {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
      color: #1A1A2E;
      font-family: 'Inter', sans-serif;
    }
    .header-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .horas-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      background: #F3F4F6;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      color: #374151;
      mat-icon { font-size: 17px; width: 17px; height: 17px; color: #6B7280; }
    }
    .btn-reporte {
      background: #163572;
      color: white;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      height: 40px;
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 0 16px;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }

    /* ---- FILTERS ---- */
    .filters-card {
      background: white;
      border-radius: 10px;
      padding: 14px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }

    .filter-group {
      display: flex;
      align-items: center;
      position: relative;
    }

    /* Search */
    .search-group {
      flex: 1;
      min-width: 220px;
      border: 1px solid #D1D5DB;
      border-radius: 6px;
      background: white;
      overflow: hidden;
      padding: 0 10px;
    }
    .search-input {
      border: none;
      outline: none;
      font-size: 13px;
      font-family: 'Inter', sans-serif;
      color: #374151;
      width: 100%;
      padding: 9px 0;
      background: transparent;
      &::placeholder { color: #9CA3AF; }
    }
    .search-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #9CA3AF;
      flex-shrink: 0;
    }

    /* Client select */
    .filter-select {
      appearance: none;
      -webkit-appearance: none;
      border: 1px solid #D1D5DB;
      border-radius: 6px;
      padding: 9px 32px 9px 12px;
      font-size: 13px;
      font-family: 'Inter', sans-serif;
      color: #374151;
      background: white;
      cursor: pointer;
      outline: none;
      min-width: 180px;
    }
    .select-chevron {
      position: absolute;
      right: 8px;
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #6B7280;
      pointer-events: none;
    }

    /* Date groups */
    .date-group {
      flex-direction: column;
      align-items: flex-start;
      gap: 2px;
    }
    .filter-label {
      font-size: 11px;
      font-weight: 600;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .date-input-wrap {
      display: flex;
      align-items: center;
      border: 1px solid #D1D5DB;
      border-radius: 6px;
      padding: 7px 10px;
      background: white;
      gap: 8px;
    }
    .date-input {
      border: none;
      outline: none;
      font-size: 13px;
      font-family: 'Inter', sans-serif;
      color: #374151;
      background: transparent;
      width: 108px;
    }
    .date-icon {
      font-size: 17px;
      width: 17px;
      height: 17px;
      color: #6B7280;
    }

    /* Period toggle */
    .periodo-group {
      gap: 8px;
    }
    .periodo-label {
      font-size: 13px;
      color: #6B7280;
      font-weight: 500;
      white-space: nowrap;
    }
    .toggle-group {
      display: flex;
      border: 1px solid #E5E7EB;
      border-radius: 20px;
      overflow: hidden;
    }
    .toggle-btn {
      padding: 7px 16px;
      border: none;
      background: white;
      font-size: 13px;
      font-family: 'Inter', sans-serif;
      font-weight: 500;
      color: #6B7280;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: all 0.15s;
      &.active {
        background: #163572;
        color: white;
      }
    }
    .check-icon { font-size: 16px; width: 16px; height: 16px; }

    /* Aprobar button */
    .btn-aprobar {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 20px;
      border-radius: 20px;
      border: none;
      background: #E5E7EB;
      color: #9CA3AF;
      font-size: 14px;
      font-weight: 600;
      font-family: 'Inter', sans-serif;
      cursor: not-allowed;
      transition: all 0.15s;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      &.enabled {
        background: #22C55E;
        color: white;
        cursor: pointer;
        &:hover { background: #16A34A; }
      }
    }

    /* ---- TABLE ---- */
    .table-card {
      background: white;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }
    .data-table { width: 100%; }

    th.mat-mdc-header-cell {
      font-size: 13px;
      font-weight: 600;
      color: #374151;
      background: white;
      border-bottom: 1px solid #E5E7EB;
      white-space: nowrap;
      padding: 12px 12px;
    }
    td.mat-mdc-cell {
      font-size: 13px;
      color: #374151;
      padding: 12px 12px;
      border-bottom: 1px solid #F3F4F6;
    }
    tr.mat-mdc-row:hover { background: #F9FAFB; }
    tr.selected-row { background: #EEF3FB; }
    .center { text-align: center; }

    /* Badges */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
      .dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      &.badge-progress {
        background: #FEF3C7;
        color: #92400E;
        .dot { background: #F59E0B; }
      }
      &.badge-complete {
        background: #DCFCE7;
        color: #14532D;
        .dot { background: #22C55E; }
      }
      &.badge-pending {
        background: #FEE2E2;
        color: #7F1D1D;
        .dot { background: #EF4444; }
      }
    }

    /* ---- METRICS FOOTER ---- */
    .metrics-footer {
      background: white;
      border-radius: 10px;
      padding: 16px 24px;
      display: flex;
      align-items: center;
      gap: 32px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
      flex-wrap: wrap;
    }
    .metric-item {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .metric-icon-wrap {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      mat-icon { font-size: 22px; width: 22px; height: 22px; }
      &.blue   { background: #EEF3FB; color: #163572; }
      &.green  { background: #DCFCE7; color: #15803D; }
      &.purple { background: #EDE9FE; color: #7C3AED; }
      &.orange { background: #FEF3C7; color: #D97706; }
      &.gray   { background: #F3F4F6; color: #6B7280; }
    }
    .metric-texts {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .metric-value {
      font-size: 20px;
      font-weight: 700;
      color: #1A1A2E;
      line-height: 1.2;
    }
    .metric-name {
      font-size: 13px;
      font-weight: 600;
      color: #374151;
    }
    .metric-desc {
      font-size: 11px;
      color: #9CA3AF;
    }

    /* Paginator */
    ::ng-deep .mat-mdc-paginator {
      border-top: 1px solid #F3F4F6;
      font-family: 'Inter', sans-serif;
      font-size: 13px;
    }
  `]
})
export class SeguimientoComponent implements AfterViewInit {
  private seguimientoService = inject(SeguimientoService);

  public columnas: string[] = ['select', 'nombre', 'proyecto', 'cliente', 'liderTecnico', 'nroHoras', 'estado', 'diasConReporte', 'diasACompletar', 'acciones'];
  public dataSource = new MatTableDataSource<Colaborador>(this.seguimientoService.colaboradores());
  public selection = new SelectionModel<Colaborador>(true, []);

  // Filters
  busqueda = '';
  clienteSeleccionado = '';
  fechaDesde = '2026-04-01';
  fechaHasta = '2026-04-30';
  periodo: 'quincena' | 'mes-completo' = 'mes-completo';

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  public metricas = computed(() => this.seguimientoService.getMetricas());

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.dataSource.filterPredicate = (data: Colaborador, filter: string) => {
      const f = filter.toLowerCase();
      return data.nombre.toLowerCase().includes(f)
        || data.proyecto.toLowerCase().includes(f)
        || data.cliente.toLowerCase().includes(f);
    };
  }

  aplicarFiltros() {
    this.dataSource.filter = this.busqueda.trim().toLowerCase();
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  isAllSelected() {
    return this.selection.selected.length === this.dataSource.data.length;
  }

  masterToggle() {
    this.isAllSelected()
      ? this.selection.clear()
      : this.dataSource.data.forEach(r => this.selection.select(r));
  }

  aprobarSeleccionados() {
    const ids = this.selection.selected.map(s => s.id);
    this.seguimientoService.aprobarColaboradores(ids);
    this.selection.clear();
    this.dataSource.data = this.seguimientoService.colaboradores();
  }

  exportarExcel() {
    const rows = this.dataSource.filteredData.map(c => ({
      Colaborador: c.nombre, Proyecto: c.proyecto, Cliente: c.cliente,
      Líder: c.liderTecnico, Horas: c.nroHoras, Estado: c.estado,
      'Días Reporte': c.diasConReporte, 'Días Completar': c.diasACompletar
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Seguimiento');
    XLSX.writeFile(wb, 'Seguimiento.xlsx');
  }

  exportarCSV() {
    const rows = this.dataSource.filteredData;
    const headers = ['Colaborador', 'Proyecto', 'Cliente', 'Líder', 'Horas', 'Estado'];
    const csv = [
      headers.join(','),
      ...rows.map(c => `"${c.nombre}","${c.proyecto}","${c.cliente}","${c.liderTecnico}",${c.nroHoras},"${c.estado}"`)
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'seguimiento.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  descargarDetalle(col: Colaborador) {
    const data = [{ Colaborador: col.nombre, Horas: col.nroHoras, Estado: col.estado }];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Detalle');
    XLSX.writeFile(wb, `Detalle_${col.nombre.split(' ')[0]}.xlsx`);
  }
}
