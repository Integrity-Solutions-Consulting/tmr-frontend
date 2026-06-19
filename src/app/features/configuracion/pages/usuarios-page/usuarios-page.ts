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
    void this.descargarXlsx(this.obtenerUsuariosExportables());
  }

  descargarUsuariosPdf(): void {
    void this.descargarPDF(this.obtenerUsuariosExportables());
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

  private async descargarXlsx(usuarios: Usuario[]): Promise<void> {
    const { Workbook } = await import('exceljs');
    const workbook = new Workbook();
    const fechaArchivo = this.obtenerFechaArchivo();
    const fechaGeneracion = this.formatearFechaReporte(new Date());

    const COLOR_CABECERA    = 'FF1F497D';
    const COLOR_PRIMARIO    = 'FF163572';
    const COLOR_RECURSO     = 'FFFFFFFF';
    const COLOR_RECURSO_ALT = 'FFF8FAFC';
    const COLOR_TEXTO       = 'FF334155';
    const COLOR_BORDE       = 'FFE2E8F0';

    const ws = workbook.addWorksheet('Usuarios');
    ws.columns = [
      { key: 'usuario', width: 20 },
      { key: 'nombre',  width: 30 },
      { key: 'correo',  width: 36 },
      { key: 'roles',   width: 30 },
      { key: 'estado',  width: 14 },
    ];

    ws.addRow([]);
    ws.addRow([]);
    ws.addRow(['Usuario', 'Nombre', 'Correo electrónico', 'Roles', 'Estado']);

    usuarios.forEach((usuario) => {
      ws.addRow({
        usuario: usuario.usuario || '-',
        nombre: this.displayUsuarioNombre(usuario),
        correo: usuario.email || '-',
        roles: this.displayRolesUsuario(usuario),
        estado: usuario.estado === 'Activo' ? 'Activo' : 'Inactivo',
      });
    });

    ws.mergeCells('C1:E1');
    ws.mergeCells('C2:E2');

    for (let rowNumber = 1; rowNumber <= 2; rowNumber++) {
      const row = ws.getRow(rowNumber);
      row.height = rowNumber === 1 ? 79.25 : 28.25;
      for (let colNumber = 1; colNumber <= 5; colNumber++) {
        const cell = row.getCell(colNumber);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_CABECERA } };
        cell.border = rowNumber === 2
          ? { bottom: { style: 'thin', color: { argb: COLOR_PRIMARIO } } }
          : {};
      }
    }

    const titulo = ws.getCell('C1');
    titulo.value = 'Reporte de Usuarios';
    titulo.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titulo.alignment = { vertical: 'middle', horizontal: 'center' };

    const fecha = ws.getCell('C2');
    fecha.value = `Generado: ${fechaGeneracion}`;
    fecha.font = { name: 'Calibri', size: 10, color: { argb: 'FFFFFFFF' } };
    fecha.alignment = { vertical: 'middle', horizontal: 'right' };

    const logoBase64 = await this.obtenerLogoReporte();
    if (logoBase64) {
      const logoId = workbook.addImage({ base64: logoBase64, extension: 'png' });
      ws.addImage(logoId, {
        tl: { col: 0.15, row: 0.12 },
        ext: { width: 172, height: 55 },
      });
    }

    const header = ws.getRow(3);
    header.height = 18;
    header.eachCell((cell: any) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_PRIMARIO } };
      cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      const border = { style: 'thin', color: { argb: COLOR_PRIMARIO } };
      cell.border = { top: border, left: border, bottom: border, right: border };
    });

    ws.eachRow((row: any, rowNumber: number) => {
      if (rowNumber <= 3) return;
      const fill = rowNumber % 2 === 0 ? COLOR_RECURSO_ALT : COLOR_RECURSO;
      row.height = 18;
      row.eachCell((cell: any, colNumber: number) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
        cell.font = { name: 'Segoe UI', size: 10, color: { argb: COLOR_TEXTO } };
        const border = { style: 'thin', color: { argb: COLOR_BORDE } };
        cell.border = { top: border, left: border, bottom: border, right: border };
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

        if (colNumber === 5) {
          const esActivo = String(cell.value ?? '').toLowerCase() === 'activo';
          cell.font = {
            name: 'Segoe UI',
            size: 10,
            bold: true,
            color: { argb: esActivo ? 'FF16A34A' : 'FF6B7280' },
          };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
      });
    });

    this.ajustarAnchosColumnas(ws, 3);
    ws.views = [{ state: 'frozen', ySplit: 3 }];
    ws.autoFilter = {
      from: { row: 3, column: 1 },
      to: { row: 3, column: 5 },
    };
    ws.pageSetup = {
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      printTitlesRow: '1:3',
      margins: {
        left: 0.35,
        right: 0.35,
        top: 0.5,
        bottom: 0.5,
        header: 0.2,
        footer: 0.2,
      },
    };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    this.crearDescarga(blob, `Reporte_Usuarios_${fechaArchivo}.xlsx`);
  }

  private async descargarPDF(usuarios: Usuario[]): Promise<void> {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const fecha = this.formatearFechaReporte(new Date());
    const fechaArchivo = this.obtenerFechaArchivo();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginX = 10;
    const footerY = pageH - 8;
    const logoBase64 = await this.obtenerLogoReporte();

    const dibujarCabecera = () => {
      doc.setFillColor(31, 73, 125);
      doc.rect(0, 0, pageW, 36, 'F');
      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', marginX, 6, 50, 15);
      }
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('Reporte de Usuarios', pageW * 0.7, 17, { align: 'center' });
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generado: ${fecha}`, pageW - marginX, 29, { align: 'right' });
      doc.setDrawColor(22, 53, 114);
      doc.setLineWidth(0.4);
      doc.line(0, 36, pageW, 36);
    };

    dibujarCabecera();

    autoTable(doc, {
      startY: 36,
      head: [['Usuario', 'Nombre', 'Correo electrónico', 'Roles', 'Estado']],
      body: this.obtenerFilasExportacion(usuarios),
      styles: {
        fontSize: 7.5,
        cellPadding: { top: 2.4, bottom: 2.4, left: 2, right: 2 },
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
        cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
      },
      bodyStyles: { textColor: [51, 65, 85] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 29 },
        1: { cellWidth: 38 },
        2: { cellWidth: 47 },
        3: { cellWidth: 55 },
        4: { cellWidth: 26, halign: 'center' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          const esActivo = String(data.cell.raw ?? '').toLowerCase() === 'activo';
          data.cell.styles.textColor = esActivo ? [22, 163, 74] : [107, 114, 128];
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
      doc.text('TMR - Reporte de Usuarios', marginX, footerY + 4);
      doc.text(fecha, pageW - marginX, footerY + 4, { align: 'right' });
    }

    doc.save(`Reporte_Usuarios_${fechaArchivo}.pdf`);
  }

  private ajustarAnchosColumnas(ws: any, filaEncabezados: number): void {
    ws.columns.forEach((column: any) => {
      let longitudMaxima = 0;
      column.eachCell({ includeEmpty: false }, (cell: any, rowNumber: number) => {
        if (rowNumber < filaEncabezados) return;
        longitudMaxima = Math.max(longitudMaxima, String(cell.value ?? '').length);
      });
      column.width = Math.min(50, Math.max(column.width ?? 10, longitudMaxima + 3));
    });
  }

  private obtenerFechaArchivo(fecha = new Date()): string {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatearFechaReporte(fecha: Date): string {
    return fecha.toLocaleDateString('es-EC', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  private async obtenerLogoReporte(): Promise<string | null> {
    try {
      const response = await fetch('assets/img/logo-reporte-integrity.png');
      if (!response.ok) return null;
      const blob = await response.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
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
