import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NotificacionToastService } from '../../../shared/services/notificacion-toast.service';
import {
  CorteProgramado,
  CortesProgramadosResponse,
  EstadoCorte,
  FechasCorteService,
} from './fechas-corte.service';

interface MesCortes {
  clave: string;
  titulo: string;
  cortes: CorteProgramado[];
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const ETIQUETA_ESTADO: Record<EstadoCorte, string> = {
  Programado: 'Programado',
  EnProceso: 'En proceso',
  Ejecutado: 'Ejecutado',
  NoEjecutado: 'No ejecutado',
};

/**
 * Pantalla Time Report > Fechas de Corte (flujo 3 de notificaciones).
 * Muestra los cortes del mes anterior, el actual y los dos siguientes, y deja mover la fecha y
 * hora de los que aún no se ejecutan. Las fechas se manejan siempre en hora de Ecuador (−05:00),
 * sin convertir a la zona del navegador, igual que el backend.
 */
@Component({
  selector: 'app-fechas-corte',
  templateUrl: './fechas-corte.html',
  styleUrl: './fechas-corte.scss',
})
export class FechasCorteComponent implements OnInit {
  private readonly service = inject(FechasCorteService);
  private readonly toast = inject(NotificacionToastService);

  readonly cargando = signal(true);
  readonly errorCarga = signal<string | null>(null);
  readonly habilitado = signal(true);
  readonly cortes = signal<CorteProgramado[]>([]);

  readonly editandoId = signal<number | null>(null);
  readonly guardandoId = signal<number | null>(null);
  readonly fechaEdit = signal('');
  readonly horaEdit = signal('');

  private avisoErrorId: number | null = null;

  readonly meses = computed<MesCortes[]>(() => {
    const grupos = new Map<string, MesCortes>();
    for (const corte of this.cortes()) {
      const clave = `${corte.anio}-${corte.mes}`;
      if (!grupos.has(clave)) {
        grupos.set(clave, { clave, titulo: `${MESES[corte.mes - 1]} ${corte.anio}`, cortes: [] });
      }
      grupos.get(clave)!.cortes.push(corte);
    }
    return [...grupos.values()];
  });

  /** Siguiente corte que todavía no se ejecuta. */
  readonly proximo = computed(() => this.cortes().find((c) => c.estado === 'Programado') ?? null);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set(null);
    this.service.listar().subscribe({
      next: (r) => {
        this.aplicar(r);
        this.cargando.set(false);
      },
      error: (err) => {
        this.errorCarga.set(this.mensajeError(err, 'No se pudieron cargar las fechas de corte.'));
        this.cargando.set(false);
      },
    });
  }

  /** El corte ya pasó (ejecutado o no): editarlo programa una nueva ejecución. */
  esReprogramacion(corte: CorteProgramado): boolean {
    return corte.estado === 'Ejecutado' || corte.estado === 'NoEjecutado';
  }

  editar(corte: CorteProgramado): void {
    this.editandoId.set(corte.id);
    // Si la fecha actual ya pasó, se propone el primer día disponible (a la misma hora)
    const dia = this.diaDe(corte.fechaCorte);
    const fecha = dia < corte.fechaMinima ? corte.fechaMinima : dia;
    let hora = this.horaDe(corte.fechaCorte);
    // Si ese día es hoy y la hora ya pasó, se propone la siguiente hora en punto
    if (`${fecha}T${hora}` <= this.ahoraEcuador()) {
      const siguiente = Number(this.ahoraEcuador().slice(11, 13)) + 1;
      hora = siguiente <= 23 ? `${String(siguiente).padStart(2, '0')}:00` : '23:59';
    }
    this.fechaEdit.set(fecha);
    this.horaEdit.set(hora);
  }

  /** Hoy en Ecuador (yyyy-MM-dd). */
  hoyEcuador(): string {
    return this.ahoraEcuador().slice(0, 10);
  }

  /** Hora actual de Ecuador (HH:mm). */
  horaActualEcuador(): string {
    return this.ahoraEcuador().slice(11, 16);
  }

  /** La fecha y hora elegidas ya pasaron (el backend solo acepta fechas futuras). */
  horaPasada(): boolean {
    const fecha = this.fechaEdit();
    const hora = this.horaEdit();
    return !!fecha && !!hora && `${fecha}T${hora}` <= this.ahoraEcuador();
  }

  cancelar(): void {
    this.editandoId.set(null);
  }

  guardar(corte: CorteProgramado): void {
    const fecha = this.fechaEdit();
    const hora = this.horaEdit();
    if (this.guardandoId() !== null) return;
    if (!fecha || !hora) {
      this.avisarError('Faltan datos', 'Selecciona el día y la hora del corte.');
      return;
    }
    if (fecha < corte.fechaMinima || fecha > corte.fechaMaxima) {
      this.avisarError(
        'Fecha fuera de rango',
        `Para este corte elige un día entre el ${this.dia(corte.fechaMinima)} y el ${this.dia(corte.fechaMaxima)}.`,
      );
      return;
    }
    if (this.horaPasada()) {
      this.avisarError(
        'La hora ya pasó',
        `Para hoy elige una hora posterior a las ${this.horaActualEcuador()} (hora de Ecuador).`,
      );
      return;
    }

    const nueva = `${fecha}T${hora}:00-05:00`;
    this.guardandoId.set(corte.id);
    this.service.cambiarFecha(corte.id, nueva).subscribe({
      next: (r) => {
        this.aplicar(r);
        this.guardandoId.set(null);
        this.editandoId.set(null);
        this.cerrarError();
        this.toast.exito(
          this.esReprogramacion(corte) ? 'Corte reprogramado' : 'Fecha de corte actualizada',
          `${this.nombreCorte(corte)}: ${this.fechaHora(nueva)}.`,
        );
      },
      error: (err) => {
        this.guardandoId.set(null);
        this.avisarError('No se pudo guardar', this.mensajeError(err, 'Intenta nuevamente.'));
      },
    });
  }

  restablecer(corte: CorteProgramado): void {
    this.guardandoId.set(corte.id);
    this.service.restablecer(corte.id).subscribe({
      next: (r) => {
        this.aplicar(r);
        this.guardandoId.set(null);
        this.editandoId.set(null);
        this.cerrarError();
        this.toast.exito(
          'Fecha restablecida',
          `${this.nombreCorte(corte)} vuelve a ${this.fechaHora(corte.fechaPorDefecto)}.`,
        );
      },
      error: (err) => {
        this.guardandoId.set(null);
        this.avisarError('No se pudo restablecer', this.mensajeError(err, 'Intenta nuevamente.'));
      },
    });
  }

  // ── Formato (sin pasar por la zona horaria del navegador) ──────────────────

  etiquetaEstado(estado: EstadoCorte): string {
    return ETIQUETA_ESTADO[estado] ?? estado;
  }

  nombreTipo(corte: CorteProgramado): string {
    return corte.tipo === 'Quincena' ? 'Corte de quincena' : 'Corte de fin de mes';
  }

  nombreCorte(corte: CorteProgramado): string {
    const tipo = corte.tipo === 'Quincena' ? 'Quincena' : 'Fin de mes';
    return `${tipo} de ${MESES[corte.mes - 1].toLowerCase()} ${corte.anio}`;
  }

  /** "2026-10-15" → "15/10/2026" */
  dia(fecha: string): string {
    const [anio, mes, dia] = fecha.slice(0, 10).split('-');
    return `${dia}/${mes}/${anio}`;
  }

  /** "2026-10-15T18:00:00-05:00" → "jueves 15/10/2026, 18:00" */
  fechaHora(fecha: string): string {
    const dia = this.diaDe(fecha);
    const [anio, mes, d] = dia.split('-').map(Number);
    const nombreDia = DIAS[new Date(Date.UTC(anio, mes - 1, d)).getUTCDay()];
    return `${nombreDia} ${this.dia(dia)}, ${this.horaDe(fecha)}`;
  }

  periodo(corte: CorteProgramado): string {
    return `${this.dia(corte.inicioPeriodo)} al ${this.dia(corte.finPeriodo)}`;
  }

  private diaDe(fecha: string): string {
    return fecha.slice(0, 10);
  }

  private horaDe(fecha: string): string {
    return fecha.slice(11, 16);
  }

  /** Muestra un error reemplazando el anterior, para no apilar el mismo aviso en cada clic. */
  private avisarError(titulo: string, detalle: string): void {
    this.cerrarError();
    this.avisoErrorId = this.toast.error(titulo, detalle);
  }

  private cerrarError(): void {
    if (this.avisoErrorId !== null) {
      this.toast.cerrar(this.avisoErrorId);
      this.avisoErrorId = null;
    }
  }

  /** "yyyy-MM-ddTHH:mm" en hora de Ecuador (UTC−5, sin horario de verano), sin depender de la zona del navegador. */
  private ahoraEcuador(): string {
    return new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 16);
  }

  private aplicar(r: CortesProgramadosResponse): void {
    this.habilitado.set(r.habilitado);
    this.cortes.set(r.cortes);
  }

  private mensajeError(err: unknown, porDefecto: string): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 403) {
        return 'No tienes permiso para configurar las fechas de corte. Pide al administrador el módulo "Fechas de Corte".';
      }
      const mensaje = err.error?.mensaje ?? err.error?.Mensaje;
      if (typeof mensaje === 'string' && mensaje.length > 0) {
        return mensaje;
      }
    }
    return porDefecto;
  }
}
