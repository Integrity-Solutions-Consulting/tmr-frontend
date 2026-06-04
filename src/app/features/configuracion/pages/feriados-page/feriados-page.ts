import { Component, computed, inject } from '@angular/core';
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

  // TODO: cuando exista backend, reemplazar por GET /api/feriados
  readonly nacionales    = computed(() => this.feriados().filter((f) => f.tipo === 'Nacional').length);
  readonly locales       = computed(() => this.feriados().filter((f) => f.tipo === 'Local').length);
  readonly institucionales = computed(() => this.feriados().filter((f) => f.tipo === 'Institucional').length);
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

  // TODO: conectar con PATCH /api/feriados/{id}/estado cuando exista backend
  toggleEstado(feriado: Feriado): void {
    this.configuracionService.setFeriadoEstado(feriado.id, !feriado.activo);
  }

  openModalForDate(fecha: string): void {
    this.openModal(undefined, 'create', fecha);
  }
}
