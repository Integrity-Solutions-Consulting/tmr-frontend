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
import { ProyectoForm } from '../../componentes/proyecto-form/proyecto-form';
import {
  FiltrosProyecto,
  ProyectosFiltros
} from '../../componentes/proyectos-filtros/proyectos-filtros';

import { CargoLookup, Proyecto, RecursoProyecto } from '../../modelos/proyecto.model';
import { ProyectosService } from '../../servicios/proyectos.service';

import {
  cargarProyectos
} from '../../store/proyectos.actions';

// Colores corporativos
const COLOR_PRIMARIO    = 'FF163572';
const COLOR_LIDER       = 'FFE8EEF9';
const COLOR_RECURSO     = 'FFFFFFFF';
const COLOR_RECURSO_ALT = 'FFF8FAFC';
const COLOR_TEXTO       = 'FF334155';
const COLOR_BORDE       = 'FFE2E8F0';
const COLOR_SEPARADOR   = 'FFE2E8F0';

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
    ProyectoForm,
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
        },   {} as Record<number, string>);
        this.cargosCatalogo = lookups.cargos ?? [];
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
    const { Workbook } = await import('exceljs');
    const workbook = new Workbook();

    // ── Hoja 1: Resumen de proyectos ──
    const wsResumen = workbook.addWorksheet('Proyectos');
    wsResumen.columns = [
      { header: 'Código',      key: 'codigo',      width: 16 },
      { header: 'Nombre',      key: 'nombre',      width: 40 },
      { header: 'Cliente',     key: 'cliente',     width: 40 },
      { header: 'Tipo',        key: 'tipo',        width: 25 },
      { header: 'Seguimiento', key: 'seguimiento', width: 25 },
      { header: 'Estado',      key: 'estado',      width: 18 },
      { header: 'Inicio',      key: 'inicio',      width: 15 },
      { header: 'Fin',         key: 'fin',         width: 15 },
      { header: 'Horas',       key: 'horas',       width: 12 },
      { header: 'Presupuesto', key: 'presupuesto', width: 20 },
    ];

    proyectos.forEach(p => {
      wsResumen.addRow({
        codigo:      p.codigo,
        nombre:      p.nombre,
        cliente:     p.cliente ?? '-',
        tipo:        p.tipo ?? '-',
        seguimiento: this.obtenerSeguimientoNombre(p.idEstadoProyecto),
        estado:      p.estado ?? '-',
        inicio:      this.formatearFecha(p.fechaInicio),
        fin:         this.formatearFecha(p.fechaFin),
        horas:       p.horas ?? '',
        presupuesto: p.presupuesto ?? '',
      });
    });

    this.aplicarEstiloHoja(wsResumen, 6);

    // ── Hoja 2: Líderes y Recursos ──
    const wsDetalle = workbook.addWorksheet('Líderes y Recursos');
    wsDetalle.columns = [
      { header: 'Proyecto',        key: 'proyecto',        width: 30 },
      { header: 'Tipo',            key: 'tipo',            width: 14 },
      { header: 'Nombre',          key: 'nombre',          width: 35 },
      { header: 'Costo/h',         key: 'costo',           width: 14 },
      { header: 'Horas',           key: 'horas',           width: 12 },
      { header: 'Departamento',    key: 'departamento',    width: 25 },
      { header: 'Rol',             key: 'rol',             width: 30 },
      { header: 'Entrada',         key: 'entrada',         width: 14 },
      { header: 'Salida',          key: 'salida',          width: 14 },
    ];

    // Estilo header hoja detalle
    const headerDetalle = wsDetalle.getRow(1);
    headerDetalle.height = 26;
    headerDetalle.eachCell((cell: any) => {
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_PRIMARIO } };
      cell.font      = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border    = this.bordeDelgado();
    });

    let rowIndex = 2;

    proyectos.forEach((proyecto, proyectoIdx) => {
      const lideres = proyecto.lideres?.length
        ? proyecto.lideres
        : proyecto.lider
          ? [{ lider: proyecto.lider, costoHoraLider: proyecto.costoHoraLider, horasLider: proyecto.horasLider, recursos: proyecto.recursos ?? [] }]
          : [];

      // Deduplicar líderes por nombre
      const lideresUnicos = lideres.filter((l, i, arr) =>
        arr.findIndex(x => x.lider === l.lider) === i
      );

      if (!lideresUnicos.length) {
        // Proyecto sin líderes
        const fila = wsDetalle.addRow({
          proyecto: proyecto.nombre,
          tipo: 'Proyecto',
          nombre: 'Sin líderes asignados',
          costo: '',
          horas: '',
          departamento: '',
          rol: '',
          entrada: '',
          salida: ''
        });
        fila.height = 20;
        fila.eachCell((cell: any) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_RECURSO_ALT } };
          cell.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF9CA3AF' } };
          cell.border = this.bordeDelgado(COLOR_BORDE);
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        });
        rowIndex++;

        // Separador entre proyectos
        this.agregarFilaSeparadora(wsDetalle);
        rowIndex++;
        return;
      }

      lideresUnicos.forEach((lider, liderIdx) => {
        // ── FILA: LÍDER ──
        const filaLider = wsDetalle.addRow({
          proyecto: liderIdx === 0 ? proyecto.nombre : '',
          tipo: 'Líder',
          nombre: lider.lider ?? '-',
          costo: lider.costoHoraLider ? `$${lider.costoHoraLider}` : '-',
          horas: lider.horasLider ?? 0,
          departamento: '-',
          rol: 'Líder de proyecto',
          entrada: '',
          salida: ''
        });
        filaLider.height = 24;
        filaLider.eachCell((cell: any) => {
          cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_LIDER } };
          cell.font      = { name: 'Segoe UI', size: 10, bold: true, color: { argb: COLOR_PRIMARIO } };
          cell.border    = this.bordeDelgado(COLOR_BORDE);
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        });
        rowIndex++;

        const recursos = lider.recursos ?? [];

        if (!recursos.length) {
          // Sin recursos
          const filaSinRecursos = wsDetalle.addRow({
            proyecto: '',
            tipo: 'Recurso',
            nombre: 'Sin recursos asignados',
            costo: '',
            horas: '',
            departamento: '',
            rol: '',
            entrada: '',
            salida: ''
          });
          filaSinRecursos.height = 18;
          filaSinRecursos.eachCell((cell: any) => {
            cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_RECURSO } };
            cell.font      = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF9CA3AF' } };
            cell.border    = this.bordeDelgado(COLOR_BORDE);
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
          });
          rowIndex++;
        } else {
          recursos.forEach((recurso, idx) => {
            const alterno = idx % 2 === 0;
            const fila = wsDetalle.addRow({
              proyecto: '',
              tipo: 'Recurso',
              nombre: recurso.nombre ?? '-',
              costo: recurso.costoHora ? `$${recurso.costoHora}` : '-',
              horas: recurso.horas ?? 0,
              departamento: this.obtenerDepartamentosRecurso(recurso),
              rol: recurso.rol ?? '-',
              entrada: this.formatearFecha(recurso.entrada ?? null),
              salida: this.formatearFecha(recurso.salida ?? null)
            });
            fila.height = 20;
            fila.eachCell((cell: any) => {
              cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: alterno ? COLOR_RECURSO : COLOR_RECURSO_ALT } };
              cell.font      = { name: 'Segoe UI', size: 10, color: { argb: COLOR_TEXTO } };
              cell.border    = this.bordeDelgado(COLOR_BORDE);
              cell.alignment = { vertical: 'middle', horizontal: 'left' };
            });
            rowIndex++;
          });
        }

        // ── ESPACIO EXTRA entre líderes del mismo proyecto ──
        if (liderIdx < lideresUnicos.length - 1) {
          this.agregarFilaEspacio(wsDetalle);
          rowIndex++;
        }
      });

      // ── SEPARADOR ENTRE PROYECTOS ──
      this.agregarFilaSeparadorProyecto(wsDetalle);
      rowIndex++;
    });

    // Aplicar cabecera con logo a ambas hojas
    await agregarCabeceraExcel(workbook, wsResumen, 'Reporte de Proyectos', 10);
    await agregarCabeceraExcel(workbook, wsDetalle, 'Reporte de Líderes y Recursos', 9);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    this.crearDescarga(blob, `Reporte_${nombreBase}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  // ── Helpers para filas de separación ──
  private agregarFilaSeparadora(ws: any): void {
    const fila = ws.addRow([]);
    fila.height = 3;
  }

  private agregarFilaEspacio(ws: any): void {
    const fila = ws.addRow([]);
    fila.height = 2;
  }

  private agregarFilaSeparadorProyecto(ws: any): void {
    const fila = ws.addRow([]);
    fila.height = 8;
    for (let c = 1; c <= 9; c++) {
      const cell = fila.getCell(c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SEPARADOR } };
      cell.border = {
        top: { style: 'thin', color: { argb: COLOR_BORDE } },
        bottom: { style: 'thin', color: { argb: COLOR_BORDE } }
      };
    }
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

  private aplicarEstiloHoja(ws: any, colEstado: number): void {
    const header = ws.getRow(1);
    header.height = 22;
    header.eachCell((cell: any) => {
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_PRIMARIO } };
      cell.font      = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border    = this.bordeDelgado();
    });

    ws.eachRow((row: any, rowNumber: number) => {
      if (rowNumber === 1) return;
      const fill = rowNumber % 2 === 0 ? COLOR_RECURSO_ALT : COLOR_RECURSO;
      row.height = 20;
      row.eachCell((cell: any, colNumber: number) => {
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
        cell.font      = { name: 'Segoe UI', size: 10, color: { argb: COLOR_TEXTO } };
        cell.border    = this.bordeDelgado(COLOR_BORDE);
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

        if (colNumber === colEstado) {
          const val = cell.value?.toString() ?? '';
          const esActivo = val.toLowerCase() === 'activo';
          cell.font = {
            name: 'Segoe UI', size: 10, bold: true,
            color: { argb: esActivo ? 'FF16A34A' : 'FF6B7280' }
          };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
      });
    });
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
    // jsPDF inicia con la página 1 creada; NO llamar addPage() aquí
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
        // Usar getCurrentPageInfo para el número real de página en el doc
        const pageNum = (doc as any).internal.getCurrentPageInfo().pageNumber;
        const total   = (doc as any).internal.getNumberOfPages();
        dibujarCabecera(pageNum, total);
        dibujarPie(pageNum, total);
      },
    });

    // ── SECCIÓN: Detalle de Líderes y Recursos ──
    const finalYResumen = (doc as any).lastAutoTable.finalY + 14;
    const espacioRestante = footerY - finalYResumen - 22;

    // Si queda menos de 50 pts, empezar en nueva página
    if (espacioRestante < 50) {
      doc.addPage();
    }

    let currentPageNum = (doc as any).internal.getCurrentPageInfo().pageNumber;
    let currentY = espacioRestante < 50 ? 30 : finalYResumen;

    // Dibujar cabecera si se saltó a nueva página
    if (espacioRestante < 50) {
      dibujarCabecera(currentPageNum, currentPageNum);
    }

    // Título de la sección de detalle
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

      // ── Proyecto sin líderes ──
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

      // ── Construir body de la tabla del proyecto ──
      const body: any[] = [];

      lideresUnicos.forEach((lider, liderIdx) => {
        const recursos = lider.recursos ?? [];

        // Separador visual entre líderes dentro del mismo proyecto
        if (liderIdx > 0) {
          body.push([{
            content: '',
            colSpan: 8,
            styles: { fillColor: [226, 232, 240], cellPadding: 1, minCellHeight: 3 }
          }]);
        }

        // Fila LÍDER
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

        // Filas RECURSOS
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

      // ── Estimación de altura para decidir salto de página ──
      // Calculamos cuántas filas reales hay (líderes + recursos + separadores)
      const filasLider    = lideresUnicos.length;
      const filasRecurso  = lideresUnicos.reduce((sum, l) => sum + Math.max((l.recursos ?? []).length, 1), 0);
      const filaSeparador = Math.max(lideresUnicos.length - 1, 0);

      const alturaEncabezado = 12;   // banda azul del proyecto
      const alturaHeader     = 11;   // cabecera de columnas
      const alturaFilaLider  = 14;   // cada fila de líder
      const alturaFilaRec    = 11;   // cada fila de recurso
      const alturaFilaSep    = 4;    // separador entre líderes
      const alturaMargen     = 12;   // espacio inferior entre proyectos

      const alturaEstimada =
        alturaEncabezado +
        alturaHeader +
        (filasLider   * alturaFilaLider) +
        (filasRecurso * alturaFilaRec)   +
        (filaSeparador * alturaFilaSep)  +
        alturaMargen;

      // Si no entra completo en el espacio restante, saltar a nueva página
      if (currentY + alturaEstimada > footerY - 22) {
        doc.addPage();
        currentPageNum = (doc as any).internal.getCurrentPageInfo().pageNumber;
        dibujarCabecera(currentPageNum, currentPageNum);
        dibujarPie(currentPageNum, currentPageNum);
        currentY = 32;
      }

      // ── Encabezado del proyecto (banda azul claro) ──
      doc.setFillColor(232, 238, 249);
      doc.roundedRect(marginX, currentY, pageW - marginX * 2, 9, 1, 1, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(22, 53, 114);
      doc.text(`${proyecto.codigo} — ${proyecto.nombre}`, marginX + 4, currentY + 6.5);
      currentY += 11;

      // ── Tabla del proyecto ──
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
        // pageBreak: 'avoid' intenta mantener la tabla completa en una sola página.
        // Si la tabla es demasiado grande para una sola página usa 'auto'.
        pageBreak: 'avoid',
        rowPageBreak: 'avoid',
        tableWidth: 'auto',
        margin: { left: marginX, right: marginX, bottom: 30 },
        didDrawPage: (data) => {
          const pageNum = (doc as any).internal.getCurrentPageInfo().pageNumber;
          const total   = (doc as any).internal.getNumberOfPages();
          dibujarCabecera(pageNum, total);
          dibujarPie(pageNum, total);

          // Si autoTable abrió una página nueva de forma automática, dibujar
          // el banner de continuación del proyecto
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
    const url  = URL.createObjectURL(blob);
    link.href     = url;
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

  private formatearColaboradores(proyecto: Proyecto): string {
    const nombres = (proyecto.recursos ?? [])
      .map(r => r.nombre?.trim())
      .filter((n): n is string => Boolean(n));
    return nombres.length > 0 ? nombres.join(', ') : '-';
  }
}
