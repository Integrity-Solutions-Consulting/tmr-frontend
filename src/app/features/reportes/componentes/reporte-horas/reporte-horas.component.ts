import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReporteHoras } from '../../modelos/reporte-horas.model';
import { HeaderComponent } from '../../../../shared/componentes/header/header.component';

import { TablaComponent } from '../../../../shared/componentes/tabla-colega/tabla.component';
import { ColumnDefinition } from '../../../../shared/componentes/tabla-colega/tabla.types';

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
    { header: 'Horas', property: 'horas', type: 'custom' }
  ];

  Math = Math;
  meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  anios = ['2023', '2024', '2025', '2026'];

  private mesIndices: Record<string, number> = {
    'Enero': 0, 'Febrero': 1, 'Marzo': 2, 'Abril': 3, 'Mayo': 4, 'Junio': 5,
    'Julio': 6, 'Agosto': 7, 'Septiembre': 8, 'Octubre': 9, 'Noviembre': 10, 'Diciembre': 11
  };

  busquedaCliente = signal('');
  mesSeleccionado = signal('');
  anioSeleccionado = signal('');
  forzarMostrar = signal(false);

  paginaActual = signal(1);
  itemsPorPagina = signal(10);

  datos = signal<ReporteHoras[]>([
    { id: '1', cliente: 'BANCO DEL PACIFICO', recursos: 14, horas: 2240, mes: 'Mayo', anio: '2026' },
    { id: '2', cliente: 'BANCO AMAZONAS', recursos: 2, horas: 160, mes: 'Mayo', anio: '2026' },
    { id: '3', cliente: 'BANCO COOPNACIONAL', recursos: 1, horas: 80, mes: 'Mayo', anio: '2026' },
    { id: '4', cliente: 'BANCO GUAYAQUIL', recursos: 5, horas: 400, mes: 'Abril', anio: '2026' },
    { id: '5', cliente: 'BANCO DE MACHALA', recursos: 3, horas: 240, mes: 'Abril', anio: '2026' },
    { id: '6', cliente: 'PRODUBANCO', recursos: 10, horas: 1600, mes: 'Diciembre', anio: '2025' },
    { id: '7', cliente: 'BANCO BOLIVARIANO', recursos: 8, horas: 1280, mes: 'Enero', anio: '2026' },
    { id: '8', cliente: 'BANCO PICHINCHA', recursos: 12, horas: 1920, mes: 'Marzo', anio: '2025' },
    { id: '9', cliente: 'BANCO INTERNACIONAL', recursos: 4, horas: 640, mes: 'Junio', anio: '2026' },
    { id: '10', cliente: 'DINERS CLUB', recursos: 6, horas: 960, mes: 'Agosto', anio: '2025' },
    { id: '11', cliente: 'BANCO DEL PACIFICO', recursos: 15, horas: 2400, mes: 'Octubre', anio: '2025' },
    { id: '12', cliente: 'BANCO GUAYAQUIL', recursos: 7, horas: 1120, mes: 'Noviembre', anio: '2024' },
    { id: '13', cliente: 'BANCO BOLIVARIANO', recursos: 3, horas: 480, mes: 'Febrero', anio: '2026' },
    { id: '14', cliente: 'PRODUBANCO', recursos: 9, horas: 1440, mes: 'Septiembre', anio: '2025' },
    { id: '15', cliente: 'BANCO PICHINCHA', recursos: 11, horas: 1760, mes: 'Julio', anio: '2026' }
  ]);

  mostrarDatos = computed(() => {
    const hayFiltros = this.busquedaCliente() !== '' || this.mesSeleccionado() !== '' || this.anioSeleccionado() !== '';
    return hayFiltros || this.forzarMostrar();
  });

  datosFiltrados = computed(() => {
    if (!this.mostrarDatos()) return [];
    const search = this.busquedaCliente().toLowerCase();
    const mes = this.mesSeleccionado();
    const anio = this.anioSeleccionado();
    return this.datos().filter(d => {
      const matchCliente = !search || d.cliente.toLowerCase().includes(search);
      const matchMes = !mes || mes === 'ALL' || d.mes === mes;
      const matchAnio = !anio || anio === 'ALL' || d.anio === anio;
      return matchCliente && matchMes && matchAnio;
    }).sort((a, b) => Number(a.anio) - Number(b.anio) || this.mesIndices[a.mes] - this.mesIndices[b.mes]);
  });

  totalPaginas = computed(() => Math.ceil(this.datosFiltrados().length / this.itemsPorPagina()));
  datosPaginados = computed(() => {
    const inicio = (this.paginaActual() - 1) * this.itemsPorPagina();
    return this.datosFiltrados().slice(inicio, inicio + this.itemsPorPagina());
  });

  totalHoras = computed(() => this.datosFiltrados().reduce((acc, curr) => acc + curr.horas, 0));
  totalRecursos = computed(() => this.datosFiltrados().reduce((acc, curr) => acc + curr.recursos, 0));
  clientesUnicos = computed(() => new Set(this.datosFiltrados().map(d => d.cliente)).size);

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

  exportarExcel() {
    const data = this.datosFiltrados();
    if (data.length === 0) return;
    const headers = ['Cliente', 'Mes', 'Año', 'Recursos', 'Horas'];
    const rows = data.map(item => [item.cliente, item.mes, item.anio, item.recursos, item.horas]);
    const csvContent = [headers.join(';'), ...rows.map(row => row.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Reporte_Horas_${new Date().toISOString().slice(0, 10)}.csv`);
    link.click();
  }
}
