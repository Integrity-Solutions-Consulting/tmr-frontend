import { Component, signal, computed, OnInit, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReporteHoras } from '../../modelos/reporte-horas.model';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { ReportesService } from '../../servicios/reportes.service';

import { TablaComponent } from '../../../../shared/components/tabla-colega/tabla.component';
import { ColumnDefinition } from '../../../../shared/components/tabla-colega/tabla.types';

@Component({
  selector: 'app-reporte-horas',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, TablaComponent],
  templateUrl: './reporte-horas.component.html',
  styleUrl: './reporte-horas.component.scss'
})
export class ReporteHorasComponent {
  columnasTabla: ColumnDefinition[] = [
    { header: 'Cliente', property: 'cliente', type: 'text' },
    { header: 'Mes', property: 'mes', type: 'text' },
    { header: 'Año', property: 'anio', type: 'text' },
    { header: 'Recursos', property: 'recursos', type: 'text' },
    { header: 'Horas', property: 'horas', type: 'text' }
  ];

  Math = Math;
  meses = Array.from({ length: 12 }, (_, i) => {
    const nombre = new Intl.DateTimeFormat('es', { month: 'long' }).format(new Date(2000, i, 1));
    return nombre.charAt(0).toUpperCase() + nombre.slice(1);
  });
  anios: string[] = [];

  busquedaCliente = signal('');
  mesSeleccionado = signal('ALL');
  anioSeleccionado = signal('ALL');
  forzarMostrar = signal(false);

  paginaActual = signal(1);
  itemsPorPagina = signal(10);
  totalItems = signal(0);

  private reportesService = inject(ReportesService);
  datos = signal<ReporteHoras[]>([]);

  constructor() {
    effect(() => {
      const cliente = this.busquedaCliente();
      const mes = this.mesSeleccionado();
      const anio = this.anioSeleccionado();
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
        mes: mes || undefined,
        anio: anio || undefined
      };

      this.reportesService.getReporteHoras(filtros, page, pageSize).subscribe({
        next: (res) => {
          this.datos.set(res.data || []);
          this.totalItems.set(res.total || 0);

          if (res.anioMinimo && res.anioMaximo) {
            const min = res.anioMinimo;
            const max = res.anioMaximo;
            const nuevosAnios = Array.from({ length: max - min + 1 }, (_, i) => (min + i).toString());
            if (this.anios.join(',') !== nuevosAnios.join(',')) {
              this.anios = nuevosAnios;
            }
          }
        },
        error: (err) => {
          console.error('Error al cargar reporte de horas:', err);
        }
      });
    });
  }

  mostrarDatos = computed(() => true);

  datosFiltrados = computed(() => this.datos());

  totalPaginas = computed(() => Math.ceil(this.totalItems() / this.itemsPorPagina()) || 1);
  datosPaginados = computed(() => this.datos());

  // Note: These metrics are currently based on the current paginated page, 
  // but typically Server-Side filtering should return global totals from the backend. 
  // For now, we will leave them computed over this.datos().
  totalHoras = computed(() => this.datos().reduce((acc, curr) => acc + curr.horas, 0));
  totalRecursos = computed(() => this.datos().reduce((acc, curr) => acc + curr.recursos, 0));
  clientesUnicos = computed(() => new Set(this.datos().map(d => d.cliente)).size);

  onInputSanitized(campo: string, event: Event) {
    const input = event.target as HTMLInputElement;
    const sanitized = input.value.replace(/[0-9]/g, '').trimStart();
    input.value = sanitized;

    let valorAnterior = '';
    
    if (campo === 'cliente') {
      valorAnterior = this.busquedaCliente();
      this.busquedaCliente.set(sanitized);
    }

    this.paginaActual.set(1);
    
    if (sanitized === '' && valorAnterior !== '') {
      this.forzarMostrar.set(false);
    }
  }

  onMesChange(val: string) {
    this.mesSeleccionado.set(val);
    this.paginaActual.set(1);
    if (val === '') this.forzarMostrar.set(false);
  }

  onAnioChange(val: string) {
    this.anioSeleccionado.set(val);
    this.paginaActual.set(1);
    if (val === '') this.forzarMostrar.set(false);
  }

  verTodo() {
    this.forzarMostrar.set(true);
    this.mesSeleccionado.set('ALL');
    this.anioSeleccionado.set('ALL');
    this.busquedaCliente.set('');
    this.paginaActual.set(1);
  }

  limpiarFiltros() {
    this.busquedaCliente.set('');
    this.mesSeleccionado.set('');
    this.anioSeleccionado.set('');
    this.forzarMostrar.set(false);
    this.paginaActual.set(1);
  }

  onItemsPorPaginaChange(val: any) {
    this.itemsPorPagina.set(Number(val));
    this.paginaActual.set(1);
  }

  cambiarPagina(delta: number) {
    this.paginaActual.update(p => p + delta);
  }

  async exportarExcel() {
    const data = this.datosFiltrados();
    if (data.length === 0) return;

    const { Workbook } = await import('exceljs');
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Reporte de Horas');

    // 1. Columnas y anchos recomendados
    worksheet.columns = [
      { header: 'Cliente', key: 'cliente', width: 30 },
      { header: 'Mes', key: 'mes', width: 15 },
      { header: 'Año', key: 'anio', width: 15 },
      { header: 'Recursos', key: 'recursos', width: 15 },
      { header: 'Horas', key: 'horas', width: 15 }
    ];

    // 2. Agregar datos
    data.forEach(item => {
      worksheet.addRow({
        cliente: item.cliente,
        mes: item.mes,
        anio: item.anio,
        recursos: item.recursos,
        horas: Number(item.horas)
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
        
        // Centrar las columnas numéricas y de fechas, texto alineado a la izquierda
        if (cell.address.startsWith('B') || cell.address.startsWith('C') || cell.address.startsWith('D') || cell.address.startsWith('E')) {
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
    link.download = `Reporte_Horas_${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
