import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { TarjetaResumenComponent } from '../../../../shared/components/tarjeta-resumen/tarjeta-resumen.component';
import { ModalBase } from '../../../../shared/components/modal-base/modal-base';
import { NotificacionToastService } from '../../../../shared/services/notificacion-toast.service';
import {
  DatosFormularioOficial,
  FormularioPermisoOficialComponent,
  HorarioPermisoOficial,
  TipoPermisoOficial,
} from '../formulario-permiso-oficial/formulario-permiso-oficial';
import {
  calcularRangoPreset,
  cumpleRangoFechas,
  PeriodoPreset,
} from '../filtro-fechas.util';

export interface SolicitudEquipoMock {
  codigo: string;
  colaborador: string;
  cedula: string;
  cargo: string;
  cliente: string;
  proyecto: string;
  tipo: string;
  tipoOficial: TipoPermisoOficial;
  motivo: string;
  fechas: string;
  fechaInicio: string;
  fechaFin: string;
  fechaRegreso: string;
  diasSolicitados: string;
  horario: HorarioPermisoOficial;
  horasSolicitadas: string;
  duracion: string;
  evidencia: string | null;
  traslapeAlerta: string | null;
  estado: 'Pendiente' | 'Aprobado' | 'Rechazado';
}

@Component({
  selector: 'app-aprobaciones-lider',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HeaderComponent,
    TarjetaResumenComponent,
    ModalBase,
    FormularioPermisoOficialComponent,
  ],
  templateUrl: './aprobaciones-lider.html',
  styleUrl: './aprobaciones-lider.scss',
})
export class AprobacionesLiderComponent {
  private readonly toast = inject(NotificacionToastService);

  readonly busqueda = signal('');
  readonly periodoPreset = signal<PeriodoPreset>('TODOS');
  readonly fechaDesde = signal('');
  readonly fechaHasta = signal('');
  readonly proyectoFiltro = signal('');
  readonly modalRevisorVisible = signal(false);
  readonly solicitudActiva = signal<SolicitudEquipoMock | null>(null);
  readonly comentarioLider = signal('Aprobado. Las tareas del sprint quedan cubiertas por el equipo.');

  readonly solicitudesEquipo = signal<SolicitudEquipoMock[]>([
    {
      codigo: 'PER-2026-006',
      colaborador: 'Flores Jonathan',
      cedula: '1719283746',
      cargo: 'Desarrollador Fullstack',
      cliente: 'Integrity Solutions',
      proyecto: 'Portal Web ISC',
      tipo: 'Vacaciones',
      tipoOficial: 'VACACIONES',
      motivo: 'Vacaciones anuales programadas con el equipo de desarrollo.',
      fechas: '04/11/2026 - 06/11/2026',
      fechaInicio: '04/11/2026',
      fechaFin: '06/11/2026',
      fechaRegreso: '09/11/2026',
      diasSolicitados: '3 días laborables',
      horario: 'COMPLETA',
      horasSolicitadas: '24 horas',
      duracion: '3 días laborables (24 h)',
      evidencia: null,
      traslapeAlerta: 'Coincide el 05/11 con ausencia aprobada de Silvia Pazmiño en Portal Web ISC',
      estado: 'Pendiente',
    },
    {
      codigo: 'PER-2026-007',
      colaborador: 'Paredes Harold',
      cedula: '1720918273',
      cargo: 'Desarrollador Backend',
      cliente: 'Integrity Solutions',
      proyecto: 'Migración Microservicios',
      tipo: 'Fallecimiento de un familiar',
      tipoOficial: 'FALLECIMIENTO_FAMILIAR',
      motivo: 'Licencia por fallecimiento de familiar cercano.',
      fechas: '30/10/2026 - 31/10/2026',
      fechaInicio: '30/10/2026',
      fechaFin: '31/10/2026',
      fechaRegreso: '04/11/2026',
      diasSolicitados: '2 días laborables',
      horario: 'COMPLETA',
      horasSolicitadas: '16 horas',
      duracion: '2 días laborables (16 h)',
      evidencia: 'justificante_calamidad.pdf',
      traslapeAlerta: null,
      estado: 'Pendiente',
    },
    {
      codigo: 'PER-2026-004',
      colaborador: 'Erazo Allan',
      cedula: '1723456789',
      cargo: 'Desarrollador Fullstack',
      cliente: 'Integrity Solutions',
      proyecto: 'Portal Web ISC',
      tipo: 'Licencia por enfermedad',
      tipoOficial: 'LICENCIA_ENFERMEDAD',
      motivo: 'Cita odontológica e indicación de reposo médico por 48 horas.',
      fechas: '02/11/2026 - 03/11/2026',
      fechaInicio: '02/11/2026',
      fechaFin: '03/11/2026',
      fechaRegreso: '04/11/2026',
      diasSolicitados: '2 días laborables',
      horario: 'COMPLETA',
      horasSolicitadas: '16 horas',
      duracion: '2 días laborables (16 h)',
      evidencia: 'certificado_iess.pdf',
      traslapeAlerta: null,
      estado: 'Aprobado',
    },
  ]);

  readonly solicitudesFiltradas = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    const desde = this.fechaDesde();
    const hasta = this.fechaHasta();
    const proy = this.proyectoFiltro();

    return this.solicitudesEquipo().filter(s => {
      if (!cumpleRangoFechas(s.fechaInicio, s.fechaFin, desde, hasta)) return false;
      if (proy && s.proyecto !== proy) return false;
      if (
        q &&
        !s.colaborador.toLowerCase().includes(q) &&
        !s.codigo.toLowerCase().includes(q) &&
        !s.tipo.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  });

  cambiarPresetPeriodo(preset: PeriodoPreset): void {
    this.periodoPreset.set(preset);
    if (preset !== 'PERSONALIZADO') {
      const rango = calcularRangoPreset(preset);
      this.fechaDesde.set(rango.desde);
      this.fechaHasta.set(rango.hasta);
    }
  }

  cambiarFechaDesde(valor: string): void {
    this.fechaDesde.set(valor);
    if (this.fechaHasta() && valor && valor > this.fechaHasta()) {
      this.fechaHasta.set(valor);
    }
    this.periodoPreset.set(!valor && !this.fechaHasta() ? 'TODOS' : 'PERSONALIZADO');
  }

  cambiarFechaHasta(valor: string): void {
    this.fechaHasta.set(valor);
    if (this.fechaDesde() && valor && valor < this.fechaDesde()) {
      this.fechaDesde.set(valor);
    }
    this.periodoPreset.set(!this.fechaDesde() && !valor ? 'TODOS' : 'PERSONALIZADO');
  }

  abrirRevision(item: SolicitudEquipoMock): void {
    this.solicitudActiva.set(item);
    this.modalRevisorVisible.set(true);
  }

  obtenerDatosFormulario(item: SolicitudEquipoMock): DatosFormularioOficial {
    const aprobadaPorLider = item.estado === 'Aprobado';
    return {
      folio: item.codigo,
      diaSolicitud: '30',
      mesSolicitud: '10',
      anioSolicitud: '2026',
      apellidosNombres: item.colaborador,
      numeroCedula: item.cedula,
      cargo: item.cargo,
      cliente: `${item.cliente} (${item.proyecto})`,
      jefeInmediato: 'Ing. Carlos Méndez',
      tipoPermiso: item.tipoOficial,
      motivos: item.motivo,
      evidenciaNombre: item.evidencia ?? undefined,
      fechaInicio: item.fechaInicio,
      fechaFinalizacion: item.fechaFin,
      fechaRegreso: item.fechaRegreso,
      fechaAprobacion: aprobadaPorLider ? '30/10/2026' : 'Pendiente',
      diasSolicitados: item.diasSolicitados,
      horario: item.horario,
      horasSolicitadas: item.horasSolicitadas,
      aprobacionLider: {
        aprobado: aprobadaPorLider,
        responsable: 'Ing. Carlos Méndez',
        metodo: 'Cuenta TMR Líder',
        fecha: aprobadaPorLider ? '30/10/2026' : undefined,
      },
      aprobacionTalentoHumano: {
        aprobado: false,
        responsable: 'Talento Humano ISC',
      },
      comentarios: this.comentarioLider(),
    };
  }

  simularDecisionLider(accion: 'aprobar' | 'observar' | 'rechazar'): void {
    const actual = this.solicitudActiva();
    if (!actual) return;

    if (accion === 'aprobar') {
      this.solicitudesEquipo.update(lista =>
        lista.map(s => (s.codigo === actual.codigo ? { ...s, estado: 'Aprobado' } : s))
      );
      this.modalRevisorVisible.set(false);
      this.toast.exito(
        `Solicitud ${actual.codigo} aprobada desde tu cuenta (Prototipo)`,
        'Se actualizó el documento PDF oficial y Apprise notificó a Talento Humano y al colaborador.',
      );
      return;
    }

    this.modalRevisorVisible.set(false);
    if (accion === 'observar') {
      this.toast.exito(
        `Solicitud ${actual.codigo} observada (Prototipo)`,
        'El colaborador recibió un aviso vía Apprise para subsanar la solicitud.',
      );
      return;
    }

    this.toast.error(
      `Solicitud ${actual.codigo} rechazada (Prototipo)`,
      'Se registró el motivo de rechazo y se notificó al colaborador por Apprise.',
    );
  }
}
