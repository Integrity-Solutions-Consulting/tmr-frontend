import { Component, signal, computed, OnInit, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReporteHoras } from '../../modelos/reporte-horas.model';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { ReportesService } from '../../servicios/reportes.service';

import { TablaComponent } from '../../../../shared/components/tabla-colega/tabla.component';
import { ColumnDefinition } from '../../../../shared/components/tabla-colega/tabla.types';
import { MatIconModule } from '@angular/material/icon';
import { DescargarMenuComponent } from '../../../colaboradores/componentes/descargar-menu/descargar-menu.component';
import { exportarReporteExcel, exportarReportePdf } from '../../../../shared/utils/reporte-export.utils';

@Component({
  selector: 'app-reporte-horas',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, TablaComponent, MatIconModule, DescargarMenuComponent],
  templateUrl: './reporte-horas.component.html',
  styleUrl: './reporte-horas.component.scss'
})
export class ReporteHorasComponent {
  columnasTabla: ColumnDefinition[] = [
    { header: 'Cliente', property: 'cliente', type: 'text' },
    { header: 'Estado Cliente', property: 'estadoCliente', type: 'badge-estado' },
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
    this.generarDocumentoMotor('xlsx');
  }

  async exportarPDF() {
    this.generarDocumentoMotor('pdf');
  }

  async exportarWord() {
    this.generarDocumentoMotor('docx');
  }

  private generarDocumentoMotor(formato: 'pdf' | 'xlsx' | 'docx') {
    const filtros = {
      cliente: this.busquedaCliente() || undefined,
      mes: this.mesSeleccionado() || undefined,
      anio: this.anioSeleccionado() || undefined
    };

    const total = this.totalItems();
    if (total === 0) return;

    this.reportesService.getReporteHoras(filtros, 1, total).subscribe({
      next: (res) => {
        const data = res.data || [];
        if (data.length === 0) return;

        // Formatear datos para Carbone
        const payload = {
          templateName: formato === 'xlsx' ? 'reporte_horas.xlsx' : 'reporte_horas.docx',
          format: formato,
          data: {
            titulo: 'Reporte de Horas por Cliente',
            fechaGeneracion: new Date().toLocaleDateString('es-EC'),
            items: data.map(item => ({
              cliente: item.cliente || '-',
              estadoCliente: item.estadoCliente || '-',
              mes: item.mes || '-',
              anio: item.anio || '-',
              recursos: item.recursos || '0',
              horas: Number(item.horas || 0).toFixed(1)
            }))
          }
        };

        // 1. Solicitar generación
        this.reportesService.generarDocumento(payload).subscribe({
          next: (jobRes) => {
            console.log('Generando documento...', jobRes.jobId);
            this.pollEstadoDocumento(jobRes.jobId, formato);
          },
          error: (err) => console.error('Error al generar documento:', err)
        });
      },
      error: (err) => console.error('Error al obtener datos:', err)
    });
  }

  private pollEstadoDocumento(jobId: string, formato: string) {
    const intervalo = setInterval(() => {
      this.reportesService.consultarEstadoDocumento(jobId).subscribe({
        next: (statusRes) => {
          if (statusRes.status === 'completed' && statusRes.resultUrl) {
            clearInterval(intervalo);
            // resultUrl: /api/reports/download/output_xxxxx.pdf
            const filename = statusRes.resultUrl.split('/').pop()!;
            this.reportesService.descargarDocumento(filename).subscribe({
              next: (blob) => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Reporte_Horas_${new Date().getTime()}.${formato}`;
                a.click();
                window.URL.revokeObjectURL(url);
              },
              error: (err) => console.error('Error al descargar archivo:', err)
            });
          } else if (statusRes.status === 'failed') {
            clearInterval(intervalo);
            console.error('La generación del documento falló:', statusRes.error);
          }
        },
        error: (err) => {
          clearInterval(intervalo);
          console.error('Error al consultar estado:', err);
        }
      });
    }, 2000);
  }
}
