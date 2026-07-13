import { Component, inject, OnDestroy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { Store } from '@ngrx/store';
import { finalize, map, take } from 'rxjs/operators';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { agregarCabeceraExcel, obtenerLogoReporte } from '../../../../shared/utils/reporte-export.utils';

import { Tabla } from '../../../../shared/components/tabla/tabla';
import { selectProyectos } from '../../store/proyectos.selectors';
import { ModalBase } from '../../../../shared/components/modal-base/modal-base';
import { BadgeEstado } from '../../../../shared/components/badge-estado/badge-estado';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { SuccessModalComponent } from '../../../../shared/components/success-modal/success-modal.component';
import {
  DescargaMenuComponent,
  DescargaOpcion
} from '../../../../shared/components/descarga-menu/descarga-menu.component';
import { ProyectoFormComponent } from '../../componentes/proyecto-form/proyecto-form';
import {
  FiltrosProyecto,
  ProyectosFiltros
} from '../../componentes/proyectos-filtros/proyectos-filtros';

import { CargoLookup, LiderProyecto, Proyecto, RecursoProyecto } from '../../modelos/proyecto.model';
import { ProyectosService } from '../../servicios/proyectos.service';

import {
  cargarProyectos
} from '../../store/proyectos.actions';

// Colores corporativos
const COLOR_PRIMARIO = 'FF163572';
const COLOR_LIDER = 'FFE8EEF9';
const COLOR_RECURSO = 'FFFFFFFF';
const COLOR_RECURSO_ALT = 'FFF8FAFC';
const COLOR_TEXTO = 'FF334155';
const COLOR_BORDE = 'FFE2E8F0';
const COLOR_SEPARADOR = 'FFE2E8F0';

@Component({
  selector: 'app-proyectos-page',
  standalone: true,
  imports: [
    MatButtonModule,
    MatExpansionModule,
    Tabla,
    ModalBase,
    BadgeEstado,
    ConfirmDialogComponent,
    SuccessModalComponent,
    DescargaMenuComponent,
    ProyectoFormComponent,
    ProyectosFiltros
  ],
  templateUrl: './proyectos-page.html',
  styleUrl: './proyectos-page.scss'
})
export class ProyectosPage implements OnDestroy {
  private store = inject(Store);
  private proyectosService = inject(ProyectosService);

  seguimientoMap: Record<number, string> = {};
  departamentoMap: Record<number, string> = {};
  cargosCatalogo: CargoLookup[] = [];
  idEstadoEnEspera: number | null = null;

  modalCrearVisible = false;
  modalDetalleVisible = false;
  confirmCambioEstadoVisible = false;
  confirmTitulo = '';
  confirmMensaje = '';
  confirmTextoConfirmar = 'Confirmar';
  successCrearVisible = false;
  guardandoProyecto = false;
  proyectoSeleccionado: Proyecto | null = null;
  proyectoDetalle: Proyecto | null = null;
  proyectoPendienteCambioEstado: Proyecto | null = null;

  private successModalTimeoutId: ReturnType<typeof setTimeout> | null = null;

  filtros: FiltrosProyecto = {
    busqueda: '',
    estados: [],
    seguimiento: [],
    tipos: []
  };

  opcionesDescarga: DescargaOpcion[] = [
    {
      id: 'excel',
      label: 'Exportar Excel',
      icon: 'assets/iconos/download.svg',
      action: () => this.descargarProyectosExcel()
    },
    {
      id: 'pdf',
      label: 'Exportar PDF',
      icon: 'assets/iconos/download.svg',
      action: () => this.descargarProyectosPdf()
    }
  ];

  constructor() {
    this.store.dispatch(cargarProyectos());
    this.cargarSeguimientoLookups();
  }

  private cargarSeguimientoLookups(): void {
    this.proyectosService.obtenerLookups().pipe(take(1)).subscribe({
      next: (lookups) => {
        this.seguimientoMap = lookups.estados.reduce((map, estado) => {
          map[estado.id] = estado.nombre;
          return map;
        }, {} as Record<number, string>);
        this.departamentoMap = lookups.departamentos.reduce((map, dep) => {
          map[dep.id] = dep.nombre;
          return map;
        }, {} as Record<number, string>);
        this.cargosCatalogo = lookups.cargos ?? [];
        const enEspera = lookups.estados.find(e => e.nombre === 'En espera');
        this.idEstadoEnEspera = enEspera ? enEspera.id : null;
      },
      error: (error) => console.error('Error al cargar lookups:', error)
    });
  }

  private obtenerSeguimientoNombre(idEstadoProyecto?: number | null): string {
    if (!idEstadoProyecto) return 'Sin seguimiento';
    return this.seguimientoMap[idEstadoProyecto] ?? 'Sin seguimiento';
  }

  ngOnDestroy(): void {
    if (this.successModalTimeoutId) clearTimeout(this.successModalTimeoutId);
  }

  abrirModalCrear(): void {
    this.proyectoSeleccionado = null;
    this.modalCrearVisible = true;
  }

  cerrarModalCrear(): void {
    this.modalCrearVisible = false;
  }

  guardarProyecto(proyecto: Proyecto): void {
    if (this.guardandoProyecto) return;

    this.guardandoProyecto = true;

    const finalizeAction = (): void => {
      this.guardandoProyecto = false;
    };

    const handleError = (error: any): void => {
      console.error('Error al guardar proyecto:', error);
    };

    if (this.proyectoSeleccionado) {
      const proyectoConId: Proyecto = { ...proyecto, id: this.proyectoSeleccionado.id };
      this.proyectosService.actualizarProyecto(proyectoConId.id, proyectoConId).pipe(
        finalize(() => finalizeAction())
      ).subscribe({
        next: (response) => {
          if (response.status === 200 || response.status === 204) {
            this.store.dispatch(cargarProyectos());
            this.cerrarModalCrear();
          } else {
            console.error('Respuesta inesperada al actualizar proyecto:', response);
          }
        },
        error: handleError
      });
    } else {
      this.proyectosService.crearProyecto(proyecto).pipe(
        finalize(() => finalizeAction())
      ).subscribe({
        next: (response) => {
          if (response.status === 201 || response.status === 200) {
            this.store.dispatch(cargarProyectos());
            this.cerrarModalCrear();
            this.mostrarSuccessCrear();
          } else {
            console.error('Respuesta inesperada al crear proyecto:', response);
          }
        },
        error: handleError
      });
    }
  }

  private mostrarSuccessCrear(): void {
    if (this.successModalTimeoutId) clearTimeout(this.successModalTimeoutId);
    this.successCrearVisible = true;
    this.successModalTimeoutId = window.setTimeout(() => this.cerrarSuccessCrear(), 1000);
  }

  cerrarSuccessCrear(): void {
    if (this.successModalTimeoutId) { clearTimeout(this.successModalTimeoutId); this.successModalTimeoutId = null; }
    this.successCrearVisible = false;
  }

  abrirModalEditar(proyecto: Proyecto): void {
    this.proyectosService.obtenerProyecto(proyecto.id).subscribe({
      next: (proyectoCompleto) => { this.proyectoSeleccionado = proyectoCompleto; this.modalCrearVisible = true; },
      error: (error) => console.error('Error al obtener proyecto:', error)
    });
  }

  solicitarCambiarEstadoProyecto(proyecto: Proyecto): void {
    this.proyectoPendienteCambioEstado = proyecto;
    const estadoActual = proyecto.activo === false || proyecto.estado?.toLowerCase() === 'inactivo' ? 'Inactivo' : 'Activo';
    const nuevoEstado = estadoActual === 'Activo' ? 'Inactivo' : 'Activo';

    this.confirmTitulo = `${nuevoEstado} proyecto`;
    this.confirmMensaje = `Esta acción marcará el proyecto como ${nuevoEstado.toLowerCase()}. ¿Deseas continuar?`;
    this.confirmTextoConfirmar = nuevoEstado;
    this.confirmCambioEstadoVisible = true;
  }

  abrirModalDetalle(proyecto: Proyecto): void {
    this.proyectosService.obtenerProyecto(proyecto.id).subscribe({
      next: (proyectoCompleto) => { this.proyectoDetalle = proyectoCompleto; this.modalDetalleVisible = true; },
      error: (error) => console.error('Error al obtener detalle del proyecto:', error)
    });
  }

  cerrarModalDetalle(): void {
    this.modalDetalleVisible = false;
    this.proyectoDetalle = null;
  }

  cancelarCambiarEstadoProyecto(): void {
    this.proyectoPendienteCambioEstado = null;
    this.confirmCambioEstadoVisible = false;
  }

  confirmarCambiarEstadoProyecto(): void {
    if (!this.proyectoPendienteCambioEstado) return;

    const proyecto = this.proyectoPendienteCambioEstado;
    const estadoActual = proyecto.activo === false || proyecto.estado?.toLowerCase() === 'inactivo' ? 'Inactivo' : 'Activo';
    const nuevoEstado = estadoActual === 'Activo' ? 'Inactivo' : 'Activo';

    const proyectoActualizado: Proyecto = {
      ...proyecto,
      activo: nuevoEstado === 'Activo',
      estado: nuevoEstado
    };

    this.proyectosService.actualizarProyecto(proyectoActualizado.id, proyectoActualizado).pipe(
      take(1)
    ).subscribe({
      next: (response) => {
        if (response.status === 200 || response.status === 204) {
          this.store.dispatch(cargarProyectos());
        } else {
          console.error('Respuesta inesperada al cambiar estado del proyecto:', response);
        }
      },
      error: (error) => console.error('Error al cambiar estado del proyecto:', error)
    });

    this.cancelarCambiarEstadoProyecto();
  }

  aplicarFiltros(filtros: FiltrosProyecto): void {
    this.filtros = filtros;
  }

  descargarProyectosExcel(): void {
    this.obtenerProyectosFiltrados().subscribe({
      next: (proyectos) => void this.descargarXlsx(proyectos, 'Proyectos'),
      error: (error) => console.error('Error al descargar proyectos:', error)
    });
  }

  descargarProyectosPdf(): void {
    this.obtenerProyectosFiltrados().subscribe({
      next: (proyectos) => void this.descargarPDF(proyectos, 'Proyectos'),
      error: (error) => console.error('Error al descargar proyectos:', error)
    });
  }

  private obtenerProyectosFiltrados() {
    return this.store.select(selectProyectos).pipe(
      take(1),
      map((proyectos) => proyectos
        .filter((proyecto) => this.proyectoCoincideConFiltros(proyecto, this.filtros))
        .sort((a, b) => {
          const aActivo = this.normalizarEstadoProyecto(a) === 'Activo';
          const bActivo = this.normalizarEstadoProyecto(b) === 'Activo';
          if (aActivo === bActivo) return 0;
          return aActivo ? -1 : 1;
        })
      )
    );
  }

  private proyectoCoincideConFiltros(proyecto: Proyecto, filtros: FiltrosProyecto): boolean {
    const busqueda = filtros.busqueda.toLowerCase();
    const estado = this.normalizarEstadoProyecto(proyecto);

    const coincideBusqueda =
      proyecto.codigo.toLowerCase().includes(busqueda) ||
      proyecto.nombre.toLowerCase().includes(busqueda) ||
      (proyecto.cliente ?? '').toLowerCase().includes(busqueda);

    const coincideEstado =
      !filtros.estados.length ||
      filtros.estados.includes(estado);

    const coincideTipo =
      !filtros.tipos.length ||
      filtros.tipos.includes(proyecto.tipo ?? '');

    const coincideSeguimiento =
      !(filtros.seguimiento && filtros.seguimiento.length) ||
      (filtros.seguimiento ?? []).includes(proyecto.idEstadoProyecto ?? -1);

    return coincideBusqueda && coincideEstado && coincideTipo && coincideSeguimiento;
  }

  private normalizarEstadoProyecto(proyecto: Proyecto): string {
    if (typeof proyecto.activo === 'boolean') {
      return proyecto.activo ? 'Activo' : 'Inactivo';
    }
    const estado = (proyecto.estado ?? '').trim().toLowerCase();
    return estado === 'inactivo' ? 'Inactivo' : 'Activo';
  }

  // ─── EXCEL ────────────────────────────────────────────────────────────────
  private async descargarXlsx(proyectos: Proyecto[], nombreBase: string): Promise<void> {
    const ExcelJS = await import('exceljs');
    const Workbook = ExcelJS.Workbook || (ExcelJS as any).default?.Workbook || (ExcelJS as any).default;
    const workbook = new Workbook();

    const COLS = 17;
    const ws = workbook.addWorksheet('Proyectos');

    ws.columns = [
      { key: 'c1', width: 18 },  // Código
      { key: 'c2', width: 35 },  // Nombre
      { key: 'c3', width: 28 },  // Cliente
      { key: 'c4', width: 20 },  // Tipo
      { key: 'c5', width: 20 },  // Seguimiento
      { key: 'c6', width: 14 },  // Estado
      { key: 'c7', width: 14 },  // Inicio
      { key: 'c8', width: 14 },  // Fin
      { key: 'c9', width: 16 },  // Fecha Fin Real
      { key: 'c10', width: 10 },  // Horas
      { key: 'c11', width: 16 },  // Presupuesto
      { key: 'c12', width: 30 },  // Líder
      { key: 'c13', width: 14 },  // Costo/h Líder
      { key: 'c14', width: 30 },  // Recurso
      { key: 'c15', width: 24 },  // Rol Recurso
      { key: 'c16', width: 16 },  // Inicio Espera
      { key: 'c17', width: 16 },  // Fin Espera
    ];

    // ── Cabecera corporativa con logo PRIMERO ──
    await agregarCabeceraExcel(workbook, ws, 'Reporte de Proyectos', COLS);

    // ── Cabecera de columnas ──
    const cabecera = ws.addRow([
      'Código', 'Nombre', 'Cliente', 'Tipo', 'Seguimiento', 'Estado',
      'Inicio', 'Fin', 'Fecha Fin Real', 'Horas', 'Presupuesto',
      'Líder', 'Costo/h Líder',
      'Recurso', 'Rol',
      'Inicio Espera', 'Fin Espera'
    ]);
    cabecera.height = 28;
    cabecera.eachCell({ includeEmpty: true }, (cell: any, col: number) => {
      if (col > COLS) return;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
      cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = this.bordeDelgado();
    });

    let filaGlobal = 0;

    proyectos.forEach((proyecto) => {
      const seguimientoNombre = this.obtenerSeguimientoNombre(proyecto.idEstadoProyecto);
      const esEnEspera =
        seguimientoNombre.toLowerCase() === 'en espera' ||
        proyecto.fechaInicioEspera != null ||
        proyecto.fechaFinEspera != null;

      // Normalizar líderes
      const lideres: LiderProyecto[] = proyecto.lideres?.length
        ? proyecto.lideres
        : proyecto.lider
          ? [{
            lider: proyecto.lider,
            costoHoraLider: proyecto.costoHoraLider,
            horasLider: proyecto.horasLider,
            recursos: proyecto.recursos ?? []
          }]
          : [];

      const lideresUnicos = lideres.filter((l, i, arr) =>
        arr.findIndex(x => x.lider === l.lider) === i
      );

      // Construir filas: una por recurso; si no hay recursos, una por líder; si no hay líderes, una fila vacía
      const filas: { lider: LiderProyecto | null; recurso: RecursoProyecto | null }[] = [];

      if (!lideresUnicos.length) {
        filas.push({ lider: null, recurso: null });
      } else {
        lideresUnicos.forEach((lider) => {
          const recursos = lider.recursos ?? [];
          if (!recursos.length) {
            filas.push({ lider, recurso: null });
          } else {
            recursos.forEach((recurso) => {
              filas.push({ lider, recurso });
            });
          }
        });
      }

      filas.forEach(({ lider, recurso }) => {
        const bg = filaGlobal % 2 === 0 ? COLOR_RECURSO : COLOR_RECURSO_ALT;

        const fila = ws.addRow([
          proyecto.codigo,
          proyecto.nombre,
          proyecto.cliente ?? '-',
          proyecto.tipo ?? '-',
          seguimientoNombre,
          this.normalizarEstadoProyecto(proyecto),
          this.formatearFecha(proyecto.fechaInicio),
          this.formatearFecha(proyecto.fechaFin),
          this.formatearFecha(proyecto.fechaFinReal) || '-',
          proyecto.horas ?? 0,
          proyecto.presupuesto ? `$${proyecto.presupuesto}` : '-',
          lider?.lider ?? '-',
          lider?.costoHoraLider ? `$${lider.costoHoraLider}/h` : '-',
          recurso?.nombre ?? '-',
          recurso?.rol ?? '-',
          esEnEspera ? (this.formatearFecha(proyecto.fechaInicioEspera) || '-') : '',
          esEnEspera ? (this.formatearFecha(proyecto.fechaFinEspera) || '-') : '',
        ]);

        fila.height = 20;

        fila.eachCell({ includeEmpty: true }, (cell: any, col: number) => {
          if (col > COLS) return;

          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
          cell.font = { name: 'Segoe UI', size: 9, color: { argb: COLOR_TEXTO } };
          cell.border = this.bordeDelgado(COLOR_BORDE);
          cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

          // Col 6 — Estado: color semántico
          if (col === 6) {
            const esActivo = (cell.value?.toString() ?? '').toLowerCase() === 'activo';
            cell.font = {
              name: 'Segoe UI', size: 9, bold: true,
              color: { argb: esActivo ? 'FF16A34A' : 'FF6B7280' }
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          }

          // Col 9 — Fecha Fin Real: color gris si es '-'
          if (col === 9 && cell.value === '-') {
            cell.font = { name: 'Segoe UI', size: 9, color: { argb: 'FFADB5BD' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          }

          // Col 16-17 — Fechas espera: fondo amarillo si tiene valor
          if ((col === 16 || col === 17) && esEnEspera && cell.value && cell.value !== '-') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };
            cell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF856404' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          }
        });

        filaGlobal++;
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    this.crearDescarga(blob, `Reporte_${nombreBase}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  private bordeDelgado(color = COLOR_PRIMARIO): any {
    const b = { style: 'thin', color: { argb: color } };
    return { top: b, left: b, bottom: b, right: b };
  }

  // ─── PDF ──────────────────────────────────────────────────────────────────
  private async descargarPDF(proyectos: Proyecto[], nombreBase: string): Promise<void> {
    const doc = new jsPDF({ orientation: 'landscape' });
    const fecha = new Date().toLocaleDateString('es-EC');
    const pageW = 297;
    const pageH = 210;
    const marginX = 14;
    const footerY = pageH - 10;
    const logo = await obtenerLogoReporte();

    // ── Cabecera de página ──
    const dibujarCabecera = (pagina: number, totalPaginas: number) => {
      doc.setFillColor(22, 53, 114);
      doc.rect(0, 0, pageW, 24, 'F');

      if (logo) {
        doc.addImage(logo, 'PNG', marginX, 4, 38, 14);
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('Reporte de Proyectos', pageW / 2, 15, { align: 'center' });

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generado: ${fecha}`, pageW - marginX, 15, { align: 'right' });

      doc.setDrawColor(99, 135, 190);
      doc.setLineWidth(0.5);
      doc.line(0, 24, pageW, 24);
    };

    // ── Pie de página ──
    const dibujarPie = (pagina: number, totalPaginas: number) => {
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(marginX, footerY, pageW - marginX, footerY);

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(156, 163, 175);
      doc.text(`Página ${pagina} de ${totalPaginas}`, pageW / 2, footerY + 5, { align: 'center' });
      doc.text('TMR — Reporte de Proyectos', marginX, footerY + 5);
      doc.text(fecha, pageW - marginX, footerY + 5, { align: 'right' });
    };

    // ── PÁGINA 1: Tabla Resumen ──
    dibujarCabecera(1, 1);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 53, 114);
    doc.text('Resumen de Proyectos', marginX, 34);
    doc.setDrawColor(22, 53, 114);
    doc.setLineWidth(0.3);
    doc.line(marginX, 36, marginX + 70, 36);

    const tableData = proyectos.map(p => [
      p.codigo,
      p.nombre,
      p.cliente ?? '-',
      p.tipo ?? '-',
      this.obtenerSeguimientoNombre(p.idEstadoProyecto),
      this.normalizarEstadoProyecto(p),
      this.formatearFecha(p.fechaInicio),
      this.formatearFecha(p.fechaFin),
      String(p.horas ?? 0),
      p.presupuesto ? `$${p.presupuesto}` : '-'
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['Código', 'Nombre', 'Cliente', 'Tipo', 'Seguimiento', 'Estado', 'Inicio', 'Fin', 'Horas', 'Presupuesto']],
      body: tableData,
      styles: {
        fontSize: 7.5,
        cellPadding: { top: 4, bottom: 4, left: 5, right: 5 },
        valign: 'middle',
        overflow: 'linebreak',
        font: 'helvetica',
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [22, 53, 114],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
        cellPadding: { top: 5, bottom: 5, left: 6, right: 6 }
      },
      bodyStyles: {
        textColor: [55, 65, 81]
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      columnStyles: {
        0: { cellWidth: 22, halign: 'center' },
        1: { cellWidth: 48 },
        2: { cellWidth: 38 },
        3: { cellWidth: 24, halign: 'center' },
        4: { cellWidth: 26, halign: 'center' },
        5: { cellWidth: 22, halign: 'center' },
        6: { cellWidth: 20, halign: 'center' },
        7: { cellWidth: 20, halign: 'center' },
        8: { cellWidth: 16, halign: 'center' },
        9: { cellWidth: 24, halign: 'right' }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 5) {
          const val = String(data.cell.raw ?? '').toLowerCase();
          data.cell.styles.textColor = val === 'activo' ? [22, 163, 74] : [107, 114, 128];
          data.cell.styles.fontStyle = 'bold';
        }
      },
      margin: { left: marginX, right: marginX, bottom: 22, top: 30 },
      didDrawPage: (data) => {
        const pageNum = (doc as any).internal.getCurrentPageInfo().pageNumber;
        const total = (doc as any).internal.getNumberOfPages();
        dibujarCabecera(pageNum, total);
        dibujarPie(pageNum, total);
      },
    });

    // ── SECCIÓN: Detalle de Líderes y Recursos ──
    const finalYResumen = (doc as any).lastAutoTable.finalY + 14;
    const espacioRestante = footerY - finalYResumen - 22;

    if (espacioRestante < 50) {
      doc.addPage();
    }

    let currentPageNum = (doc as any).internal.getCurrentPageInfo().pageNumber;
    let currentY = espacioRestante < 50 ? 30 : finalYResumen;

    if (espacioRestante < 50) {
      dibujarCabecera(currentPageNum, currentPageNum);
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 53, 114);
    doc.text('Detalle de Líderes y Recursos', marginX, currentY);
    doc.setDrawColor(22, 53, 114);
    doc.setLineWidth(0.3);
    doc.line(marginX, currentY + 2, marginX + 85, currentY + 2);
    currentY += 12;

    // ── Loop por proyectos ──
    proyectos.forEach((proyecto, proyectoIdx) => {
      const lideres = proyecto.lideres?.length
        ? proyecto.lideres
        : proyecto.lider
          ? [{ lider: proyecto.lider, costoHoraLider: proyecto.costoHoraLider, horasLider: proyecto.horasLider, recursos: proyecto.recursos ?? [] }]
          : [];

      const lideresUnicos = lideres.filter((l, i, arr) =>
        arr.findIndex(x => x.lider === l.lider) === i
      );

      if (!lideresUnicos.length) {
        const alturaEstimada = 30;
        if (currentY + alturaEstimada > footerY - 22) {
          doc.addPage();
          currentPageNum = (doc as any).internal.getCurrentPageInfo().pageNumber;
          dibujarCabecera(currentPageNum, currentPageNum);
          currentY = 32;
        }

        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(156, 163, 175);
        doc.text(`Proyecto "${proyecto.nombre}" sin líderes asignados`, marginX, currentY);
        currentY += 12;

        if (proyectoIdx < proyectos.length - 1) {
          currentY += 4;
        }
        return;
      }

      const body: any[] = [];

      lideresUnicos.forEach((lider, liderIdx) => {
        const recursos = lider.recursos ?? [];

        if (liderIdx > 0) {
          body.push([{
            content: '',
            colSpan: 8,
            styles: { fillColor: [226, 232, 240], cellPadding: 1, minCellHeight: 3 }
          }]);
        }

        const estiloLider: any = {
          fontStyle: 'bold',
          fillColor: [210, 222, 245],
          textColor: [22, 53, 114],
          fontSize: 8,
          minCellHeight: 12,
        };
        body.push([
          { content: 'LÍDER', styles: { ...estiloLider, halign: 'center' } },
          { content: lider.lider ?? '-', styles: estiloLider },
          { content: lider.costoHoraLider ? `$${lider.costoHoraLider}/h` : '-', styles: { ...estiloLider, halign: 'right' } },
          { content: lider.horasLider ? `${lider.horasLider}h` : '-', styles: { ...estiloLider, halign: 'center' } },
          { content: '', styles: { fillColor: [210, 222, 245], minCellHeight: 12 } },
          { content: '', styles: { fillColor: [210, 222, 245], minCellHeight: 12 } },
          { content: '', styles: { fillColor: [210, 222, 245], minCellHeight: 12 } },
          { content: '', styles: { fillColor: [210, 222, 245], minCellHeight: 12 } },
        ]);

        if (!recursos.length) {
          body.push([
            { content: '', styles: { fillColor: [255, 255, 255], minCellHeight: 10 } },
            {
              content: 'Sin recursos asignados',
              colSpan: 7,
              styles: {
                fontStyle: 'italic',
                textColor: [156, 163, 175],
                fillColor: [255, 255, 255],
                fontSize: 7.5,
                minCellHeight: 10,
              }
            }
          ]);
        } else {
          recursos.forEach((recurso, idx) => {
            const bg: [number, number, number] = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
            body.push([
              { content: 'Recurso', styles: { fontSize: 7, textColor: [148, 163, 184], fillColor: bg, halign: 'center', minCellHeight: 10 } },
              { content: recurso.nombre ?? '-', styles: { fillColor: bg, textColor: [51, 65, 85], minCellHeight: 10 } },
              { content: recurso.costoHora ? `$${recurso.costoHora}/h` : '-', styles: { fillColor: bg, textColor: [107, 114, 128], halign: 'right', minCellHeight: 10 } },
              { content: recurso.horas ? `${recurso.horas}h` : '-', styles: { fillColor: bg, textColor: [107, 114, 128], halign: 'center', minCellHeight: 10 } },
              { content: this.obtenerDepartamentosRecurso(recurso), styles: { fillColor: bg, textColor: [51, 65, 85], minCellHeight: 10 } },
              { content: recurso.rol ?? '-', styles: { fillColor: bg, textColor: [51, 65, 85], minCellHeight: 10 } },
              { content: this.formatearFecha(recurso.entrada ?? null), styles: { fillColor: bg, textColor: [51, 65, 85], halign: 'center', minCellHeight: 10 } },
              { content: this.formatearFecha(recurso.salida ?? null), styles: { fillColor: bg, textColor: [51, 65, 85], halign: 'center', minCellHeight: 10 } },
            ]);
          });
        }
      });

      const filasLider = lideresUnicos.length;
      const filasRecurso = lideresUnicos.reduce((sum, l) => sum + Math.max((l.recursos ?? []).length, 1), 0);
      const filaSeparador = Math.max(lideresUnicos.length - 1, 0);

      const alturaEncabezado = 12;
      const alturaHeader = 11;
      const alturaFilaLider = 14;
      const alturaFilaRec = 11;
      const alturaFilaSep = 4;
      const alturaMargen = 12;

      const alturaEstimada =
        alturaEncabezado +
        alturaHeader +
        (filasLider * alturaFilaLider) +
        (filasRecurso * alturaFilaRec) +
        (filaSeparador * alturaFilaSep) +
        alturaMargen;

      if (currentY + alturaEstimada > footerY - 22) {
        doc.addPage();
        currentPageNum = (doc as any).internal.getCurrentPageInfo().pageNumber;
        dibujarCabecera(currentPageNum, currentPageNum);
        dibujarPie(currentPageNum, currentPageNum);
        currentY = 32;
      }

      doc.setFillColor(232, 238, 249);
      doc.roundedRect(marginX, currentY, pageW - marginX * 2, 9, 1, 1, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(22, 53, 114);
      doc.text(`${proyecto.codigo} — ${proyecto.nombre}`, marginX + 4, currentY + 6.5);
      currentY += 11;

      autoTable(doc, {
        startY: currentY,
        head: [['Tipo', 'Nombre', 'Costo/h', 'Horas', 'Departamento', 'Rol', 'Entrada', 'Salida']],
        body: body,
        styles: {
          fontSize: 7.5,
          cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
          valign: 'middle',
          overflow: 'linebreak',
          lineColor: [226, 232, 240],
          lineWidth: 0.2,
        },
        headStyles: {
          fillColor: [51, 65, 85],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 7.5,
          halign: 'center',
          cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
          minCellHeight: 10,
        },
        bodyStyles: {
          textColor: [55, 65, 81],
          minCellHeight: 10
        },
        columnStyles: {
          0: { cellWidth: 20, halign: 'center' },
          1: { cellWidth: 62 },
          2: { cellWidth: 24, halign: 'right' },
          3: { cellWidth: 18, halign: 'center' },
          4: { cellWidth: 22, halign: 'center' },
          5: { cellWidth: 62 },
          6: { cellWidth: 24, halign: 'center' },
          7: { cellWidth: 24, halign: 'center' },
        },
        pageBreak: 'avoid',
        rowPageBreak: 'avoid',
        tableWidth: 'auto',
        margin: { left: marginX, right: marginX, bottom: 30 },
        didDrawPage: (data) => {
          const pageNum = (doc as any).internal.getCurrentPageInfo().pageNumber;
          const total = (doc as any).internal.getNumberOfPages();
          dibujarCabecera(pageNum, total);
          dibujarPie(pageNum, total);

          if (data.pageNumber > 1 && data.cursor) {
            const yBanner = 32;
            doc.setFillColor(232, 238, 249);
            doc.roundedRect(marginX, yBanner, pageW - marginX * 2, 8, 1, 1, 'F');
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(22, 53, 114);
            doc.text(`${proyecto.codigo} — ${proyecto.nombre} (cont.)`, marginX + 4, yBanner + 5.5);
          }
        },
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;

      if (proyectoIdx < proyectos.length - 1) {
        currentY += 4;
      }
    });

    // ── Asegurar cabecera y pie correctos en todas las páginas ──
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      dibujarCabecera(i, totalPages);
      dibujarPie(i, totalPages);
    }

    doc.save(`Reporte_${nombreBase}_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  private crearDescarga(blob: Blob, nombreArchivo: string): void {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = nombreArchivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  formatearFecha(fecha?: string | null): string {
    if (!fecha) return '-';

    const iso = fecha.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;

    const dmy = fecha.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (dmy) return `${dmy[1]}/${dmy[2]}/${dmy[3]}`;

    const parsed = new Date(fecha);
    if (!isNaN(parsed.getTime())) {
      return `${String(parsed.getDate()).padStart(2, '0')}/${String(parsed.getMonth() + 1).padStart(2, '0')}/${parsed.getFullYear()}`;
    }
    return fecha;
  }

  private obtenerIdDepartamentoRecurso(recurso: RecursoProyecto): number | null {
    return recurso.departamento ?? recurso.idDepartamento ?? null;
  }

  private obtenerDepartamentosRecurso(recurso: RecursoProyecto): string {
    const rol = this.normalizarTextoCatalogo(recurso.rol);

    if (rol) {
      const departamentos = this.cargosCatalogo
        .filter(cargo => this.normalizarTextoCatalogo(cargo.nombre) === rol)
        .map(cargo => this.obtenerNombreDepartamento(cargo.idDepartamento))
        .filter(nombre => nombre !== '-');
      const departamentosUnicos = Array.from(new Set(departamentos));

      if (departamentosUnicos.length) {
        return departamentosUnicos.join(', ');
      }
    }

    return this.obtenerNombreDepartamento(this.obtenerIdDepartamentoRecurso(recurso));
  }

  private normalizarTextoCatalogo(valor?: string | null): string {
    return (valor ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private obtenerNombreDepartamento(idDepartamento?: number | null): string {
    if (!idDepartamento) return '-';
    return this.departamentoMap[idDepartamento] ?? '-';
  }

  private formatearColaboradores(proyecto: Proyecto): string {
    const nombres = (proyecto.recursos ?? [])
      .map(r => r.nombre?.trim())
      .filter((n): n is string => Boolean(n));
    return nombres.length > 0 ? nombres.join(', ') : '-';
  }
}