import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { TarjetaResumenComponent } from '../../../../shared/components/tarjeta-resumen/tarjeta-resumen.component';
import { ModalBase } from '../../../../shared/components/modal-base/modal-base';
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

export interface SolicitudGerenciaMock {
  id: number;
  folio: string;
  anio: string;
  colaborador: string;
  cedula: string;
  cargo: string;
  cliente: string;
  proyecto: string;
  liderNombre: string;
  liderTipo: 'INT' | 'EXT';
  tipo: string;
  tipoOficial: TipoPermisoOficial;
  fechas: string;
  fechaInicio: string;
  fechaFin: string;
  fechaRegreso: string;
  fechaAprobacion: string;
  diasSolicitados: string;
  horario: HorarioPermisoOficial;
  horasSolicitadas: string;
  motivo: string;
  evidencia?: string;
  evidenciaUrl?: string;
  estadoClase: 'confirmado' | 'pendiente' | 'rrhh' | 'observado' | 'rechazado';
  estadoTexto: string;
  comentarios?: string;
}

@Component({
  selector: 'app-permisos-gerencia',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HeaderComponent,
    TarjetaResumenComponent,
    ModalBase,
    FormularioPermisoOficialComponent,
  ],
  templateUrl: './permisos-gerencia.html',
  styleUrl: './permisos-gerencia.scss',
})
export class PermisosGerenciaComponent implements OnInit {
  private readonly pdfService = inject(PermisosPdfService);
  private readonly apiService = inject(PermisosApiService);

  readonly busqueda = signal('');
  readonly periodoPreset = signal<PeriodoPreset>('TODOS');
  readonly fechaDesde = signal('');
  readonly fechaHasta = signal('');
  readonly filtroTipo = signal('TODOS');
  readonly filtroEstado = signal('TODOS');

  readonly modalPdfVisible = signal(false);
  readonly solicitudActiva = signal<SolicitudGerenciaMock | null>(null);

  readonly solicitudes = signal<SolicitudGerenciaMock[]>([
    {
      id: 1,
      folio: 'PER-2026-006',
      anio: '2026',
      colaborador: 'Flores Jonathan',
      cedula: '1719283746',
      cargo: 'Desarrollador Fullstack',
      cliente: 'Integrity Solutions',
      proyecto: 'Portal Web ISC',
      liderNombre: 'Ing. Carlos Méndez',
      liderTipo: 'INT',
      tipo: 'Vacaciones',
      tipoOficial: 'VACACIONES',
      fechas: '04/11/2026 - 06/11/2026',
      fechaInicio: '04/11/2026',
      fechaFin: '06/11/2026',
      fechaRegreso: '09/11/2026',
      fechaAprobacion: 'Pendiente',
      diasSolicitados: '3 días',
      horario: 'COMPLETA',
      horasSolicitadas: '24 h',
      motivo: 'Vacaciones anuales programadas.',
      estadoClase: 'pendiente',
      estadoTexto: 'Pendiente Jefe',
    },
    {
      id: 2,
      folio: 'PER-2026-005',
      anio: '2026',
      colaborador: 'Erazo Allan',
      cedula: '1723456789',
      cargo: 'Desarrollador Fullstack',
      cliente: 'Banco del Pacífico',
      proyecto: 'Core Bancario BDP',
      liderNombre: 'Ing. Roberto Gómez',
      liderTipo: 'EXT',
      tipo: 'Vacaciones',
      tipoOficial: 'VACACIONES',
      fechas: '09/11/2026 - 13/11/2026',
      fechaInicio: '09/11/2026',
      fechaFin: '13/11/2026',
      fechaRegreso: '16/11/2026',
      fechaAprobacion: 'Pendiente',
      diasSolicitados: '5 días',
      horario: 'COMPLETA',
      horasSolicitadas: '40 h',
      motivo: 'Vacaciones programadas noviembre.',
      estadoClase: 'pendiente',
      estadoTexto: 'Pendiente Jefe',
    },
    {
      id: 3,
      folio: 'PER-2026-004',
      anio: '2026',
      colaborador: 'Erazo Allan',
      cedula: '1723456789',
      cargo: 'Desarrollador Fullstack',
      cliente: 'Integrity Solutions',
      proyecto: 'Portal Web ISC',
      liderNombre: 'Ing. Carlos Méndez',
      liderTipo: 'INT',
      tipo: 'Licencia por enfermedad',
      tipoOficial: 'LICENCIA_ENFERMEDAD',
      fechas: '02/11/2026 - 03/11/2026',
      fechaInicio: '02/11/2026',
      fechaFin: '03/11/2026',
      fechaRegreso: '04/11/2026',
      fechaAprobacion: '01/11/2026',
      diasSolicitados: '2 días',
      horario: 'COMPLETA',
      horasSolicitadas: '16 h',
      motivo: 'Reposo médico odontológico.',
      evidencia: 'certificado_iess.pdf',
      estadoClase: 'rrhh',
      estadoTexto: 'En Talento Humano',
    },
    {
      id: 4,
      folio: 'PER-2026-003',
      anio: '2026',
      colaborador: 'Vera Cristopher',
      cedula: '0928374651',
      cargo: 'Desarrollador Fullstack',
      cliente: 'Banco Guayaquil',
      proyecto: 'Banca Digital',
      liderNombre: 'Lic. Mariana Solís',
      liderTipo: 'EXT',
      tipo: 'Otros',
      tipoOficial: 'OTROS',
      fechas: '20/10/2026 - 22/10/2026',
      fechaInicio: '20/10/2026',
      fechaFin: '22/10/2026',
      fechaRegreso: '23/10/2026',
      fechaAprobacion: '18/10/2026',
      diasSolicitados: '3 días',
      horario: 'COMPLETA',
      horasSolicitadas: '24 h',
      motivo: 'Permiso personal en semana de salida a producción.',
      estadoClase: 'rechazado',
      estadoTexto: 'Rechazado',
      comentarios: 'Rechazado por coincidir con ventana de despliegue en producción.',
    },
    {
      id: 5,
      folio: 'PER-2026-001',
      anio: '2026',
      colaborador: 'Pazmiño Silvia',
      cedula: '1714567890',
      cargo: 'Ingeniera de Software',
      cliente: 'Integrity Solutions',
      proyecto: 'Producto Digital',
      liderNombre: 'Ing. Carlos Méndez',
      liderTipo: 'INT',
      tipo: 'Citas médicas',
      tipoOficial: 'CITAS_MEDICAS',
      fechas: '15/10/2026 (08:30 - 12:30)',
      fechaInicio: '15/10/2026',
      fechaFin: '15/10/2026',
      fechaRegreso: '15/10/2026',
      fechaAprobacion: '14/10/2026',
      diasSolicitados: '0.5 días',
      horario: 'MANANA',
      horasSolicitadas: '4 h',
      motivo: 'Control médico programado.',
      evidencia: 'constancia_medica.pdf',
      estadoClase: 'confirmado',
      estadoTexto: 'Confirmado',
    },
    {
      id: 6,
      folio: 'PER-2025-118',
      anio: '2025',
      colaborador: 'Paredes Harold',
      cedula: '1720918273',
      cargo: 'Desarrollador Backend',
      cliente: 'Integrity Solutions',
      proyecto: 'Migración Microservicios',
      liderNombre: 'Ing. Carlos Méndez',
      liderTipo: 'INT',
      tipo: 'Vacaciones',
      tipoOficial: 'VACACIONES',
      fechas: '15/12/2025 - 19/12/2025',
      fechaInicio: '15/12/2025',
      fechaFin: '19/12/2025',
      fechaRegreso: '22/12/2025',
      fechaAprobacion: '10/12/2025',
      diasSolicitados: '5 días',
      horario: 'COMPLETA',
      horasSolicitadas: '40 h',
      motivo: 'Vacaciones anuales periodo 2025.',
      estadoClase: 'confirmado',
      estadoTexto: 'Confirmado',
    },
    {
      id: 7,
      folio: 'PER-2024-084',
      anio: '2024',
      colaborador: 'Erazo Allan',
      cedula: '1723456789',
      cargo: 'Desarrollador Fullstack',
      cliente: 'Banco del Pacífico',
      proyecto: 'Core Bancario BDP',
      liderNombre: 'Ing. Roberto Gómez',
      liderTipo: 'EXT',
      tipo: 'Fallecimiento de un familiar',
      tipoOficial: 'FALLECIMIENTO_FAMILIAR',
      fechas: '04/08/2024 - 06/08/2024',
      fechaInicio: '04/08/2024',
      fechaFin: '06/08/2024',
      fechaRegreso: '07/08/2024',
      fechaAprobacion: '04/08/2024',
      diasSolicitados: '3 días',
      horario: 'COMPLETA',
      horasSolicitadas: '24 h',
      motivo: 'Licencia por calamidad doméstica.',
      evidencia: 'justificante.pdf',
      estadoClase: 'confirmado',
      estadoTexto: 'Confirmado',
    },
  ]);

  ngOnInit(): void {
    this.cargarHistorialDesdeApi();
  }

  cargarHistorialDesdeApi(): void {
    this.apiService.obtenerHistorialGerencia().subscribe({
      next: res => {
        if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
          this.solicitudes.set(
            res.data.map((item: PermisoItemApi) => ({
              id: item.id,
              folio: item.codigo,
              anio: item.anioSolicitud,
              colaborador: item.colaborador,
              cedula: item.cedula,
              cargo: item.cargo,
              cliente: item.cliente,
              proyecto: item.proyecto,
              liderNombre: item.liderNombre,
              liderTipo: item.liderTipo,
              tipo: item.tipo,
              tipoOficial: item.tipoOficial,
              fechas: item.fechas,
              fechaInicio: item.fechaInicio,
              fechaFin: item.fechaFin,
              fechaRegreso: item.fechaRegreso,
              fechaAprobacion: item.fechaAprobacion,
              diasSolicitados: `${item.totalDias} días`,
              horario: item.horario,
              horasSolicitadas: `${item.totalHoras} h`,
              motivo: item.motivo,
              evidencia: item.evidenciaNombre ?? undefined,
              evidenciaUrl: item.evidenciaUrl ?? undefined,
              estadoClase: item.estadoClase,
              estadoTexto: item.estadoTexto,
              comentarios: item.comentarios ?? undefined,
            })),
          );
        }
      },
      error: () => {
        // Fallback amigable a datos locales
      },
    });
  }

  readonly solicitudesFiltradas = computed(() => {
    const q = this.busqueda();
    const desde = this.fechaDesde();
    const hasta = this.fechaHasta();
    const tipo = this.filtroTipo();
    const estado = this.filtroEstado();

    return this.solicitudes().filter(s => {
      if (!cumpleRangoFechas(s.fechaInicio, s.fechaFin, desde, hasta)) return false;
      if (tipo !== 'TODOS' && s.tipoOficial !== tipo) return false;
      if (estado !== 'TODOS' && s.estadoClase !== estado) return false;
      if (
        !coincideBusquedaInteligente(q, [
          s.folio,
          s.anio,
          s.colaborador,
          s.cedula,
          s.cargo,
          s.cliente,
          s.proyecto,
          s.liderNombre,
          s.liderTipo,
          s.tipo,
          s.fechas,
          s.fechaInicio,
          s.fechaFin,
          s.diasSolicitados,
          s.horasSolicitadas,
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

  readonly totalHistorico = computed(() => this.solicitudesFiltradas().length);
  readonly totalConfirmados = computed(
    () => this.solicitudesFiltradas().filter(s => s.estadoClase === 'confirmado').length,
  );
  readonly totalEnProceso = computed(
    () =>
      this.solicitudesFiltradas().filter(
        s => s.estadoClase === 'pendiente' || s.estadoClase === 'rrhh' || s.estadoClase === 'observado',
      ).length,
  );
  readonly totalRechazados = computed(
    () => this.solicitudesFiltradas().filter(s => s.estadoClase === 'rechazado').length,
  );

  readonly tieneFiltrosActivos = computed(
    () =>
      Boolean(this.busqueda().trim()) ||
      this.periodoPreset() !== 'TODOS' ||
      Boolean(this.fechaDesde()) ||
      Boolean(this.fechaHasta()) ||
      this.filtroTipo() !== 'TODOS' ||
      this.filtroEstado() !== 'TODOS',
  );

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

  limpiarFiltros(): void {
    this.busqueda.set('');
    this.periodoPreset.set('TODOS');
    this.fechaDesde.set('');
    this.fechaHasta.set('');
    this.filtroTipo.set('TODOS');
    this.filtroEstado.set('TODOS');
  }

  verPdf(item: SolicitudGerenciaMock): void {
    this.solicitudActiva.set(item);
    this.modalPdfVisible.set(true);
  }

  async descargarPdf(item: SolicitudGerenciaMock): Promise<void> {
    await this.pdfService.descargarFormularioPdf(this.obtenerDatosFormulario(item));
  }

  obtenerDatosFormulario(item: SolicitudGerenciaMock): DatosFormularioOficial {
    const aprobadoLider = item.estadoClase === 'rrhh' || item.estadoClase === 'confirmado';
    const confirmadoRrhh = item.estadoClase === 'confirmado';

    return {
      folio: item.folio,
      diaSolicitud: item.fechaInicio.slice(0, 2),
      mesSolicitud: item.fechaInicio.slice(3, 5),
      anioSolicitud: item.anio,
      apellidosNombres: item.colaborador,
      numeroCedula: item.cedula,
      cargo: item.cargo,
      cliente: `${item.cliente} (${item.proyecto})`,
      jefeInmediato: item.liderNombre,
      tipoPermiso: item.tipoOficial,
      motivos: item.motivo,
      evidenciaNombre: item.evidencia,
      evidenciaUrl: item.evidenciaUrl,
      fechaInicio: item.fechaInicio,
      fechaFinalizacion: item.fechaFin,
      fechaRegreso: item.fechaRegreso,
      fechaAprobacion: item.fechaAprobacion,
      diasSolicitados: item.diasSolicitados,
      horario: item.horario,
      horasSolicitadas: item.horasSolicitadas,
      aprobacionLider: {
        aprobado: aprobadoLider,
        responsable: item.liderNombre,
        metodo: item.liderTipo === 'EXT' ? 'Magic Link Externo' : 'Cuenta TMR Líder',
        fecha: item.fechaAprobacion,
      },
      aprobacionTalentoHumano: {
        aprobado: confirmadoRrhh,
        responsable: 'Talento Humano ISC',
        fecha: confirmadoRrhh ? item.fechaAprobacion : undefined,
      },
      comentarios: item.comentarios,
    };
  }
}
