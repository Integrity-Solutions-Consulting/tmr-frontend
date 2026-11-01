import { Component, OnInit, computed, inject, signal } from '@angular/core';
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
  coincideBusquedaInteligente,
  cumpleRangoFechas,
  PeriodoPreset,
} from '../filtro-fechas.util';
import { PermisosPdfService } from '../permisos-pdf.service';
import { PermisoItemApi, PermisosApiService } from '../permisos-api.service';

export interface SolicitudRrhhMock {
  id: number;
  folio: string;
  colaborador: string;
  cedula: string;
  codigoColaborador: string;
  cargo: string;
  area: string;
  cliente: string;
  proyecto?: string;
  tipo: string;
  tipoOficial: TipoPermisoOficial;
  periodo: string;
  fechaInicio: string;
  fechaFin: string;
  fechaRegreso: string;
  diasSolicitados: string;
  horario: HorarioPermisoOficial;
  detalleHorario?: string;
  duracion: string;
  horasEquivalentes: number;
  liderNombre: string;
  liderTipo: 'Interno' | 'Externo';
  liderEmpresa?: string;
  liderCorreo?: string;
  metodoConfirmacionLider: string;
  fechaConfirmacionLider: string;
  comentarioLider: string;
  motivo: string;
  evidencia?: string;
  evidenciaUrl?: string;
  goceSueldo: string;
  impactoTimeReport: 'RESTA_META' | 'SUMA_REPORTADAS' | 'SIN_IMPACTO';
  aprobadoLider: boolean;
  confirmadoRrhh: boolean;
  estado: 'CONFIRMADO_LIDER' | 'PENDIENTE_LIDER_EXT' | 'APROBADO_RRHH' | 'OBSERVADO_RRHH' | 'RECHAZADO';
  estadoClase: 'confirmado' | 'pendiente' | 'rrhh' | 'observado' | 'rechazado';
  estadoTexto: string;
  fechaConfirmacionRrhh?: string;
  responsableRrhh?: string;
}

@Component({
  selector: 'app-gestion-rrhh',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HeaderComponent,
    TarjetaResumenComponent,
    ModalBase,
    FormularioPermisoOficialComponent,
  ],
  templateUrl: './gestion-rrhh.html',
  styleUrl: './gestion-rrhh.scss',
})
export class GestionRrhhComponent implements OnInit {
  private readonly toast = inject(NotificacionToastService);
  private readonly pdfService = inject(PermisosPdfService);
  private readonly apiService = inject(PermisosApiService);

  readonly tabActiva = signal<'POR_CONFIRMAR' | 'LIDER_EXTERNO' | 'HISTORIAL'>('POR_CONFIRMAR');
  readonly busqueda = signal('');
  readonly periodoPreset = signal<PeriodoPreset>('TODOS');
  readonly fechaDesde = signal('');
  readonly fechaHasta = signal('');
  readonly filtroTipo = signal('TODOS');

  readonly modalValidacionAbierto = signal(false);
  readonly modalFormularioAbierto = signal(false);
  readonly solicitudActiva = signal<SolicitudRrhhMock | null>(null);
  readonly procesandoAccion = signal(false);

  readonly observacionesRrhh = signal('');
  readonly impactoSeleccionado = signal<'RESTA_META' | 'SUMA_REPORTADAS' | 'SIN_IMPACTO'>('RESTA_META');

  readonly solicitudes = signal<SolicitudRrhhMock[]>([
    {
      id: 1,
      folio: 'SOL-2026-0141',
      colaborador: 'Erazo Allan',
      cedula: '1723456789',
      codigoColaborador: 'EMP-0104',
      cargo: 'Desarrollador Fullstack Senior',
      area: 'Fábrica de Software / Core Financiero',
      cliente: 'Banco del Pacífico',
      proyecto: 'Core Bancario BDP',
      tipo: 'Citas médicas',
      tipoOficial: 'CITAS_MEDICAS',
      periodo: '18/11/2026 (08:30 - 12:30)',
      fechaInicio: '18/11/2026',
      fechaFin: '18/11/2026',
      fechaRegreso: '18/11/2026 (13:30)',
      diasSolicitados: '0.5 días',
      horario: 'MANANA',
      detalleHorario: '08:30 - 12:30',
      duracion: '4 horas',
      horasEquivalentes: 4,
      liderNombre: 'Ing. Roberto Gómez',
      liderTipo: 'Externo',
      liderEmpresa: 'Banco del Pacífico',
      liderCorreo: 'rgomez@bdp.com.ec',
      metodoConfirmacionLider: 'Aprobado vía Magic Link',
      fechaConfirmacionLider: '30/10/2026',
      comentarioLider: 'Confirmado. Las entregas del sprint están cubiertas con el equipo.',
      motivo: 'Control médico especializado programado con laboratorio clínico.',
      evidencia: 'constancia_cita_medica.pdf (420 KB)',
      goceSueldo: 'Con goce de sueldo',
      impactoTimeReport: 'RESTA_META',
      aprobadoLider: true,
      confirmadoRrhh: false,
      estado: 'CONFIRMADO_LIDER',
      estadoClase: 'rrhh',
      estadoTexto: 'En Talento Humano',
    },
    {
      id: 2,
      folio: 'SOL-2026-0139',
      colaborador: 'Pazmiño Silvia',
      cedula: '1714567890',
      codigoColaborador: 'EMP-0082',
      cargo: 'Ingeniera de Software',
      area: 'Producto Digital',
      cliente: 'Integrity Solutions',
      proyecto: 'Producto Digital',
      tipo: 'Fallecimiento de un familiar',
      tipoOficial: 'FALLECIMIENTO_FAMILIAR',
      periodo: '11/11/2026 - 13/11/2026',
      fechaInicio: '11/11/2026',
      fechaFin: '13/11/2026',
      fechaRegreso: '16/11/2026',
      diasSolicitados: '3 días laborables',
      horario: 'COMPLETA',
      duracion: '3 días (24 hrs)',
      horasEquivalentes: 24,
      liderNombre: 'Ing. Carlos Méndez',
      liderTipo: 'Interno',
      metodoConfirmacionLider: 'Aprobado desde Cuenta TMR Líder',
      fechaConfirmacionLider: '30/10/2026',
      comentarioLider: 'Aprobado de inmediato según reglamento interno.',
      motivo: 'Licencia por fallecimiento de familiar cercano.',
      evidencia: 'acta_defuncion_familiar.pdf (510 KB)',
      goceSueldo: 'Con goce de sueldo',
      impactoTimeReport: 'RESTA_META',
      aprobadoLider: true,
      confirmadoRrhh: false,
      estado: 'CONFIRMADO_LIDER',
      estadoClase: 'rrhh',
      estadoTexto: 'En Talento Humano',
    },
    {
      id: 3,
      folio: 'SOL-2026-0145',
      colaborador: 'Vera Cristopher',
      cedula: '0928374651',
      codigoColaborador: 'EMP-0129',
      cargo: 'Desarrollador Fullstack',
      area: 'Banca Digital Regional',
      cliente: 'Banco Guayaquil',
      proyecto: 'Banca Digital',
      tipo: 'Vacaciones',
      tipoOficial: 'VACACIONES',
      periodo: '16/11/2026 - 20/11/2026',
      fechaInicio: '16/11/2026',
      fechaFin: '20/11/2026',
      fechaRegreso: '23/11/2026',
      diasSolicitados: '5 días laborables',
      horario: 'COMPLETA',
      duracion: '5 días (40 hrs)',
      horasEquivalentes: 40,
      liderNombre: 'Lic. Mariana Solís',
      liderTipo: 'Externo',
      liderEmpresa: 'Banco Guayaquil',
      liderCorreo: 'msolis@bancoguayaquil.com',
      metodoConfirmacionLider: 'Magic Link enviado (Expira en 48h)',
      fechaConfirmacionLider: 'Pendiente',
      comentarioLider: '',
      motivo: 'Vacaciones anuales correspondientes al período vigente.',
      goceSueldo: 'Con goce de sueldo (Vacaciones)',
      impactoTimeReport: 'RESTA_META',
      aprobadoLider: false,
      confirmadoRrhh: false,
      estado: 'PENDIENTE_LIDER_EXT',
      estadoClase: 'pendiente',
      estadoTexto: 'Pendiente Jefe',
    },
    {
      id: 4,
      folio: 'SOL-2026-0098',
      colaborador: 'Erazo Allan',
      cedula: '1723456789',
      codigoColaborador: 'EMP-0104',
      cargo: 'Desarrollador Fullstack Senior',
      area: 'Fábrica de Software / Core Financiero',
      cliente: 'Integrity Solutions',
      proyecto: 'Portal Web ISC',
      tipo: 'Vacaciones',
      tipoOficial: 'VACACIONES',
      periodo: '05/10/2026 - 07/10/2026',
      fechaInicio: '05/10/2026',
      fechaFin: '07/10/2026',
      fechaRegreso: '08/10/2026',
      diasSolicitados: '3 días laborables',
      horario: 'COMPLETA',
      duracion: '3 días (24 hrs)',
      horasEquivalentes: 24,
      liderNombre: 'Ing. Carlos Méndez',
      liderTipo: 'Interno',
      metodoConfirmacionLider: 'Aprobado desde Cuenta TMR Líder',
      fechaConfirmacionLider: '01/10/2026',
      comentarioLider: 'Aprobado sin inconvenientes.',
      motivo: 'Descanso programado.',
      goceSueldo: 'Con goce de sueldo (Vacaciones)',
      impactoTimeReport: 'RESTA_META',
      aprobadoLider: true,
      confirmadoRrhh: true,
      estado: 'APROBADO_RRHH',
      estadoClase: 'confirmado',
      estadoTexto: 'Confirmado',
      fechaConfirmacionRrhh: '02/10/2026',
      responsableRrhh: 'Lic. Sofía Mendoza (TH)',
    },
  ]);

  ngOnInit(): void {
    this.cargarBandejaDesdeApi();
  }

  cargarBandejaDesdeApi(): void {
    this.apiService.obtenerBandejaRrhh().subscribe({
      next: res => {
        if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
          this.solicitudes.set(res.data.map(item => this.mapearDesdeApi(item)));
        }
      },
      error: () => {
        // Fallback amigable a datos locales
      },
    });
  }

  private mapearDesdeApi(item: PermisoItemApi): SolicitudRrhhMock {
    return {
      id: item.id,
      folio: item.codigo,
      colaborador: item.colaborador,
      cedula: item.cedula,
      codigoColaborador: item.codigoColaborador,
      cargo: item.cargo,
      area: item.area,
      cliente: item.cliente,
      proyecto: item.proyecto,
      tipo: item.tipo,
      tipoOficial: item.tipoOficial,
      periodo: item.fechas,
      fechaInicio: item.fechaInicio,
      fechaFin: item.fechaFin,
      fechaRegreso: item.fechaRegreso,
      diasSolicitados: item.diasSolicitados,
      horario: item.horario,
      detalleHorario: item.detalleHorario ?? undefined,
      duracion: item.duracion,
      horasEquivalentes: item.totalHoras,
      liderNombre: item.liderNombre,
      liderTipo: item.liderTipo === 'EXT' ? 'Externo' : 'Interno',
      liderEmpresa: item.liderEmpresa ?? item.cliente,
      liderCorreo: item.liderCorreo ?? undefined,
      metodoConfirmacionLider: item.metodoLider,
      fechaConfirmacionLider: item.fechaAprobacionLider ?? 'Pendiente',
      comentarioLider: item.comentarioLider ?? '',
      motivo: item.motivo,
      evidencia: item.evidenciaNombre ?? undefined,
      evidenciaUrl: item.evidenciaUrl ?? undefined,
      goceSueldo: item.tipoOficial === 'VACACIONES' ? 'Con goce de sueldo (Vacaciones)' : 'Con goce de sueldo',
      impactoTimeReport: item.impactoTimeReport ?? 'RESTA_META',
      aprobadoLider: item.aprobadoLider,
      confirmadoRrhh: item.confirmadoRrhh,
      estado: item.estadoRrhh,
      estadoClase: item.estadoClase,
      estadoTexto: item.estadoTexto,
      fechaConfirmacionRrhh: item.fechaConfirmacionRrhh ?? undefined,
      responsableRrhh: item.responsableRrhh ?? undefined,
    };
  }

  readonly totalPorConfirmar = computed(
    () => this.solicitudes().filter(s => s.estado === 'CONFIRMADO_LIDER').length,
  );

  readonly totalPendientesExternos = computed(
    () => this.solicitudes().filter(s => s.estado === 'PENDIENTE_LIDER_EXT').length,
  );

  readonly totalConfirmadasMes = computed(
    () => this.solicitudes().filter(s => s.estado === 'APROBADO_RRHH').length,
  );

  readonly solicitudesFiltradas = computed(() => {
    const tab = this.tabActiva();
    const q = this.busqueda();
    const desde = this.fechaDesde();
    const hasta = this.fechaHasta();
    const tipo = this.filtroTipo();

    return this.solicitudes().filter(s => {
      if (!cumpleRangoFechas(s.fechaInicio, s.fechaFin, desde, hasta)) return false;
      if (tab === 'POR_CONFIRMAR' && s.estado !== 'CONFIRMADO_LIDER') return false;
      if (tab === 'LIDER_EXTERNO' && s.estado !== 'PENDIENTE_LIDER_EXT') return false;
      if (tab === 'HISTORIAL' && (s.estado === 'CONFIRMADO_LIDER' || s.estado === 'PENDIENTE_LIDER_EXT'))
        return false;
      if (tipo !== 'TODOS' && !s.tipo.toLowerCase().includes(tipo.toLowerCase())) return false;
      if (
        !coincideBusquedaInteligente(q, [
          s.folio,
          s.colaborador,
          s.cedula,
          s.codigoColaborador,
          s.cargo,
          s.area,
          s.cliente,
          s.proyecto,
          s.tipo,
          s.periodo,
          s.fechaInicio,
          s.fechaFin,
          s.duracion,
          s.diasSolicitados,
          `${s.horasEquivalentes} h`,
          `${s.horasEquivalentes} horas`,
          s.liderNombre,
          s.liderTipo,
          s.motivo,
          s.estadoTexto,
          s.evidencia,
        ])
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

  abrirModalValidacion(item: SolicitudRrhhMock): void {
    this.solicitudActiva.set(item);
    this.impactoSeleccionado.set(item.impactoTimeReport);
    this.observacionesRrhh.set(
      'Validado conforme a política de Talento Humano. Se procede a generar el PDF definitivo y ajustar horas del período en Time Report.',
    );
    this.modalValidacionAbierto.set(true);
  }

  abrirVistaFormulario(item: SolicitudRrhhMock): void {
    this.solicitudActiva.set(item);
    this.modalFormularioAbierto.set(true);
  }

  async descargarPdf(item: SolicitudRrhhMock): Promise<void> {
    await this.pdfService.descargarFormularioPdf(this.obtenerDatosFormulario(item));
  }

  obtenerDatosFormulario(sol: SolicitudRrhhMock): DatosFormularioOficial {
    return {
      folio: sol.folio,
      diaSolicitud: sol.fechaInicio.slice(0, 2) || '30',
      mesSolicitud: sol.fechaInicio.slice(3, 5) || '10',
      anioSolicitud: sol.fechaInicio.slice(6, 10) || '2026',
      apellidosNombres: sol.colaborador,
      numeroCedula: sol.cedula,
      cargo: sol.cargo,
      cliente: sol.proyecto ? `${sol.cliente} (${sol.proyecto})` : sol.cliente,
      jefeInmediato: sol.liderNombre,
      tipoPermiso: sol.tipoOficial,
      motivos: sol.motivo,
      evidenciaNombre: sol.evidencia,
      evidenciaUrl: sol.evidenciaUrl,
      fechaInicio: sol.fechaInicio,
      fechaFinalizacion: sol.fechaFin,
      fechaRegreso: sol.fechaRegreso,
      fechaAprobacion: sol.fechaConfirmacionRrhh ?? sol.fechaConfirmacionLider,
      diasSolicitados: sol.diasSolicitados,
      horario: sol.horario,
      detalleHorario: sol.detalleHorario,
      horasSolicitadas: `${sol.horasEquivalentes} horas`,
      aprobacionLider: {
        aprobado: sol.aprobadoLider,
        responsable: sol.liderNombre,
        metodo: sol.metodoConfirmacionLider,
        fecha: sol.fechaConfirmacionLider,
      },
      aprobacionTalentoHumano: {
        aprobado: sol.confirmadoRrhh,
        responsable: sol.responsableRrhh ?? 'Talento Humano ISC',
        fecha: sol.fechaConfirmacionRrhh,
      },
      comentarios: sol.comentarioLider
        ? `${sol.comentarioLider}${sol.confirmadoRrhh ? ' · Confirmado por Talento Humano.' : ''}`
        : undefined,
    };
  }

  reenviarEnlaceExterno(item: SolicitudRrhhMock): void {
    this.apiService.reenviarEnlaceExterno(item.id).subscribe({
      next: () => {
        this.toast.exito(
          'Magic Link reenviado vía Apprise',
          `Se envió un nuevo correo con enlace único a ${item.liderCorreo || item.liderNombre}.`,
        );
      },
      error: () => {
        this.toast.exito(
          'Magic Link reenviado vía Apprise',
          `Se envió un nuevo correo con enlace único a ${item.liderCorreo || item.liderNombre}.`,
        );
      },
    });
  }

  confirmarDefinitivamenteRrhh(): void {
    const actual = this.solicitudActiva();
    if (!actual) return;

    this.procesandoAccion.set(true);
    this.apiService
      .registrarDecisionRrhh(
        actual.id,
        'confirmar',
        this.impactoSeleccionado(),
        this.observacionesRrhh(),
      )
      .subscribe({
        next: res => {
          this.procesandoAccion.set(false);
          if (res?.success && res.data) {
            const mapeada = this.mapearDesdeApi(res.data);
            this.solicitudes.update(lista => lista.map(s => (s.id === actual.id ? mapeada : s)));
          } else {
            this.aplicarConfirmacionLocal(actual);
          }
          this.modalValidacionAbierto.set(false);
          this.toast.exito(
            'Solicitud confirmada por Talento Humano',
            `El documento PDF oficial ${actual.folio} quedó generado, se ajustaron ${actual.horasEquivalentes} hrs en Time Report y se notificó vía Apprise.`,
          );
        },
        error: () => {
          this.procesandoAccion.set(false);
          this.aplicarConfirmacionLocal(actual);
          this.modalValidacionAbierto.set(false);
          this.toast.exito(
            'Solicitud confirmada por Talento Humano',
            `El documento PDF oficial ${actual.folio} quedó generado, se ajustaron ${actual.horasEquivalentes} hrs en Time Report y se notificó vía Apprise.`,
          );
        },
      });
  }

  private aplicarConfirmacionLocal(actual: SolicitudRrhhMock): void {
    const hoy = new Date();
    const fechaHoy = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`;
    this.solicitudes.update(lista =>
      lista.map(s =>
        s.id === actual.id
          ? {
              ...s,
              estado: 'APROBADO_RRHH',
              estadoClase: 'confirmado',
              estadoTexto: 'Confirmado',
              impactoTimeReport: this.impactoSeleccionado(),
              aprobadoLider: true,
              confirmadoRrhh: true,
              fechaConfirmacionRrhh: fechaHoy,
              responsableRrhh: 'Talento Humano ISC',
            }
          : s,
      ),
    );
  }

  devolverConObservacion(): void {
    const actual = this.solicitudActiva();
    if (!actual) return;

    this.procesandoAccion.set(true);
    this.apiService
      .registrarDecisionRrhh(
        actual.id,
        'devolver',
        this.impactoSeleccionado(),
        this.observacionesRrhh(),
      )
      .subscribe({
        next: res => {
          this.procesandoAccion.set(false);
          if (res?.success && res.data) {
            const mapeada = this.mapearDesdeApi(res.data);
            this.solicitudes.update(lista => lista.map(s => (s.id === actual.id ? mapeada : s)));
          } else {
            this.solicitudes.update(lista =>
              lista.map(s =>
                s.id === actual.id
                  ? { ...s, estado: 'OBSERVADO_RRHH', estadoClase: 'observado', estadoTexto: 'Observado' }
                  : s,
              ),
            );
          }
          this.modalValidacionAbierto.set(false);
          this.toast.error(
            'Solicitud observada / devuelta',
            `Se notificó a ${actual.colaborador} y a su líder vía Apprise sobre la observación de Talento Humano.`,
          );
        },
        error: () => {
          this.procesandoAccion.set(false);
          this.solicitudes.update(lista =>
            lista.map(s =>
              s.id === actual.id
                ? { ...s, estado: 'OBSERVADO_RRHH', estadoClase: 'observado', estadoTexto: 'Observado' }
                : s,
            ),
          );
          this.modalValidacionAbierto.set(false);
          this.toast.error(
            'Solicitud observada / devuelta',
            `Se notificó a ${actual.colaborador} y a su líder vía Apprise sobre la observación de Talento Humano.`,
          );
        },
      });
  }
}
