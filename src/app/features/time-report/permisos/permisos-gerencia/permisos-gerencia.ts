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
  diaSolicitud?: string;
  mesSolicitud?: string;
  colaborador: string;
  cedula: string;
  cargo: string;
  cliente: string;
  proyecto: string;
  liderNombre: string;
  liderTipo: 'INT' | 'EXT';
  responsableRrhh?: string;
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

  readonly solicitudes = signal<SolicitudGerenciaMock[]>([]);

  ngOnInit(): void {
    this.cargarHistorialDesdeApi();
  }

  cargarHistorialDesdeApi(): void {
    this.apiService.obtenerHistorialGerencia().subscribe({
      next: res => {
        if (res?.success && Array.isArray(res.data)) {
          this.solicitudes.set(
            res.data.map((item: PermisoItemApi) => ({
              id: item.id,
              folio: item.codigo,
              anio: item.anioSolicitud,
              diaSolicitud: item.diaSolicitud,
              mesSolicitud: item.mesSolicitud,
              colaborador: item.colaborador,
              cedula: item.cedula,
              cargo: item.cargo,
              cliente: item.cliente,
              proyecto: item.proyecto,
              liderNombre: item.liderNombre,
              liderTipo: item.liderTipo,
              responsableRrhh: item.responsableRrhh ?? undefined,
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
              evidenciaUrl: item.tieneEvidencia ? this.apiService.obtenerUrlEvidencia(item.id) : undefined,
              estadoClase: item.estadoClase,
              estadoTexto: item.estadoTexto,
              comentarios: item.comentarios ?? undefined,
            })),
          );
        }
      },
      error: () => {},
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
      idPermiso: item.id,
      folio: item.folio,
      diaSolicitud: item.diaSolicitud || item.fechaInicio.slice(0, 2),
      mesSolicitud: item.mesSolicitud || item.fechaInicio.slice(3, 5),
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
      evidenciaUrlDescarga: item.evidenciaUrl,
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
        responsable: item.responsableRrhh || 'Talento Humano ISC',
        fecha: confirmadoRrhh ? item.fechaAprobacion : undefined,
      },
      comentarios: item.comentarios,
    };
  }
}
