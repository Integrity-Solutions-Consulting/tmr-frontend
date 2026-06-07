import { Component, computed, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Boton } from '../../../../shared/components/boton/boton';
import { FeriadosCalendar } from '../../components/feriados-calendar/feriados-calendar';
import { FeriadosFormModal, FeriadoModalData } from '../../components/feriados-form-modal/feriados-form-modal';
import { Feriado } from '../../models/configuracion.models';
import { ConfiguracionService } from '../../services/configuracion.service';

@Component({
  selector: 'app-feriados-page',
  imports: [Boton, FeriadosCalendar],
  templateUrl: './feriados-page.html',
  styleUrl: './feriados-page.scss',
})
export class FeriadosPage {
  private readonly configuracionService = inject(ConfiguracionService);
  private readonly dialog = inject(MatDialog);

  readonly feriados = this.configuracionService.feriados;
  readonly eliminarError = signal<string | null>(null);

  readonly nacionales    = computed(() => this.feriados().filter((f) => f.tipo === 'Nacional').length);
  readonly locales       = computed(() => this.feriados().filter((f) => f.tipo === 'Local').length);
  readonly religiosos = computed(() => this.feriados().filter((f) => String(f.tipo) === 'Religioso').length);
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
      { data, panelClass: 'tmr-dialog-panel' },
    );

    // TODO: conectar con POST /api/feriados o PUT /api/feriados/{id} según mode
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.configuracionService.upsertFeriado(result);
      }
    });
  }

  viewFeriado(feriado: Feriado): void {
    this.openModal(feriado, 'view');
  }

  editFeriado(feriado: Feriado): void {
    this.openModal(feriado, 'edit');
  }

  toggleEstado(feriado: Feriado): void {
    const confirmado = window.confirm(`¿Desea eliminar el feriado "${feriado.nombre}"?`);
    if (!confirmado) {
      return;
    }

    this.eliminarError.set(null);
    this.configuracionService.deleteFeriado(feriado.id).subscribe({
      error: (err) => this.eliminarError.set(this.extractDeleteError(err)),
    });
  }

  openModalForDate(fecha: string): void {
    this.openModal(undefined, 'create', fecha);
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
