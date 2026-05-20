import { Component, computed, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Boton } from '../../../../shared/components/boton/boton';
import { DetailModal, DetailModalData } from '../../../../shared/components/detail-modal/detail-modal';
import { FeriadosCalendar } from '../../components/feriados-calendar/feriados-calendar';
import { FeriadosFormModal } from '../../components/feriados-form-modal/feriados-form-modal';
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

  readonly nacionales = computed(() => this.feriados().filter((feriado) => feriado.tipo === 'Nacional').length);
  readonly locales = computed(() => this.feriados().filter((feriado) => feriado.tipo === 'Local').length);
  readonly religiosos = computed(() => this.feriados().filter((feriado) => feriado.tipo === 'Religioso').length);

  openModal(feriado?: Feriado, fecha?: string): void {
    const dialogRef = this.dialog.open<FeriadosFormModal, { feriado?: Feriado; nextId: number; fecha?: string }, Feriado>(
      FeriadosFormModal,
      {
        data: { feriado, fecha, nextId: this.configuracionService.nextId(this.feriados()) },
        panelClass: 'tmr-dialog-panel',
      },
    );

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.configuracionService.upsertFeriado(result);
      }
    });
  }

  viewFeriado(feriado: Feriado): void {
    this.dialog.open<DetailModal, DetailModalData>(DetailModal, {
      panelClass: 'tmr-dialog-panel',
      data: {
        title: feriado.nombre,
        subtitle: 'Detalle del feriado configurado.',
        fields: [
          { label: 'Tipo', value: feriado.tipo },
          { label: 'Fecha', value: new Intl.DateTimeFormat('es-EC').format(new Date(`${feriado.fecha}T00:00:00`)) },
        ],
      },
    });
  }

  deleteFeriado(feriado: Feriado): void {
    this.configuracionService.deleteFeriado(feriado.id);
  }

  openModalForDate(fecha: string): void {
    this.openModal(undefined, fecha);
  }
}
