import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NotificacionToastService } from '../../../../shared/services/notificacion-toast.service';
import {
  DatosFormularioOficial,
  FormularioPermisoOficialComponent,
} from '../formulario-permiso-oficial/formulario-permiso-oficial';

@Component({
  selector: 'app-revision-externa',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, FormularioPermisoOficialComponent],
  templateUrl: './revision-externa.html',
  styleUrl: './revision-externa.scss',
})
export class RevisionExternaComponent {
  private readonly toast = inject(NotificacionToastService);

  readonly observacionLider = signal('Confirmado. Las entregas del proyecto quedan coordinadas.');
  readonly procesado = signal<'pendiente' | 'confirmado' | 'rechazado'>('pendiente');

  readonly datosFormulario = computed<DatosFormularioOficial>(() => {
    const aprobado = this.procesado() === 'confirmado';
    return {
      folio: 'PER-2026-005',
      diaSolicitud: '30',
      mesSolicitud: '10',
      anioSolicitud: '2026',
      apellidosNombres: 'Erazo Allan',
      numeroCedula: '1723456789',
      cargo: 'Desarrollador Fullstack',
      cliente: 'Banco del Pacífico (Core Bancario BDP)',
      jefeInmediato: 'Ing. Roberto Gómez',
      tipoPermiso: 'VACACIONES',
      motivos:
        'Solicitud de 5 días de vacaciones anuales correspondientes al periodo vigente. Las entregas del sprint quedan cubiertas antes del viernes 06/11.',
      fechaInicio: '09/11/2026',
      fechaFinalizacion: '13/11/2026',
      fechaRegreso: '16/11/2026',
      fechaAprobacion: aprobado ? '30/10/2026' : 'Pendiente',
      diasSolicitados: '5 días laborables',
      horario: 'COMPLETA',
      detalleHorario: 'Jornada completa',
      horasSolicitadas: '40 horas',
      aprobacionLider: {
        aprobado,
        responsable: 'Ing. Roberto Gómez',
        metodo: 'Magic Link Externo',
        fecha: aprobado ? '30/10/2026' : undefined,
      },
      aprobacionTalentoHumano: {
        aprobado: false,
        responsable: 'Talento Humano ISC',
      },
      comentarios: this.observacionLider(),
    };
  });

  confirmarExterno(): void {
    this.procesado.set('confirmado');
    this.toast.exito(
      'Solicitud aprobada vía Magic Link (Prototipo)',
      'Se actualizó automáticamente el documento PDF oficial y se notificó a Talento Humano y al colaborador vía Apprise.',
    );
  }

  rechazarExterno(): void {
    this.procesado.set('rechazado');
    this.toast.error(
      'Solicitud rechazada por Líder Externo (Prototipo)',
      'Se notificó al colaborador y a Talento Humano mediante Apprise.',
    );
  }
}
