import { Component, signal, computed, OnInit, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReporteFechas } from '../../modelos/reporte-fechas.model';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { ReportesService } from '../../servicios/reportes.service';

import { TablaComponent } from '../../../../shared/components/tabla-colega/tabla.component';
import { ColumnDefinition } from '../../../../shared/components/tabla-colega/tabla.types';

@Component({
  selector: 'app-reporte-fechas',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, TablaComponent],
  templateUrl: './reporte-fechas.component.html',
  styleUrl: './reporte-fechas.component.scss'
})
export class ReporteFechasComponent {
  columnasTabla: ColumnDefinition[] = [
    { header: 'Cliente', property: 'cliente', type: 'text' },
    { header: 'Líder', property: 'lider', type: 'text' },
    { header: 'Recurso', property: 'recurso', type: 'text' },
    { header: 'Cargo', property: 'cargo', type: 'text' },
    { header: 'Inicio', property: 'fechaInicio', type: 'fecha', dateFormat: 'dd/MM/yyyy' },
    { header: 'Fin', property: 'fechaFin', type: 'fecha', dateFormat: 'dd/MM/yyyy' }
  ];

  Math = Math;
  busquedaCliente = signal('');
  busquedaLider = signal('');
  fechaInicio = signal('');
  fechaFin = signal('');
  forzarMostrar = signal(false);

  paginaActual = signal(1);
  itemsPorPagina = signal(10);
  totalItems = signal(0);

  private reportesService = inject(ReportesService);
  datos = signal<ReporteFechas[]>([]);

  constructor() {
    effect(() => {
      // Signals we depend on
      const cliente = this.busquedaCliente();
      const lider = this.busquedaLider();
      const fInicio = this.fechaInicio();
      const fFin = this.fechaFin();
      const page = this.paginaActual();
      const pageSize = this.itemsPorPagina();
      const mostrar = this.mostrarDatos();

      if (!mostrar) {
        this.datos.set([]);
        this.totalItems.set(0);
        return;
      }

      const filtros = {
        cliente: cliente || undefined,
        lider: lider || undefined,
        fechaInicio: fInicio ? fInicio + 'T00:00:00' : undefined,
        fechaFin: fFin ? fFin + 'T23:59:59' : undefined
      };

      this.reportesService.getReporteFechas(filtros, page, pageSize).subscribe({
        next: (res) => {
          this.datos.set(res.data || []);
          this.totalItems.set(res.total || 0);
        },
        error: (err) => {
          console.error('Error al cargar reporte de fechas:', err);
        }
      });
    });
  }

  mostrarDatos = computed(() => {
    const hayFiltros = this.busquedaCliente() !== '' || this.busquedaLider() !== '' || this.fechaInicio() !== '' || this.fechaFin() !== '';
    return hayFiltros || this.forzarMostrar();
  });

  datosFiltrados = computed(() => this.datos());

  totalPaginas = computed(() => Math.ceil(this.totalItems() / this.itemsPorPagina()) || 1);
  
  datosPaginados = computed(() => this.datos());

  clientesUnicos = computed(() => new Set(this.datos().map(d => d.cliente)).size);
  lideresUnicos = computed(() => new Set(this.datos().map(d => d.lider)).size);
  recursosUnicos = computed(() => new Set(this.datos().map(d => d.recurso)).size);
  actividadesTotales = computed(() => this.totalItems());

  onInputSanitized(campo: string, event: Event) {
    const input = event.target as HTMLInputElement;
    const valorSanitizado = input.value.replace(/[0-9]/g, '').trimStart();
    input.value = valorSanitizado;

    let valorAnterior = '';
    
    if (campo === 'cliente') {
      valorAnterior = this.busquedaCliente();
      this.busquedaCliente.set(valorSanitizado);
    }
    if (campo === 'lider') {
      valorAnterior = this.busquedaLider();
      this.busquedaLider.set(valorSanitizado);
    }

    this.paginaActual.set(1);
    
    if (valorSanitizado === '' && valorAnterior !== '') {
      this.forzarMostrar.set(false);
    }
  }

  onFiltroChange(campo: string, valor: string) {
    if (campo === 'fechaInicio') this.fechaInicio.set(valor);
    if (campo === 'fechaFin') this.fechaFin.set(valor);
    this.paginaActual.set(1);
  }

  onItemsPorPaginaChange(val: any) {
    this.itemsPorPagina.set(Number(val));
    this.paginaActual.set(1);
  }

  cambiarPagina(delta: number) {
    this.paginaActual.update(p => p + delta);
  }

  verTodo() {
    this.forzarMostrar.set(true);
    this.busquedaCliente.set('');
    this.busquedaLider.set('');
    this.fechaInicio.set('');
    this.fechaFin.set('');
    this.paginaActual.set(1);
  }

  limpiarFiltros() {
    this.busquedaCliente.set('');
    this.busquedaLider.set('');
    this.fechaInicio.set('');
    this.fechaFin.set('');
    this.forzarMostrar.set(false);
    this.paginaActual.set(1);
  }

  async exportarExcel() {
    const data = this.datosFiltrados();
    if (data.length === 0) return;

    const { Workbook } = await import('exceljs');
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Reporte de Fechas');

    // 1. Columnas y anchos recomendados
    worksheet.columns = [
      { header: 'Cliente', key: 'cliente', width: 25 },
      { header: 'Líder', key: 'lider', width: 25 },
      { header: 'Recurso', key: 'recurso', width: 25 },
      { header: 'Cargo', key: 'cargo', width: 25 },
      { header: 'Inicio', key: 'fechaInicio', width: 15 },
      { header: 'Fin', key: 'fechaFin', width: 15 }
    ];

    // 2. Agregar datos
    data.forEach(item => {
      worksheet.addRow({
        cliente: item.cliente,
        lider: item.lider,
        recurso: item.recurso,
        cargo: item.cargo,
        fechaInicio: item.fechaInicio ? item.fechaInicio.toLocaleDateString() : '',
        fechaFin: item.fechaFin ? item.fechaFin.toLocaleDateString() : ''
      });
    });

    // 3. Aplicar estilos a la cabecera
    const headerRow = worksheet.getRow(1);
    headerRow.height = 25;
    headerRow.eachCell(cell => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF163572' } // Color de marca principal #163572
      };
      cell.font = {
        name: 'Segoe UI',
        size: 11,
        bold: true,
        color: { argb: 'FFFFFFFF' }
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center'
      };
    });

    // 4. Aplicar estilos a las celdas de datos
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Omitir cabecera

      row.height = 20;

      // Cebra (alternar fondo gris y blanco)
      const fillType = rowNumber % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF';

      row.eachCell(cell => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: fillType }
        };
        cell.font = {
          name: 'Segoe UI',
          size: 10,
          color: { argb: 'FF334155' } // Gris oscuro #334155
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
        
        // Centrar las fechas
        if (cell.address.startsWith('E') || cell.address.startsWith('F')) {
          cell.alignment = {
            vertical: 'middle',
            horizontal: 'center'
          };
        } else {
          cell.alignment = {
            vertical: 'middle',
            horizontal: 'left'
          };
        }
      });
    });

    // 5. Descargar archivo
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Reporte_Fechas_${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
