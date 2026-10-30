import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
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

export interface SolicitudColaboradorMock {
  codigo: string;
  tipo: string;
  tipoOficial: TipoPermisoOficial;
  motivo: string;
  fechas: string;
  fechaInicio: string;
  fechaFin: string;
  fechaRegreso: string;
  fechaAprobacion: string;
  diasSolicitados: string;
  horario: HorarioPermisoOficial;
  detalleHorario?: string;
  horasSolicitadas: string;
  duracion: string;
  cliente: string;
  proyecto: string;
  lider: string;
  tipoLider: 'INT' | 'EXT';
  evidencia: string | null;
  aprobadoLider: boolean;
  confirmadoRrhh: boolean;
  estadoClase: 'pendiente' | 'rrhh' | 'confirmado' | 'rechazado';
  estadoTexto: string;
  comentarios?: string;
}

@Component({
  selector: 'app-mis-permisos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    HeaderComponent,
    TarjetaResumenComponent,
    ModalBase,
    FormularioPermisoOficialComponent,
  ],
  templateUrl: './mis-permisos.html',
  styleUrl: './mis-permisos.scss',
})
export class MisPermisosComponent {
  private readonly toast = inject(NotificacionToastService);

  readonly busqueda = signal('');
  readonly periodoPreset = signal<PeriodoPreset>('TODOS');
  readonly fechaDesde = signal('');
  readonly fechaHasta = signal('');
  readonly tipoFiltro = signal('');
  readonly estadoFiltro = signal('');

  readonly modalNuevaVisible = signal(false);
  readonly modalFormularioVisible = signal(false);
  readonly solicitudSeleccionada = signal<SolicitudColaboradorMock | null>(null);

  readonly tipoSeleccionado = signal<TipoPermisoOficial>('VACACIONES');
  readonly horarioSeleccionado = signal<HorarioPermisoOficial>('COMPLETA');

  readonly solicitudes = signal<SolicitudColaboradorMock[]>([
    {
      codigo: 'PER-2026-005',
      tipo: 'Vacaciones',
      tipoOficial: 'VACACIONES',
      motivo: 'Vacaciones programadas noviembre. Actividades del sprint coordinadas con el equipo.',
      fechas: '09/11/2026 - 13/11/2026',
      fechaInicio: '09/11/2026',
      fechaFin: '13/11/2026',
      fechaRegreso: '16/11/2026',
      fechaAprobacion: 'Pendiente',
      diasSolicitados: '5 días laborables',
      horario: 'COMPLETA',
      detalleHorario: 'Jornada completa (08:30 - 17:30)',
      horasSolicitadas: '40 horas',
      duracion: '5 días laborables (40 h)',
      cliente: 'Banco del Pacífico',
      proyecto: 'Core Bancario BDP',
      lider: 'Ing. Roberto Gómez',
      tipoLider: 'EXT',
      evidencia: null,
      aprobadoLider: false,
      confirmadoRrhh: false,
      estadoClase: 'pendiente',
      estadoTexto: 'Pendiente Jefe',
      comentarios: 'En espera de confirmación del Jefe Inmediato vía Magic Link.',
    },
    {
      codigo: 'PER-2026-004',
      tipo: 'Licencia por enfermedad',
      tipoOficial: 'LICENCIA_ENFERMEDAD',
      motivo: 'Cita odontológica e indicación de reposo médico por 48 horas.',
      fechas: '02/11/2026 - 03/11/2026',
      fechaInicio: '02/11/2026',
      fechaFin: '03/11/2026',
      fechaRegreso: '04/11/2026',
      fechaAprobacion: '01/11/2026',
      diasSolicitados: '2 días laborables',
      horario: 'COMPLETA',
      detalleHorario: 'Jornada completa',
      horasSolicitadas: '16 horas',
      duracion: '2 días laborables (16 h)',
      cliente: 'Integrity Solutions',
      proyecto: 'Portal Web ISC',
      lider: 'Ing. Carlos Méndez',
      tipoLider: 'INT',
      evidencia: 'certificado_iess.pdf',
      aprobadoLider: true,
      confirmadoRrhh: false,
      estadoClase: 'rrhh',
      estadoTexto: 'En Talento Humano',
      comentarios: 'Aprobado desde cuenta de Jefe Inmediato. Adjunta certificado médico IESS.',
    },
    {
      codigo: 'PER-2026-001',
      tipo: 'Citas médicas',
      tipoOficial: 'CITAS_MEDICAS',
      motivo: 'Control médico especializado y exámenes de laboratorio en la mañana.',
      fechas: '15/10/2026 (08:30 - 12:30)',
      fechaInicio: '15/10/2026',
      fechaFin: '15/10/2026',
      fechaRegreso: '15/10/2026 (13:30)',
      fechaAprobacion: '14/10/2026',
      diasSolicitados: '0.5 días',
      horario: 'MANANA',
      detalleHorario: '08:30 - 12:30',
      horasSolicitadas: '4 horas',
      duracion: '0.5 días (4 horas)',
      cliente: 'Integrity Solutions',
      proyecto: 'Portal Web ISC',
      lider: 'Ing. Carlos Méndez',
      tipoLider: 'INT',
      evidencia: 'constancia_cita_medica.pdf',
      aprobadoLider: true,
      confirmadoRrhh: true,
      estadoClase: 'confirmado',
      estadoTexto: 'Confirmado',
      comentarios: 'Solicitud aprobada por Jefe Inmediato y confirmada por Talento Humano. PDF generado.',
    },
  ]);

  readonly solicitudesFiltradas = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    const desde = this.fechaDesde();
    const hasta = this.fechaHasta();
    const tipo = this.tipoFiltro();
    const estado = this.estadoFiltro();

    return this.solicitudes().filter(s => {
      if (!cumpleRangoFechas(s.fechaInicio, s.fechaFin, desde, hasta)) return false;
      if (tipo && s.tipoOficial !== tipo) return false;
      if (estado && s.estadoClase !== estado) return false;
      if (
        q &&
        !s.codigo.toLowerCase().includes(q) &&
        !s.cliente.toLowerCase().includes(q) &&
        !s.tipo.toLowerCase().includes(q) &&
        !s.lider.toLowerCase().includes(q)
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

  abrirNuevaSolicitud(): void {
    this.modalNuevaVisible.set(true);
  }

  verFormulario(item: SolicitudColaboradorMock): void {
    this.solicitudSeleccionada.set(item);
    this.modalFormularioVisible.set(true);
  }

  obtenerDatosFormulario(item: SolicitudColaboradorMock): DatosFormularioOficial {
    return {
      folio: item.codigo,
      diaSolicitud: '30',
      mesSolicitud: '10',
      anioSolicitud: '2026',
      apellidosNombres: 'Erazo Allan',
      numeroCedula: '1723456789',
      cargo: 'Desarrollador Fullstack',
      cliente: item.cliente,
      jefeInmediato: item.lider,
      tipoPermiso: item.tipoOficial,
      motivos: item.motivo,
      evidenciaNombre: item.evidencia ?? undefined,
      fechaInicio: item.fechaInicio,
      fechaFinalizacion: item.fechaFin,
      fechaRegreso: item.fechaRegreso,
      fechaAprobacion: item.fechaAprobacion,
      diasSolicitados: item.diasSolicitados,
      horario: item.horario,
      detalleHorario: item.detalleHorario,
      horasSolicitadas: item.horasSolicitadas,
      aprobacionLider: {
        aprobado: item.aprobadoLider,
        responsable: item.lider,
        metodo: item.tipoLider === 'EXT' ? 'Magic Link Externo' : 'Cuenta TMR Líder',
        fecha: item.fechaAprobacion,
      },
      aprobacionTalentoHumano: {
        aprobado: item.confirmadoRrhh,
        responsable: 'Lic. Sofía Mendoza (TH)',
        fecha: item.confirmadoRrhh ? item.fechaAprobacion : undefined,
      },
      comentarios: item.comentarios,
    };
  }

  simularEnvioSolicitud(): void {
    this.modalNuevaVisible.set(false);
    this.toast.exito(
      'Solicitud registrada y PDF generado (Prototipo)',
      'Se generó el documento oficial PDF y se notificó vía Apprise a tu Jefe Inmediato y a Talento Humano.',
    );
  }
}
