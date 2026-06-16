import { Component, QueryList, ViewChildren, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import {
  ActionMenuComponent,
  ActionMenuItem,
} from '../../../../shared/components/action-menu/action-menu.component';

import { DescargaMenuComponent, DescargaOpcion } from '../../../../shared/components/descarga-menu/descarga-menu.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { PaginacionComponent } from '../../../../shared/components/paginacion/paginacion.component';
import { SuccessModalComponent } from '../../../../shared/components/success-modal/success-modal.component';
import { RolesFormModal, RolModalData } from '../../components/roles-form-modal/roles-form-modal';
import { Modulo, Rol } from '../../models/configuracion.models';
import { ConfiguracionService } from '../../services/configuracion.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type FiltroEstadoRol = 'Activo' | 'Inactivo' | '';

@Component({
  selector: 'app-roles-page',
  imports: [CommonModule, MatIconModule, ActionMenuComponent, DescargaMenuComponent, ConfirmDialogComponent, PaginacionComponent, SuccessModalComponent],
  templateUrl: './roles-page.html',
  styleUrl: './roles-page.scss',
})
export class RolesPage {
  private readonly configuracionService = inject(ConfiguracionService);
  private readonly dialog = inject(MatDialog);

  @ViewChildren(ActionMenuComponent)
  private readonly actionMenus!: QueryList<ActionMenuComponent>;

  // ── Señales de datos ──────────────────────────────────────────────────────
  readonly query = signal('');
  readonly paginaActual = signal(1);
  readonly porPagina = 10;
  readonly estadoError = signal<string | null>(null);
  readonly rolEliminandoId = signal<number | null>(null);
  readonly roles = this.configuracionService.roles;
  readonly modulos = this.configuracionService.modulos;

  // ── Filtro por estado ─────────────────────────────────────────────────────
  readonly filtroEstado = signal<FiltroEstadoRol>('');

  // ── Estado dropdown ───────────────────────────────────────────────────────
  mostrarEstadoDropdown = false;

  // ── Confirmación y éxito ──────────────────────────────────────────────────
  readonly confirmVisible = signal(false);
  readonly confirmMensaje = signal('');
  private rolPendienteEliminar: Rol | null = null;

  readonly exitoVisible = signal(false);
  readonly exitoMensaje = signal('Operación realizada exitosamente');

  /** ID del rol cuya lista de módulos extra está desplegada */
  readonly rolExpandidoId = signal<number | null>(null);

  // ── Computeds de conteo ───────────────────────────────────────────────────
  readonly totalRoles = computed(() => this.roles().length);

  readonly rolesActivos = computed(() => this.roles().filter((rol) => rol.activo).length);

  readonly rolesInactivos = computed(() => this.roles().filter((rol) => !rol.activo).length);

  readonly opcionesDescarga: DescargaOpcion[] = [
    {
      id: 'excel',
      label: 'Exportar Excel',
      icon: 'assets/iconos/download.svg',
      action: () => this.descargarRolesExcel()
    },
    {
      id: 'pdf',
      label: 'Exportar PDF',
      icon: 'assets/iconos/download.svg',
      action: () => this.descargarRolesPdf()
    }
  ];

  readonly modulosCubiertos = computed(() =>
    new Set(this.roles().flatMap((rol) => rol.modulos.map((m) => m.id))).size,
  );

  /** Label del botón de filtro estado */
  readonly labelEstado = computed(() => {
    const filtro = this.filtroEstado();
    if (filtro === 'Activo') return 'Activos';
    if (filtro === 'Inactivo') return 'Inactivos';
    return 'Estado';
  });

  /** Filtrado por texto Y por estado */
  readonly filteredRoles = computed(() => {
    const query = this.query().trim().toLowerCase();
    const estado = this.filtroEstado();

    return this.roles().filter((rol) => {
      // Filtro por estado
      const matchEstado =
        estado === '' ||
        (estado === 'Activo' && rol.activo) ||
        (estado === 'Inactivo' && !rol.activo);

      if (!matchEstado) return false;

      // Filtro por texto
      if (!query) return true;

      return [
        rol.nombre,
        rol.descripcion,
        rol.modulos.map((m) => m.nombre).join(' '),
        rol.activo ? 'activo' : 'inactivo',
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  });

  readonly totalRegistros = computed(() => this.filteredRoles().length);

  readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.totalRegistros() / this.porPagina)),
  );

  readonly paginaActualNormalizada = computed(() =>
    Math.min(this.paginaActual(), this.totalPaginas()),
  );

  readonly rolesPaginados = computed(() => {
    const inicio = (this.paginaActualNormalizada() - 1) * this.porPagina;
    return this.filteredRoles().slice(inicio, inicio + this.porPagina);
  });

  // ── Control del dropdown Estado ────────────────────────────────────────────

  toggleEstadoDropdown(event?: Event): void {
    event?.stopPropagation();
    this.mostrarEstadoDropdown = !this.mostrarEstadoDropdown;
  }

  seleccionarEstado(estado: FiltroEstadoRol): void {
    this.paginaActual.set(1);
    this.filtroEstado.set(estado);
    this.mostrarEstadoDropdown = false;
  }

  cerrarDropdowns(): void {
    this.mostrarEstadoDropdown = false;
  }

  setQuery(value: string): void {
    this.query.set(value);
    this.paginaActual.set(1);
  }

  irAPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas()) return;
    this.paginaActual.set(pagina);
  }

  // ── Modales ────────────────────────────────────────────────────────────────

  openModal(rol?: Rol, mode: 'create' | 'edit' | 'view' = 'create'): void {
    this.closeActionsMenu();

    const data: RolModalData = {
      rol,
      roles: this.roles(),
      nextId: this.configuracionService.nextId(this.roles()),
      modulos: this.modulos(),
      mode: rol ? mode : 'create',
    };

    const dialogRef = this.dialog.open<RolesFormModal, RolModalData, Rol>(
      RolesFormModal,
      {
        data,
        panelClass: 'tmr-dialog-panel',
        disableClose: true,
      },
    );

    dialogRef.afterClosed().subscribe((result) => {
      this.closeActionsMenu();

      if (result) {
        const esNuevo = !this.roles().some((r) => r.id === result.id);
        this.closeActionsMenu();
        this.configuracionService.upsertRol(result);
        this.closeActionsMenu();
        this.mostrarExito(
          esNuevo ? 'Rol creado correctamente' : 'Rol actualizado correctamente',
        );
      }
    });
  }

  viewRol(rol: Rol): void {
    this.closeActionsMenu();
    this.openModal(rol, 'view');
  }

  editRol(rol: Rol): void {
    this.closeActionsMenu();
    this.openModal(rol, 'edit');
  }

  obtenerAccionesRol(rol: Rol): ActionMenuItem[] {
    return [
      {
        id: 'ver-mas',
        label: 'Ver más',
        action: () => this.viewRol(rol),
      },
      {
        id: 'editar',
        label: 'Editar',
        action: () => this.editRol(rol),
      },
      {
        id: 'eliminar',
        label: 'Eliminar',
        danger: true,
        disabled: this.rolEliminandoId() === rol.id,
        action: () => this.solicitarEliminarRol(rol),
      },
    ];
  }

  // ── Módulos expandibles ────────────────────────────────────────────────────

  visibleModulos(rol: Rol): Modulo[] {
    return rol.modulos.slice(0, 3);
  }

  modulosOcultos(rol: Rol): number {
    return Math.max(rol.modulos.length - 3, 0);
  }

  modulosOcultosList(rol: Rol): Modulo[] {
    return rol.modulos.slice(3);
  }

  estaExpandido(rolId: number): boolean {
    return this.rolExpandidoId() === rolId;
  }

  toggleModulosExpandidos(event: Event, rolId: number): void {
    event.stopPropagation();
    this.rolExpandidoId.set(this.rolExpandidoId() === rolId ? null : rolId);
  }

  cerrarExpandido(): void {
    this.rolExpandidoId.set(null);
  }

  // ── Eliminar rol ──────────────────────────────────────────────────────────

  solicitarEliminarRol(rol: Rol): void {
    this.closeActionsMenu();
    this.estadoError.set(null);
    this.rolPendienteEliminar = rol;
    this.confirmMensaje.set(`Se va a eliminar el rol "${rol.nombre}". Esta accion no se puede deshacer.`);
    this.confirmVisible.set(true);
  }

  confirmarEliminarRol(): void {
    this.closeActionsMenu();
    this.confirmVisible.set(false);
    const rol = this.rolPendienteEliminar;
    this.rolPendienteEliminar = null;
    if (!rol) return;

    this.estadoError.set(null);
    this.rolEliminandoId.set(rol.id);

    this.configuracionService.deleteRol(rol.id).subscribe({
      next: () => {
        this.rolEliminandoId.set(null);
        this.closeActionsMenu();
        this.mostrarExito('Rol eliminado correctamente');
      },
      error: (err) => {
        this.rolEliminandoId.set(null);
        this.estadoError.set(this.extractDeleteError(err));
      },
    });
  }

  cancelarEliminarRol(): void {
    this.closeActionsMenu();
    this.confirmVisible.set(false);
    this.rolPendienteEliminar = null;
  }

  // ── Utilidades ────────────────────────────────────────────────────────────

  cerrarExito(): void {
    this.closeActionsMenu();
    this.exitoVisible.set(false);
  }

  closeActionsMenu(): void {
    this.actionMenus?.forEach((menu) => menu.closeMenu());
    this.cerrarExpandido();
  }

  private mostrarExito(mensaje: string): void {
    this.closeActionsMenu();
    this.exitoMensaje.set(mensaje);
    this.exitoVisible.set(true);
    setTimeout(() => this.exitoVisible.set(false), 3000);
  }

  private extractDeleteError(err: unknown): string {
    const error = (err as { error?: unknown })?.error;

    if (typeof error === 'string') {
      return error;
    }

    const body = error as {
      errors?: { message?: string }[];
      message?: string;
      mensaje?: string;
      error?: string;
      title?: string;
    } | undefined;

    return body?.errors?.[0]?.message
      ?? body?.message
      ?? body?.mensaje
      ?? body?.error
      ?? body?.title
      ?? 'No se pudo eliminar el rol. Verifica si es un rol de sistema o si tiene usuarios asignados.';
  }

  // ── Exportación ──────────────────────────────────────────────────────────
  descargarRolesExcel(): void {
    this.descargarXlsx(this.filteredRoles(), 'Roles');
  }

  descargarRolesPdf(): void {
    this.descargarPDF(this.filteredRoles(), 'Roles');
  }

  private displayModulosRol(rol: Rol): string {
    return rol.modulos.map(m => m.nombre).join(', ') || '-';
  }

  private obtenerFilasExportacion(roles: Rol[]): string[][] {
    return roles.map(rol => [
      rol.nombre || '-',
      rol.descripcion || '-',
      this.displayModulosRol(rol),
      rol.activo ? 'Activo' : 'Inactivo',
    ]);
  }

  private async descargarXlsx(roles: Rol[], nombreBase: string): Promise<void> {
    const { Workbook } = await import('exceljs');
    const workbook = new Workbook();

    const COLOR_PRIMARIO    = 'FF163572';
    const COLOR_RECURSO     = 'FFFFFFFF';
    const COLOR_RECURSO_ALT = 'FFF8FAFC';
    const COLOR_TEXTO       = 'FF334155';
    const COLOR_BORDE       = 'FFE2E8F0';

    const ws = workbook.addWorksheet('Roles');
    ws.columns = [
      { header: 'Nombre del Rol', key: 'nombre', width: 30 },
      { header: 'Descripción',    key: 'desc',   width: 45 },
      { header: 'Módulos',        key: 'modulos',width: 50 },
      { header: 'Estado',         key: 'estado', width: 18 },
    ];

    roles.forEach(r => {
      ws.addRow({
        nombre: r.nombre || '-',
        desc: r.descripcion || '-',
        modulos: this.displayModulosRol(r),
        estado: r.activo ? 'Activo' : 'Inactivo',
      });
    });

    const header = ws.getRow(1);
    header.height = 22;
    header.eachCell((cell: any) => {
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_PRIMARIO } };
      cell.font      = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      const b = { style: 'thin', color: { argb: COLOR_PRIMARIO } };
      cell.border    = { top: b, left: b, bottom: b, right: b };
    });

    ws.eachRow((row: any, rowNumber: number) => {
      if (rowNumber === 1) return;
      const fill = rowNumber % 2 === 0 ? COLOR_RECURSO_ALT : COLOR_RECURSO;
      row.height = 20;
      row.eachCell((cell: any, colNumber: number) => {
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
        cell.font      = { name: 'Segoe UI', size: 10, color: { argb: COLOR_TEXTO } };
        const b = { style: 'thin', color: { argb: COLOR_BORDE } };
        cell.border    = { top: b, left: b, bottom: b, right: b };
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

        if (colNumber === 4) {
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

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `${nombreBase}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private descargarPDF(roles: Rol[], nombreBase: string): void {
    const doc      = new jsPDF({ orientation: 'landscape' });
    const fecha    = new Date().toLocaleDateString('es-EC');
    const pageW    = 297;
    const pageH    = 210;
    const marginX  = 12;
    const footerY  = pageH - 8;

    const dibujarCabecera = () => {
      doc.setFillColor(22, 53, 114);
      doc.rect(0, 0, pageW, 22, 'F');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('Reporte de Roles', marginX, 14);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generado: ${fecha}`, pageW - marginX, 14, { align: 'right' });
      doc.setDrawColor(99, 135, 190);
      doc.setLineWidth(0.5);
      doc.line(0, 22, pageW, 22);
    };

    dibujarCabecera();

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 53, 114);
    doc.text('Listado de Roles', marginX, 32);
    doc.setDrawColor(22, 53, 114);
    doc.setLineWidth(0.3);
    doc.line(marginX, 34, marginX + 60, 34);

    autoTable(doc, {
      startY: 37,
      head: [['Nombre del Rol', 'Descripción', 'Módulos', 'Estado']],
      body: this.obtenerFilasExportacion(roles),
      styles: {
        fontSize: 8,
        cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
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
        cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
      },
      bodyStyles: { textColor: [51, 65, 85] },
      alternateRowStyles: { fillColor: [245, 248, 255] },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 80 },
        2: { cellWidth: 110 },
        3: { cellWidth: 33,  halign: 'center' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
          const val = String(data.cell.raw ?? '').toLowerCase();
          data.cell.styles.textColor = val === 'activo' ? [22, 163, 74] : [107, 114, 128];
          data.cell.styles.fontStyle = 'bold';
        }
      },
      margin: { left: marginX, right: marginX, bottom: 18 },
      didDrawPage: () => dibujarCabecera(),
    });

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(marginX, footerY, pageW - marginX, footerY);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(156, 163, 175);
      doc.text(`Página ${i} de ${pageCount}`, pageW / 2, footerY + 4, { align: 'center' });
      doc.text('TMR — Reporte de Roles', marginX, footerY + 4);
      doc.text(fecha, pageW - marginX, footerY + 4, { align: 'right' });
    }

    doc.save(`${nombreBase}_${new Date().toISOString().slice(0, 10)}.pdf`);
  }
}
