import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReporteFechas } from '../../modelos/reporte-fechas.model';
import { HeaderComponent } from '../../../../shared/componentes/header/header.component';

import { TablaComponent } from '../../../../shared/componentes/tabla-colega/tabla.component';
import { ColumnDefinition } from '../../../../shared/componentes/tabla-colega/tabla.types';

@Component({
  selector: 'app-reporte-fechas',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, TablaComponent],
  templateUrl: './reporte-fechas.component.html',
  styleUrl: './reporte-fechas.component.scss'
})
export class ReporteFechasComponent {
  columnasTabla: ColumnDefinition[] = [
    { header: 'Cliente', property: 'cliente', type: 'text', cellClass: 'font-bold text-dark' },
    { header: 'Líder', property: 'lider', type: 'text' },
    { header: 'Recurso', property: 'recurso', type: 'text', cellClass: 'font-medium' },
    { header: 'Cargo', property: 'cargo', type: 'badge' },
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

  datos = signal<ReporteFechas[]>([
    { id: '1', cliente: 'BANCO GUAYAQUIL', lider: 'Adriana Martinez', recurso: 'Luiggi Ricardo Rendon Cajape', cargo: 'Desarrollador Fullstack', fechaInicio: new Date('2023-01-20'), fechaFin: new Date('2026-12-31') },
    { id: '2', cliente: 'TORRES Y TORRES', lider: 'Alex Gonzalez', recurso: 'Steven Jostin Quimi Perez', cargo: 'Desarrollador Fullstack', fechaInicio: new Date('2025-03-20'), fechaFin: new Date('2026-09-04') },
    { id: '3', cliente: 'BANCO DEL PACIFICO', lider: 'Allan Gallegos', recurso: 'Lucy Viviana Anastacio Burgos', cargo: 'Ingeniero de Seguridad', fechaInicio: new Date('2025-03-10'), fechaFin: new Date('2026-03-09') },
    { id: '4', cliente: 'BANCO DEL PACIFICO', lider: 'Allan Gallegos', recurso: 'Martha Melany Aguilar Reasco', cargo: 'Ingeniero de Seguridad', fechaInicio: new Date('2025-03-10'), fechaFin: new Date('2026-03-09') },
    { id: '5', cliente: 'BANCO GUAYAQUIL', lider: 'Anabelle Valero', recurso: 'Aaron David Álvarez Llamuca', cargo: 'Desarrollador Fullstack', fechaInicio: new Date('2023-05-02'), fechaFin: new Date('2026-12-30') },
    { id: '6', cliente: 'BANCO PICHINCHA', lider: 'Carlos Mendez', recurso: 'Juan Perez', cargo: 'Arquitecto Cloud', fechaInicio: new Date('2024-02-15'), fechaFin: new Date('2025-02-15') },
    { id: '7', cliente: 'PRODUBANCO', lider: 'Diana Rios', recurso: 'Elena Gomez', cargo: 'Analista QA', fechaInicio: new Date('2024-06-01'), fechaFin: new Date('2025-12-01') },
    { id: '8', cliente: 'BANCO BOLIVARIANO', lider: 'Ricardo Molina', recurso: 'Valeria Pazmiño', cargo: 'Fullstack Analyst', fechaInicio: new Date('2023-08-12'), fechaFin: new Date('2026-12-31') },
    { id: '9', cliente: 'BANCO SOLIDARIO', lider: 'Samantha Salcedo', recurso: 'Daniel Erazo', cargo: 'Especialista IA', fechaInicio: new Date('2024-01-10'), fechaFin: new Date('2026-01-10') },
    { id: '10', cliente: 'BANCO INTERNACIONAL', lider: 'Luis Yánez', recurso: 'Fernanda Benavides', cargo: 'Consultor Ciberseguridad', fechaInicio: new Date('2025-01-15'), fechaFin: new Date('2025-12-15') },
    { id: '11', cliente: 'BANCO PROCREDIT', lider: 'Marlene Figueroa', recurso: 'Carlos Iturralde', cargo: 'Arquitecto Cloud', fechaInicio: new Date('2023-11-05'), fechaFin: new Date('2026-11-05') },
    { id: '12', cliente: 'CITIBANK ECUADOR', lider: 'Luis Yánez', recurso: 'Maria Guzmán', cargo: 'Ingeniero DevOps', fechaInicio: new Date('2024-04-20'), fechaFin: new Date('2025-04-20') },
    { id: '13', cliente: 'BANCO GUAYAQUIL', lider: 'Adriana Martinez', recurso: 'Luis Rendón', cargo: 'UX Designer', fechaInicio: new Date('2025-02-01'), fechaFin: new Date('2026-02-01') },
    { id: '14', cliente: 'BANCO PICHINCHA', lider: 'Carlos Mendez', recurso: 'Ana Lucía Jara', cargo: 'Backend Dev', fechaInicio: new Date('2024-09-15'), fechaFin: new Date('2025-09-15') },
    { id: '15', cliente: 'DINERS CLUB', lider: 'Marlene Figueroa', recurso: 'Pedro Armijos', cargo: 'Scrum Master', fechaInicio: new Date('2023-03-10'), fechaFin: new Date('2026-03-10') },
    { id: '16', cliente: 'BANCO BOLIVARIANO', lider: 'Ricardo Molina', recurso: 'Sofia Castro', cargo: 'QA Lead', fechaInicio: new Date('2025-05-12'), fechaFin: new Date('2026-05-12') }
  ]);

  mostrarDatos = computed(() => {
    const hayFiltros = this.busquedaCliente() !== '' || this.busquedaLider() !== '' || this.fechaInicio() !== '' || this.fechaFin() !== '';
    return hayFiltros || this.forzarMostrar();
  });

  datosFiltrados = computed(() => {
    if (!this.mostrarDatos()) return [];

    const searchC = this.busquedaCliente().toLowerCase();
    const searchL = this.busquedaLider().toLowerCase();

    // Normalizar filtros (Solo fecha local)
    const fIni = this.fechaInicio() ? new Date(this.fechaInicio() + 'T00:00:00') : null;
    const fFin = this.fechaFin() ? new Date(this.fechaFin() + 'T00:00:00') : null;

    if (fIni) fIni.setHours(0, 0, 0, 0);
    if (fFin) fFin.setHours(0, 0, 0, 0);

    return this.datos().filter(d => {
      const matchC = !searchC || d.cliente.toLowerCase().includes(searchC);
      const matchL = !searchL || d.lider.toLowerCase().includes(searchL);

      // Normalizar fechas del registro para comparación local
      const recordIni = new Date(d.fechaInicio);
      const recordFin = new Date(d.fechaFin);

      // Forzar a medianoche local para ignorar desfases UTC
      recordIni.setHours(0, 0, 0, 0);
      recordFin.setHours(0, 0, 0, 0);

      // Lógica de Inclusión Estricta (Especificidad)
      const matchF = (!fIni || recordIni >= fIni) && (!fFin || recordFin <= fFin);

      return matchC && matchL && matchF;
    }).sort((a, b) => b.fechaInicio.getTime() - a.fechaInicio.getTime());
  });

  totalPaginas = computed(() => Math.ceil(this.datosFiltrados().length / this.itemsPorPagina()));
  datosPaginados = computed(() => {
    const inicio = (this.paginaActual() - 1) * this.itemsPorPagina();
    return this.datosFiltrados().slice(inicio, inicio + this.itemsPorPagina());
  });

  clientesUnicos = computed(() => new Set(this.datosFiltrados().map(d => d.cliente)).size);
  lideresUnicos = computed(() => new Set(this.datosFiltrados().map(d => d.lider)).size);
  recursosUnicos = computed(() => new Set(this.datosFiltrados().map(d => d.recurso)).size);

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
    
    // Solo quitamos el "ver todo" si el usuario borró una palabra que ya estaba escrita.
    // Si la caja estaba vacía y el usuario solo intentó dar un espacio, no ocultamos la tabla.
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

  exportarExcel() {
    const data = this.datosFiltrados();
    if (data.length === 0) return;
    const headers = ['Cliente', 'Lider', 'Recurso', 'Cargo', 'Inicio', 'Fin'];
    const rows = data.map(item => [item.cliente, item.lider, item.recurso, item.cargo, item.fechaInicio.toLocaleDateString(), item.fechaFin.toLocaleDateString()]);
    const csvContent = [headers.join(';'), ...rows.map(row => row.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Reporte_Fechas_${new Date().toISOString().slice(0, 10)}.csv`);
    link.click();
  }
}
