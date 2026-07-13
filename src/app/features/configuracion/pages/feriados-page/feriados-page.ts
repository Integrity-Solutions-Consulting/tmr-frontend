import { Component, computed, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Boton } from '../../../../shared/components/boton/boton';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { SuccessModalComponent } from '../../../../shared/components/success-modal/success-modal.component';
import { FeriadosCalendar } from '../../components/feriados-calendar/feriados-calendar';
import { FeriadosFormModal, FeriadoModalData } from '../../components/feriados-form-modal/feriados-form-modal';
import { Feriado } from '../../models/configuracion.models';
import { ConfiguracionService } from '../../services/configuracion.service';

@Component({
  selector: 'app-feriados-page',
  imports: [Boton, FeriadosCalendar, ConfirmDialogComponent, SuccessModalComponent],
  templateUrl: './feriados-page.html',
  styleUrl: './feriados-page.scss',
})
export class FeriadosPage {
  private readonly configuracionService = inject(ConfiguracionService);
  private readonly dialog = inject(MatDialog);

  readonly feriados = this.configuracionService.feriados;
  readonly eliminarError = signal<string | null>(null);

  // ── Confirm dialog ────────────────────────────────────────────
  readonly confirmVisible = signal(false);
  readonly confirmMensaje = signal('');
  private feriadoPendienteEliminar: Feriado | null = null;

  // ── Success modal ─────────────────────────────────────────────
  readonly exitoVisible = signal(false);
  readonly exitoMensaje = signal('Operación realizada exitosamente');

  readonly nacionales    = computed(() => this.feriados().filter((f) => f.tipo === 'Nacional').length);
  readonly locales       = computed(() => this.feriados().filter((f) => f.tipo === 'Local').length);
  readonly religiosos    = computed(() => this.feriados().filter((f) => String(f.tipo) === 'Religioso').length);
  readonly activos       = computed(() => this.feriados().filter((f) => f.activo).length);

  openModal(feriado?: Feriado, mode: 'create' | 'edit' | 'view' = 'create', fecha?: string): void {
    const data: FeriadoModalData = {
      feriado,
      feriados: this.feriados(),
      nextId: this.configuracionService.nextId(this.feriados()),
      fecha,
      mode: feriado ? mode : 'create',
    };

    const dialogRef = this.dialog.open<FeriadosFormModal, FeriadoModalData, Feriado>(
      FeriadosFormModal,
      { data, panelClass: 'tmr-dialog-panel', disableClose: true },
    );

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const esNuevo = !this.feriados().some((f) => f.id === result.id);
        this.configuracionService.upsertFeriado(result);
        this.mostrarExito(
          esNuevo ? 'Feriado agregado correctamente' : 'Feriado actualizado correctamente',
        );
      }
    });
  }

  viewFeriado(feriado: Feriado): void {
    this.openModal(feriado, 'view');
  }

  editFeriado(feriado: Feriado): void {
    this.openModal(feriado, 'edit');
  }

  /** Muestra el ConfirmDialog antes de eliminar (reemplaza window.confirm). */
  toggleEstado(feriado: Feriado): void {
    this.feriadoPendienteEliminar = feriado;
    this.confirmMensaje.set(`¿Desea eliminar el feriado "${feriado.nombre}"? Esta acción no se puede deshacer.`);
    this.confirmVisible.set(true);
  }

  /** El usuario confirmó la eliminación. */
  onConfirmarEliminar(): void {
    this.confirmVisible.set(false);
    const feriado = this.feriadoPendienteEliminar;
    this.feriadoPendienteEliminar = null;
    if (!feriado) return;

    this.eliminarError.set(null);
    this.configuracionService.deleteFeriado(feriado.id).subscribe({
      next: () => this.mostrarExito('Feriado eliminado correctamente'),
      error: (err) => this.eliminarError.set(this.extractDeleteError(err)),
    });
  }

  /** El usuario canceló. */
  onCancelarEliminar(): void {
    this.confirmVisible.set(false);
    this.feriadoPendienteEliminar = null;
  }

  openModalForDate(fecha: string): void {
    this.openModal(undefined, 'create', fecha);
  }

  cerrarExito(): void {
    this.exitoVisible.set(false);
  }

  private mostrarExito(mensaje: string): void {
    this.exitoMensaje.set(mensaje);
    this.exitoVisible.set(true);
    setTimeout(() => this.exitoVisible.set(false), 3000);
  }

  private extractDeleteError(err: unknown): string {
    const error = (err as { error?: unknown })?.error;

    if (typeof error === 'string') {
      return error;
    }

    const body = error as { message?: string; mensaje?: string; error?: string; title?: string } | undefined;
    return body?.message
      ?? body?.mensaje
      ?? body?.error
      ?? body?.title
      ?? 'No se pudo eliminar el feriado. Intente nuevamente.';
  }
}
