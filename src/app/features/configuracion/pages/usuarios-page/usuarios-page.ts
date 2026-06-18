import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ActionMenuComponent,
  ActionMenuItem,
} from '../../../../shared/components/action-menu/action-menu.component';

import { BadgeEstadoComponent } from '../../../../shared/components/badge-estado/badge-estado.component';
import {
  DescargaMenuComponent,
  DescargaOpcion,
} from '../../../../shared/components/descarga-menu/descarga-menu.component';
import { PaginacionComponent } from '../../../../shared/components/paginacion/paginacion.component';
import { SuccessModalComponent } from '../../../../shared/components/success-modal/success-modal.component';
import { UsuarioDetalleModal } from '../../components/usuario-detalle-modal/usuario-detalle-modal.component';
import { UsuariosFormModal } from '../../components/usuarios-form-modal/usuarios-form-modal';
import { Rol, Usuario } from '../../models/configuracion.models';
import { ConfiguracionService } from '../../services/configuracion.service';

type FiltroEstado = 'todos' | 'activos' | 'inactivos';

@Component({
  selector: 'app-usuarios-page',
  imports: [CommonModule, ActionMenuComponent, DescargaMenuComponent, PaginacionComponent, SuccessModalComponent, BadgeEstadoComponent],
  templateUrl: './usuarios-page.html',
  styleUrl: './usuarios-page.scss',
})
export class UsuariosPage {
  private readonly configuracionService = inject(ConfiguracionService);
  private readonly dialog = inject(MatDialog);

  // ── Señales de datos ──────────────────────────────────────────────────────
  readonly query = signal('');
  readonly paginaActual = signal(1);
  readonly porPagina = 10;
  readonly usuarios = this.configuracionService.usuarios;
  readonly usuariosTotales = this.configuracionService.usuariosTotales;
  readonly roles = this.configuracionService.roles;

  // ── Filtro activo por estado ──────────────────────────────────────────────
  readonly filtroActivo = signal<FiltroEstado>('activos');

  // ── Estado del dropdown Estado ────────────────────────────────────────────
  mostrarEstadoDropdown = false;

  // ── Modal de éxito ────────────────────────────────────────────────────────
  readonly exitoVisible = signal(false);
  readonly exitoMensaje = signal('Operación realizada exitosamente');

  readonly opcionesDescarga: DescargaOpcion[] = [
    {
      id: 'excel',
      label: 'Exportar Excel',
      icon: 'assets/iconos/download.svg',
      action: () => this.descargarUsuariosExcel(),
    },
    {
      id: 'pdf',
      label: 'Exportar PDF',
      icon: 'assets/iconos/download.svg',
      action: () => this.descargarUsuariosPdf(),
    },
  ];

  // ── Computeds de conteo (basados en usuariosTotales para reflejar el total real) ──
  readonly totalUsuarios = computed(() => this.usuariosTotales().length);

  readonly activos = computed(
    () => this.usuariosTotales().filter((u) => u.estado === 'Activo').length,
  );

  readonly inactivos = computed(
    () => this.usuariosTotales().filter((u) => u.estado !== 'Activo').length,
  );

  /** Texto del label del filtro estado según el filtro activo */
  readonly labelEstado = computed(() => {
    const filtro = this.filtroActivo();
    if (filtro === 'activos') return 'Activos';
    if (filtro === 'inactivos') return 'Inactivos';
    return 'Estado';
  });

  // ── Filtrado local por texto y estado ──────────────────────────────────────
  readonly filteredUsuarios = computed(() => {
    const query = this.query().trim().toLowerCase();
    const filtro = this.filtroActivo();

    const filtered = this.usuarios().filter((usuario) => {
      // Filtro por estado
      const esActivo = usuario.estado === 'Activo';
      if (filtro === 'activos' && !esActivo) return false;
      if (filtro === 'inactivos' && esActivo) return false;

      // Filtro por texto
      if (!query) return true;

      return [
        usuario.nombres,
        usuario.apellidos,
        usuario.usuario,
        usuario.email,
        usuario.estado,
        this.resolveRoleNames(usuario.rolesids).join(' '),
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });

    return filtered.sort((a, b) => b.id - a.id);
  });

  readonly totalRegistros = computed(() => this.filteredUsuarios().length);

  readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.totalRegistros() / this.porPagina)),
  );

  readonly paginaActualNormalizada = computed(() =>
    Math.min(this.paginaActual(), this.totalPaginas()),
  );

  readonly usuariosPaginados = computed(() => {
    const inicio = (this.paginaActualNormalizada() - 1) * this.porPagina;
    return this.filteredUsuarios().slice(inicio, inicio + this.porPagina);
  });

  // ── Helpers de filtro ──────────────────────────────────────────────────────

  /** Convierte el enum interno al valor boolean que espera el backend. */
  private filtroToParam(filtro: FiltroEstado): boolean | null {
    if (filtro === 'activos') return true;
    if (filtro === 'inactivos') return false;
    return null;
  }

  /**
   * Cambia el filtro activo y recarga desde el backend.
   * Si se hace clic en el filtro ya activo, regresa a 'todos'.
   */
  filtrarPorEstado(tipo: FiltroEstado): void {
    const nuevo: FiltroEstado = this.filtroActivo() === tipo ? 'todos' : tipo;
    this.filtroActivo.set(nuevo);
    this.configuracionService.loadUsuarios(
      this.filtroToParam(nuevo),
      this.query() || undefined,
    );
  }

  // ── Control del dropdown Estado ────────────────────────────────────────────

  toggleEstadoDropdown(event?: Event): void {
    event?.stopPropagation();
    this.mostrarEstadoDropdown = !this.mostrarEstadoDropdown;
  }

  seleccionarEstado(estado: FiltroEstado): void {
    this.paginaActual.set(1);
    this.mostrarEstadoDropdown = false;
    this.filtrarPorEstado(estado);
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

  // ── Acciones sobre usuarios ────────────────────────────────────────────────

  obtenerAccionesUsuario(usuario: Usuario): ActionMenuItem[] {
    const activo = usuario.estado === 'Activo';

    return [
      {
        id: 'ver-mas',
        label: 'Ver más',
        action: () => this.viewUsuario(usuario),
      },
      {
        id: 'editar',
        label: 'Editar',
        action: () => this.editUsuario(usuario),
      },
      {
        id: activo ? 'inactivar' : 'activar',
        label: activo ? 'Inactivar' : 'Activar',
        danger: activo,
        action: () => this.toggleEstadoUsuario(usuario),
      },
    ];
  }

  resolveRoleNames(roleIds: string[]): string[] {
    const roles = this.roles();
    return roleIds.map(
      (roleId) =>
        roles.find((rol) => rol.id.toString() === roleId)?.nombre ?? roleId,
    );
  }

  displayRoleName(roleName: string): string {
    const normalized = roleName.trim().toUpperCase();

    if (normalized === 'COLABORADOR') {
      return 'Colaborador';
    }

    return roleName;
  }

  displayUsuarioNombre(usuario: Usuario): string {
    const nombreCompleto = [usuario.nombres, usuario.apellidos]
      .filter(Boolean)
      .join(' ')
      .trim();

    return nombreCompleto || 'Usuario externo';
  }

  descargarUsuariosExcel(): void {
    this.descargarXlsx(this.obtenerUsuariosExportables(), 'Usuarios');
  }

  descargarUsuariosPdf(): void {
    this.descargarPDF(this.obtenerUsuariosExportables(), 'Usuarios');
  }

  private obtenerUsuariosExportables(): Usuario[] {
    return this.filteredUsuarios();
  }

  private displayRolesUsuario(usuario: Usuario): string {
    const roles = this.resolveRoleNames(usuario.rolesids)
      .map((role) => this.displayRoleName(role))
      .filter(Boolean);

    return roles.length ? roles.join(', ') : '-';
  }

  private obtenerFilasExportacion(usuarios: Usuario[]): string[][] {
    return usuarios.map((usuario) => [
      usuario.usuario || '-',
      this.displayUsuarioNombre(usuario),
      usuario.email || '-',
      this.displayRolesUsuario(usuario),
      usuario.estado === 'Activo' ? 'Activo' : 'Inactivo',
    ]);
  }

  private async descargarXlsx(usuarios: Usuario[], nombreBase: string): Promise<void> {
    const { Workbook } = await import('exceljs');
    const workbook = new Workbook();

    const COLOR_PRIMARIO    = 'FF163572';
    const COLOR_RECURSO     = 'FFFFFFFF';
    const COLOR_RECURSO_ALT = 'FFF8FAFC';
    const COLOR_TEXTO       = 'FF334155';
    const COLOR_BORDE       = 'FFE2E8F0';

    const ws = workbook.addWorksheet('Usuarios');
    ws.columns = [
      { header: 'Usuario',            key: 'usuario', width: 25 },
      { header: 'Nombre',             key: 'nombre',  width: 40 },
      { header: 'Correo electrónico', key: 'correo',  width: 40 },
      { header: 'Roles',              key: 'roles',   width: 40 },
      { header: 'Estado',             key: 'estado',  width: 18 },
    ];

    usuarios.forEach(u => {
      ws.addRow({
        usuario: u.usuario || '-',
        nombre: this.displayUsuarioNombre(u),
        correo: u.email || '-',
        roles: this.displayRolesUsuario(u),
        estado: u.estado === 'Activo' ? 'Activo' : 'Inactivo',
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

        if (colNumber === 5) {
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
    this.crearDescarga(blob, `${nombreBase}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  private descargarPDF(usuarios: Usuario[], nombreBase: string): void {
    const doc      = new jsPDF({ orientation: 'landscape' });
    const fecha    = new Date().toLocaleDateString('es-EC');
    const pageW    = 297;
    const pageH    = 210;  // alto landscape en mm
    const marginX  = 12;
    const footerY  = pageH - 8; // coordenada fija para el pie

    // ── Helper: cabecera reutilizable ──
    const dibujarCabecera = () => {
      doc.setFillColor(22, 53, 114);
      doc.rect(0, 0, pageW, 22, 'F');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('Reporte de Usuarios', marginX, 14);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generado: ${fecha}`, pageW - marginX, 14, { align: 'right' });
      doc.setDrawColor(99, 135, 190);
      doc.setLineWidth(0.5);
      doc.line(0, 22, pageW, 22);
    };

    dibujarCabecera();

    // ── Subtítulo sección resumen ──
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 53, 114);
    doc.text('Listado de Usuarios', marginX, 32);
    doc.setDrawColor(22, 53, 114);
    doc.setLineWidth(0.3);
    doc.line(marginX, 34, marginX + 60, 34);

    // ── Tabla resumen ──
    autoTable(doc, {
      startY: 37,
      head: [['Usuario', 'Nombre', 'Correo electrónico', 'Roles', 'Estado']],
      body: this.obtenerFilasExportacion(usuarios),
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
        0: { cellWidth: 40 },
        1: { cellWidth: 60 },
        2: { cellWidth: 60 },
        3: { cellWidth: 85 },
        4: { cellWidth: 28,  halign: 'center' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          const val = String(data.cell.raw ?? '').toLowerCase();
          data.cell.styles.textColor = val === 'activo' ? [22, 163, 74] : [107, 114, 128];
          data.cell.styles.fontStyle = 'bold';
        }
      },
      margin: { left: marginX, right: marginX, bottom: 18 },
      didDrawPage: () => dibujarCabecera(),
    });

    // ── Pie de página en TODAS las páginas ──
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
      doc.text('TMR — Reporte de Usuarios', marginX, footerY + 4);
      doc.text(fecha, pageW - marginX, footerY + 4, { align: 'right' });
    }

    doc.save(`${nombreBase}_${new Date().toISOString().slice(0, 10)}.pdf`);
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

  openModal(usuario?: Usuario): void {
    if (usuario) {
      this.editUsuario(usuario);
      return;
    }

    this.openUsuarioModal();
  }

  editUsuario(usuario: Usuario): void {
    this.configuracionService.getUsuarioDetalle(usuario.id).subscribe({
      next: (detalle) => this.openUsuarioModal(detalle),
      error: (err) => console.error(err),
    });
  }

  private openUsuarioModal(usuario?: Usuario): void {
    const dialogRef = this.dialog.open<
      UsuariosFormModal,
      { usuario?: Usuario; roles: Rol[]; nextId: number },
      Usuario | string | boolean
    >(UsuariosFormModal, {
      data: {
        usuario,
        roles: this.roles(),
        nextId: this.configuracionService.nextId(this.usuarios()),
      },
      panelClass: ['tmr-dialog-panel', 'usuarios-dialog-panel'],
      width: '860px',
      maxWidth: 'calc(100vw - 48px)',
      maxHeight: '92vh',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) return;

      if (result === 'creado') {
        this.reloadUsuarios();
        this.mostrarExito('Usuario creado correctamente');
        return;
      }

      if (result === 'actualizado') {
        this.reloadUsuarios();
        this.mostrarExito('Usuario actualizado correctamente');
        return;
      }

      if (result !== true && typeof result === 'object') {
        const usuarioEditado = result as Usuario;
        this.configuracionService
          .updateUsuario(
            usuarioEditado.id,
            this.configuracionService.toUpdateUsuarioPayload(usuarioEditado),
          )
          .subscribe({
            next: () => {
              this.reloadUsuarios();
              this.mostrarExito('Usuario actualizado correctamente');
            },
            error: (err) => console.error(err),
          });
      }
    });
  }

  viewUsuario(usuario: Usuario): void {
    this.configuracionService.getUsuarioDetalle(usuario.id).subscribe({
      next: (detalle) => {
        this.dialog.open(UsuarioDetalleModal, {
          panelClass: ['tmr-dialog-panel', 'usuario-detalle-dialog-panel'],
          disableClose: true,
          data: { usuario: detalle },
        });
      },
      error: (err) => console.error('Error al cargar detalle de usuario:', err),
    });
  }

  toggleEstadoUsuario(usuario: Usuario): void {
    const filtroParam = this.filtroToParam(this.filtroActivo());

    if (usuario.estado === 'Activo') {
      this.configuracionService.deleteUsuario(usuario.id, filtroParam);
      return;
    }

    this.configuracionService.setUsuarioEstado(usuario.id, true, filtroParam).subscribe({
      next: () => this.mostrarExito('Estado del usuario actualizado correctamente'),
      error: (err) => console.error(err),
    });
  }

  cerrarExito(): void {
    this.exitoVisible.set(false);
  }

  private mostrarExito(mensaje: string): void {
    this.exitoMensaje.set(mensaje);
    this.exitoVisible.set(true);
    setTimeout(() => this.exitoVisible.set(false), 3000);
  }

  private reloadUsuarios(): void {
    this.configuracionService.loadUsuarios(
      this.filtroToParam(this.filtroActivo()),
      this.query() || undefined,
    );
    this.configuracionService.loadUsuariosTotales();
  }
}
