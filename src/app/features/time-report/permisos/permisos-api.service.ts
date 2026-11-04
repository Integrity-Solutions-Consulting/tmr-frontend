import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  HorarioPermisoOficial,
  TipoPermisoOficial,
} from './formulario-permiso-oficial/formulario-permiso-oficial';

export interface ApiEnvelope<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

export interface ProyectoAsignadoPermisoApi {
  idProyecto: number;
  proyectoNombre: string;
  idCliente: number | null;
  clienteNombre: string;
  idLider: number | null;
  liderNombre: string;
  liderTipo: 'INT' | 'EXT';
  liderCorreo?: string | null;
  idAsignacionProyecto?: number | null;
  esAsignacionPropia?: boolean;
}

export interface LiderDisponiblePermisoApi {
  idLider: number;
  nombre: string;
  tipo: 'INT' | 'EXT';
  correo?: string | null;
  esNomina?: boolean;
  tipoContrato?: string;
}

export interface TipoPermisoCatalogoApi {
  id: number;
  codigo: TipoPermisoOficial;
  codigoCorto: string;
  nombre: string;
  requiereAdjunto: boolean;
  orden: number;
}

export interface ContextoColaboradorPermisoApi {
  idEmpleado: number;
  codigoEmpleado: string;
  apellidosNombres: string;
  numeroCedula: string;
  cargo: string;
  area?: string | null;
  correo?: string | null;
  esNomina?: boolean;
  tipoContrato?: string;
  diasDisponibles: number;
  enProceso: number;
  aprobados: number;
  horasAcumuladas: number;
  proyectosAsignados: ProyectoAsignadoPermisoApi[];
  lideresDisponibles: LiderDisponiblePermisoApi[];
  tiposPermiso?: TipoPermisoCatalogoApi[];
}

export interface PermisoItemApi {
  id: number;
  codigo: string;
  idEmpleado: number;
  colaborador: string;
  cedula: string;
  codigoColaborador: string;
  cargo: string;
  area: string;
  idCliente?: number | null;
  cliente: string;
  idProyecto?: number | null;
  proyecto: string;
  idLider?: number | null;
  liderNombre: string;
  liderTipo: 'INT' | 'EXT';
  liderCorreo?: string | null;
  liderEmpresa?: string | null;
  tipoCodigo: string;
  tipo: string;
  tipoOficial: TipoPermisoOficial;
  motivo: string;
  fechaSolicitud: string;
  diaSolicitud: string;
  mesSolicitud: string;
  anioSolicitud: string;
  fechaInicio: string;
  fechaFin: string;
  fechaRegreso: string;
  fechas: string;
  fechaAprobacion: string;
  diasSolicitados: string;
  totalDias: number;
  horario: HorarioPermisoOficial;
  detalleHorario?: string | null;
  horasSolicitadas: string;
  totalHoras: number;
  duracion: string;
  evidenciaNombre?: string | null;
  evidenciaUrl?: string | null;
  tieneEvidencia: boolean;
  aprobadoLider: boolean;
  fechaAprobacionLider?: string | null;
  metodoLider: string;
  comentarioLider?: string | null;
  confirmadoRrhh: boolean;
  responsableRrhh?: string | null;
  fechaConfirmacionRrhh?: string | null;
  observacionRrhh?: string | null;
  impactoTimeReport: 'RESTA_META' | 'SUMA_REPORTADAS' | 'SIN_IMPACTO';
  estadoCodigo: string;
  estadoClase: 'pendiente' | 'rrhh' | 'confirmado' | 'observado' | 'rechazado';
  estadoTexto: string;
  estadoRrhh: 'CONFIRMADO_LIDER' | 'PENDIENTE_LIDER_EXT' | 'APROBADO_RRHH' | 'OBSERVADO_RRHH' | 'RECHAZADO';
  estadoLider: 'Pendiente' | 'Aprobado' | 'Observado' | 'Rechazado';
  comentarios?: string | null;
  traslapeAlerta?: string | null;
  tokenExterno?: string | null;
}

export interface CrearPermisoPayload {
  idProyecto?: number | null;
  idCliente?: number | null;
  idLider?: number | null;
  tipoOficial: TipoPermisoOficial;
  fechaInicio: string;
  fechaFin: string;
  fechaRegreso?: string;
  horario: HorarioPermisoOficial;
  detalleHorario?: string;
  totalDias?: number;
  totalHoras?: number;
  motivo: string;
}

@Injectable({
  providedIn: 'root',
})
export class PermisosApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/permisos`;

  /**
   * ApiResponseInterceptor extrae automáticamente body.data cuando el backend devuelve ApiResponse<T>.
   * Este normalizador soporta tanto la respuesta ya desenvuelta como el sobre completo ApiEnvelope<T>.
   */
  private normalizarEnvelope<T>(raw: unknown): ApiEnvelope<T> {
    if (
      raw &&
      typeof raw === 'object' &&
      !Array.isArray(raw) &&
      'success' in (raw as Record<string, unknown>) &&
      'data' in (raw as Record<string, unknown>)
    ) {
      return raw as ApiEnvelope<T>;
    }

    return {
      success: raw !== null && raw !== undefined,
      statusCode: 200,
      message: 'OK',
      data: raw as T,
    };
  }

  obtenerContexto(): Observable<ApiEnvelope<ContextoColaboradorPermisoApi>> {
    return this.http
      .get<unknown>(`${this.baseUrl}/contexto`)
      .pipe(map((raw) => this.normalizarEnvelope<ContextoColaboradorPermisoApi>(raw)));
  }

  obtenerMisPermisos(): Observable<ApiEnvelope<PermisoItemApi[]>> {
    return this.http
      .get<unknown>(`${this.baseUrl}/mis-permisos`)
      .pipe(map((raw) => this.normalizarEnvelope<PermisoItemApi[]>(raw)));
  }

  crearSolicitud(
    payload: CrearPermisoPayload,
    archivoEvidencia?: File | null,
  ): Observable<ApiEnvelope<PermisoItemApi>> {
    if (archivoEvidencia) {
      const formData = new FormData();
      if (payload.idProyecto) formData.append('idProyecto', String(payload.idProyecto));
      if (payload.idCliente) formData.append('idCliente', String(payload.idCliente));
      if (payload.idLider) formData.append('idLider', String(payload.idLider));
      formData.append('tipoOficial', payload.tipoOficial);
      formData.append('fechaInicio', payload.fechaInicio);
      formData.append('fechaFin', payload.fechaFin);
      if (payload.fechaRegreso) formData.append('fechaRegreso', payload.fechaRegreso);
      formData.append('horario', payload.horario);
      if (payload.detalleHorario) formData.append('detalleHorario', payload.detalleHorario);
      if (payload.totalDias !== undefined) formData.append('totalDias', String(payload.totalDias));
      if (payload.totalHoras !== undefined) formData.append('totalHoras', String(payload.totalHoras));
      formData.append('motivo', payload.motivo);
      formData.append('evidencia', archivoEvidencia, archivoEvidencia.name);
      return this.http
        .post<unknown>(`${this.baseUrl}/con-evidencia`, formData)
        .pipe(map((raw) => this.normalizarEnvelope<PermisoItemApi>(raw)));
    }

    return this.http
      .post<unknown>(this.baseUrl, payload)
      .pipe(map((raw) => this.normalizarEnvelope<PermisoItemApi>(raw)));
  }

  obtenerEquipo(): Observable<ApiEnvelope<PermisoItemApi[]>> {
    return this.http
      .get<unknown>(`${this.baseUrl}/equipo`)
      .pipe(map((raw) => this.normalizarEnvelope<PermisoItemApi[]>(raw)));
  }

  registrarDecisionLider(
    id: number,
    accion: 'aprobar' | 'observar' | 'rechazar',
    comentario: string,
  ): Observable<ApiEnvelope<PermisoItemApi>> {
    return this.http
      .post<unknown>(`${this.baseUrl}/${id}/decision-lider`, {
        accion,
        comentario,
      })
      .pipe(map((raw) => this.normalizarEnvelope<PermisoItemApi>(raw)));
  }

  obtenerBandejaRrhh(): Observable<ApiEnvelope<PermisoItemApi[]>> {
    return this.http
      .get<unknown>(`${this.baseUrl}/rrhh`)
      .pipe(map((raw) => this.normalizarEnvelope<PermisoItemApi[]>(raw)));
  }

  registrarDecisionRrhh(
    id: number,
    accion: 'confirmar' | 'devolver',
    impactoTimeReport: 'RESTA_META' | 'SUMA_REPORTADAS' | 'SIN_IMPACTO',
    observacion: string,
  ): Observable<ApiEnvelope<PermisoItemApi>> {
    return this.http
      .post<unknown>(`${this.baseUrl}/${id}/decision-rrhh`, {
        accion,
        impactoTimeReport,
        observacion,
      })
      .pipe(map((raw) => this.normalizarEnvelope<PermisoItemApi>(raw)));
  }

  reenviarEnlaceExterno(id: number): Observable<ApiEnvelope<PermisoItemApi>> {
    return this.http
      .post<unknown>(`${this.baseUrl}/${id}/reenviar-enlace`, {})
      .pipe(map((raw) => this.normalizarEnvelope<PermisoItemApi>(raw)));
  }

  obtenerHistorialGerencia(): Observable<ApiEnvelope<PermisoItemApi[]>> {
    return this.http
      .get<unknown>(`${this.baseUrl}/gerencia`)
      .pipe(map((raw) => this.normalizarEnvelope<PermisoItemApi[]>(raw)));
  }

  obtenerPorTokenExterno(token: string): Observable<ApiEnvelope<PermisoItemApi>> {
    return this.http
      .get<unknown>(`${this.baseUrl}/externo/${encodeURIComponent(token)}`)
      .pipe(map((raw) => this.normalizarEnvelope<PermisoItemApi>(raw)));
  }

  registrarDecisionExterna(
    token: string,
    accion: 'aprobar' | 'rechazar',
    comentario: string,
  ): Observable<ApiEnvelope<PermisoItemApi>> {
    return this.http
      .post<unknown>(`${this.baseUrl}/externo/${encodeURIComponent(token)}/decision`, {
        accion,
        comentario,
      })
      .pipe(map((raw) => this.normalizarEnvelope<PermisoItemApi>(raw)));
  }

  obtenerUrlEvidencia(id: number): string {
    return `${this.baseUrl}/${id}/evidencia`;
  }

  descargarEvidenciaBlob(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/evidencia`, { responseType: 'blob' });
  }

  obtenerUrlEvidenciaExterna(token: string): string {
    return `${this.baseUrl}/externo/${encodeURIComponent(token)}/evidencia`;
  }

  obtenerUrlPdfBackend(id: number): string {
    return `${this.baseUrl}/${id}/pdf`;
  }
}
