import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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
}

export interface LiderDisponiblePermisoApi {
  idLider: number;
  nombre: string;
  tipo: 'INT' | 'EXT';
  correo?: string | null;
}

export interface ContextoColaboradorPermisoApi {
  idEmpleado: number;
  codigoEmpleado: string;
  apellidosNombres: string;
  numeroCedula: string;
  cargo: string;
  area?: string | null;
  correo?: string | null;
  diasDisponibles: number;
  enProceso: number;
  aprobados: number;
  horasAcumuladas: number;
  proyectosAsignados: ProyectoAsignadoPermisoApi[];
  lideresDisponibles: LiderDisponiblePermisoApi[];
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

  obtenerContexto(): Observable<ApiEnvelope<ContextoColaboradorPermisoApi>> {
    return this.http.get<ApiEnvelope<ContextoColaboradorPermisoApi>>(`${this.baseUrl}/contexto`);
  }

  obtenerMisPermisos(): Observable<ApiEnvelope<PermisoItemApi[]>> {
    return this.http.get<ApiEnvelope<PermisoItemApi[]>>(`${this.baseUrl}/mis-permisos`);
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
      return this.http.post<ApiEnvelope<PermisoItemApi>>(`${this.baseUrl}/con-evidencia`, formData);
    }

    return this.http.post<ApiEnvelope<PermisoItemApi>>(this.baseUrl, payload);
  }

  obtenerEquipo(): Observable<ApiEnvelope<PermisoItemApi[]>> {
    return this.http.get<ApiEnvelope<PermisoItemApi[]>>(`${this.baseUrl}/equipo`);
  }

  registrarDecisionLider(
    id: number,
    accion: 'aprobar' | 'observar' | 'rechazar',
    comentario: string,
  ): Observable<ApiEnvelope<PermisoItemApi>> {
    return this.http.post<ApiEnvelope<PermisoItemApi>>(`${this.baseUrl}/${id}/decision-lider`, {
      accion,
      comentario,
    });
  }

  obtenerBandejaRrhh(): Observable<ApiEnvelope<PermisoItemApi[]>> {
    return this.http.get<ApiEnvelope<PermisoItemApi[]>>(`${this.baseUrl}/rrhh`);
  }

  registrarDecisionRrhh(
    id: number,
    accion: 'confirmar' | 'devolver',
    impactoTimeReport: 'RESTA_META' | 'SUMA_REPORTADAS' | 'SIN_IMPACTO',
    observacion: string,
  ): Observable<ApiEnvelope<PermisoItemApi>> {
    return this.http.post<ApiEnvelope<PermisoItemApi>>(`${this.baseUrl}/${id}/decision-rrhh`, {
      accion,
      impactoTimeReport,
      observacion,
    });
  }

  reenviarEnlaceExterno(id: number): Observable<ApiEnvelope<PermisoItemApi>> {
    return this.http.post<ApiEnvelope<PermisoItemApi>>(
      `${this.baseUrl}/${id}/reenviar-enlace`,
      {},
    );
  }

  obtenerHistorialGerencia(): Observable<ApiEnvelope<PermisoItemApi[]>> {
    return this.http.get<ApiEnvelope<PermisoItemApi[]>>(`${this.baseUrl}/gerencia`);
  }

  obtenerPorTokenExterno(token: string): Observable<ApiEnvelope<PermisoItemApi>> {
    return this.http.get<ApiEnvelope<PermisoItemApi>>(`${this.baseUrl}/externo/${encodeURIComponent(token)}`);
  }

  registrarDecisionExterna(
    token: string,
    accion: 'aprobar' | 'rechazar',
    comentario: string,
  ): Observable<ApiEnvelope<PermisoItemApi>> {
    return this.http.post<ApiEnvelope<PermisoItemApi>>(
      `${this.baseUrl}/externo/${encodeURIComponent(token)}/decision`,
      { accion, comentario },
    );
  }

  obtenerUrlEvidencia(id: number): string {
    return `${this.baseUrl}/${id}/evidencia`;
  }

  obtenerUrlPdfBackend(id: number): string {
    return `${this.baseUrl}/${id}/pdf`;
  }
}
