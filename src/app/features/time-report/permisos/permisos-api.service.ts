import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  HorarioPermisoOficial,
  TipoPermisoOficial,
} from './formulario-permiso-oficial/formulario-permiso-oficial';

/** Página de resultados paginada en servidor (viaja dentro de "data"). */
export interface PaginaApi<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface ApiEnvelope<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

export interface ResumenGestionRrhhApi {
  porConfirmar: number;
  pendientesLiderExterno: number;
  confirmadas: number;
  totalHistorial: number;
  porVerificar: number;
  totalColaboradores: number;
  aniosDisponibles: number[];
}

export interface PaginaConsultaRrhh {
  page: number;
  pageSize: number;
  buscar?: string | null;
}

/** Indicadores de Mis permisos, Aprobaciones del líder e Historial de gerencia. */
export interface ResumenListadoPermisosApi {
  total: number;
  enProceso: number;
  confirmados: number;
  rechazados: number;
  pendientesLider: number;
  aprobadosLider: number;
  ausentesHoy: number;
  proyectos: string[];
}

export interface PaginaPermisosApi extends PaginaApi<PermisoItemApi> {
  resumen: ResumenListadoPermisosApi;
}

/** Filtros comunes de los listados de solicitudes; sin page/pageSize se recibe la lista completa filtrada. */
export interface ConsultaListadoPermisos {
  page?: number;
  pageSize?: number;
  buscar?: string | null;
  tipo?: string | null;
  estado?: string | null;
  desde?: string | null;
  hasta?: string | null;
  proyecto?: string | null;
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
  rrhhDisponibles?: RrhhDisponiblePermisoApi[];
  regimenVacaciones?: 'AFILIADO' | 'MIXTO' | 'FACTURA';
  tieneDerechoVacaciones?: boolean;
  fechaInicioVacaciones?: string | null;
  diasGanadosAcumulados?: number;
  diasConsumidosVacaciones?: number;
  diasAjusteVacaciones?: number;
  diasProporcionalesCiclo?: number;
  maximoAnticipoDias?: number;
}

export interface RrhhDisponiblePermisoApi {
  idUsuario: number;
  nombre: string;
  cargo?: string | null;
  correo?: string | null;
  esPrincipal?: boolean;
}

export interface AdjuntoPermisoApi {
  id: number;
  nombreOriginal: string;
  contentType: string;
  tamanoBytes: number;
  fechaSubida: string;
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
  avisoNotificacion?: string | null;
  versionSolicitud?: string | null;
  adjuntos?: AdjuntoPermisoApi[];
  descuentaVacaciones?: boolean;
  esRecuperable?: boolean;
  esAnticipada?: boolean;
  esHistorico?: boolean;
  verificadoRrhh?: boolean;
  observacionMigracion?: string | null;
}

export interface ColaboradorSelectorPermisoApi {
  idEmpleado: number;
  codigoEmpleado: string;
  cedula: string;
  apellidosNombres: string;
  regimen: 'AFILIADO' | 'MIXTO' | 'FACTURA';
  tipoContrato: string;
  empresa?: string | null;
  activo: boolean;
}

export interface GuardarPermisoRrhhPayload {
  idEmpleado: number;
  tipoOficial: TipoPermisoOficial;
  fechaInicio: string;
  fechaFin: string;
  fechaRegreso?: string | null;
  totalDias?: number | null;
  horario?: HorarioPermisoOficial;
  detalleHorario?: string | null;
  motivo: string;
  descuentaVacaciones: boolean;
  esRecuperable: boolean;
  esAnticipada: boolean;
  esHistorico: boolean;
  verificadoRrhh: boolean;
  observacionMigracion?: string | null;
  estadoCodigo?: string | null;
  impactoTimeReport?: 'RESTA_META' | 'SUMA_REPORTADAS' | 'SIN_IMPACTO' | null;
}

export interface AjusteVacacionesItemApi {
  id: number;
  tipoAjuste: 'AJUSTE_DIAS' | 'EXCEPCION_FACTURA' | 'FECHA_AFILIACION';
  diasAjuste: number;
  permiteVacaciones?: boolean | null;
  motivo: string;
  usuarioCreacion: string;
  fechaCreacion: string;
  /** dd/MM/yyyy, solo para FECHA_AFILIACION */
  fechaAfiliacionBase?: string | null;
}

export interface SaldoVacacionesColaboradorApi {
  idEmpleado: number;
  codigoEmpleado: string;
  cedula: string;
  apellidosNombres: string;
  cargo: string;
  empresa?: string | null;
  tipoContrato: string;
  regimen: 'AFILIADO' | 'MIXTO' | 'FACTURA';
  tieneDerechoVacaciones: boolean;
  excepcionFacturaActiva: boolean;
  fechaIngresoOriginal?: string | null;
  /** Procedencia de la fecha base: Contrato, Afiliación registrada en HC / por RR. HH. o Ingreso general. */
  origenFechaInicioVacaciones?: string | null;
  fechaInicioVacaciones?: string | null;
  aniosAntiguedad: number;
  diasGanadosAcumulados: number;
  diasProporcionalesCiclo: number;
  diasConsumidos: number;
  diasAjuste: number;
  saldoDisponible: number;
  totalRegistrosHistorial: number;
  registrosPorVerificar: number;
  ajustes: AjusteVacacionesItemApi[];
}

export interface CrearAjusteVacacionesPayload {
  tipoAjuste: 'AJUSTE_DIAS' | 'EXCEPCION_FACTURA' | 'FECHA_AFILIACION';
  diasAjuste: number;
  permiteVacaciones?: boolean | null;
  motivo: string;
  /** YYYY-MM-DD, requerido para FECHA_AFILIACION */
  fechaAfiliacionBase?: string | null;
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
  idUsuarioRrhh?: number | null;
  motivo: string;
}

/**
 * Traduce cualquier error técnico o código HTTP a un mensaje claro y empático para el usuario,
 * evitando mostrar errores 500 crudos, jerga de infraestructura o trazas técnicas.
 */
export function obtenerMensajeAmigablePermisos(
  err: unknown,
  mensajeRespaldo = 'No pudimos completar la acción en este momento. Por favor inténtalo nuevamente.',
): string {
  const httpErr = err as {
    status?: number;
    message?: string;
    error?: { message?: string; errors?: string[] } | string | null;
  } | null;

  const status = typeof httpErr?.status === 'number' ? httpErr.status : undefined;

  if (status === 0) {
    return 'No pudimos conectarnos en este momento. Revisa tu conexión a internet e inténtalo nuevamente.';
  }
  if (status === 401) {
    return 'Tu sesión expiró por seguridad. Vuelve a iniciar sesión para continuar.';
  }
  if (status === 403) {
    return 'No cuentas con permisos para realizar esta acción.';
  }
  if (status === 413) {
    return 'El archivo adjunto supera el tamaño máximo permitido de 15 MB por documento.';
  }
  if (status === 429) {
    return 'Realizaste varios intentos seguidos. Espera unos segundos antes de volver a intentarlo.';
  }
  if (typeof status === 'number' && status >= 500) {
    return 'El sistema presenta una intermitencia momentánea. Tu información está segura; inténtalo de nuevo en unos segundos.';
  }

  const cuerpoObj =
    httpErr?.error && typeof httpErr.error === 'object' ? httpErr.error : undefined;
  const candidato =
    cuerpoObj?.message ||
    (Array.isArray(cuerpoObj?.errors) ? cuerpoObj.errors[0] : undefined) ||
    (typeof httpErr?.error === 'string' ? httpErr.error : undefined);

  if (candidato && typeof candidato === 'string') {
    const limpio = candidato.replace(/\s*\((?:RF|RNF)-\d+\)/gi, '').trim();
    const pareceTecnico =
      /Http failure response|Exception|Npgsql|StackTrace|MinIO|Apprise|S3|Socket|ECONNREFUSED|500 Internal/i.test(
        limpio,
      );
    if (limpio && !pareceTecnico) {
      return limpio;
    }
  }

  return mensajeRespaldo;
}

export interface EnvioPermiso {
  id: string; canal: string; destinatario: string; fecha: string; estado: string;
  intentos: number; puedeReintentar: boolean; reintentadoPor?: string; fechaReintento?: string;
}
export interface HistorialEnviosPermiso {
  envios: EnvioPermiso[];
  campana: { id: number; titulo: string; leida: boolean; fechaCreacion: string }[];
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

  obtenerSolicitud(id: number): Observable<ApiEnvelope<PermisoItemApi>> {
    return this.http.get<unknown>(`${this.baseUrl}/${id}`).pipe(map(raw => this.normalizarEnvelope<PermisoItemApi>(raw)));
  }

  obtenerEnvios(id: number): Observable<ApiEnvelope<HistorialEnviosPermiso>> {
    return this.http.get<unknown>(`${this.baseUrl}/${id}/envios`).pipe(map(raw => this.normalizarEnvelope<HistorialEnviosPermiso>(raw)));
  }

  reintentarEnvio(id: number, envio: string): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/${id}/envios/${encodeURIComponent(envio)}/reintentar`, {});
  }

  obtenerContexto(): Observable<ApiEnvelope<ContextoColaboradorPermisoApi>> {
    return this.http
      .get<unknown>(`${this.baseUrl}/contexto`)
      .pipe(map((raw) => this.normalizarEnvelope<ContextoColaboradorPermisoApi>(raw)));
  }

  obtenerMisPermisos(consulta: ConsultaListadoPermisos & { page: number; pageSize: number }): Observable<ApiEnvelope<PaginaPermisosApi>> {
    return this.http
      .get<unknown>(`${this.baseUrl}/mis-permisos`, { params: this.construirParams({ ...consulta }) })
      .pipe(map((raw) => this.normalizarEnvelope<PaginaPermisosApi>(raw)));
  }

  crearSolicitud(
    payload: CrearPermisoPayload,
    archivosEvidencia?: File | File[] | null,
    idSolicitudObservada?: number,
    versionSolicitud?: string | null,
  ): Observable<ApiEnvelope<PermisoItemApi>> {
    const listaArchivos = Array.isArray(archivosEvidencia)
      ? archivosEvidencia.filter(Boolean)
      : archivosEvidencia
        ? [archivosEvidencia]
        : [];

    if (listaArchivos.length > 0) {
      const formData = new FormData();
      if (versionSolicitud) formData.append("versionSolicitud", versionSolicitud);
      if (idSolicitudObservada) formData.append("idSolicitudObservada", String(idSolicitudObservada));
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
      if (payload.idUsuarioRrhh) formData.append('idUsuarioRrhh', String(payload.idUsuarioRrhh));
      for (const archivo of listaArchivos) {
        formData.append('evidencia', archivo, archivo.name);
      }
      return this.http
        .post<unknown>(`${this.baseUrl}/con-evidencia`, formData)
        .pipe(map((raw) => this.normalizarEnvelope<PermisoItemApi>(raw)));
    }

    return this.http
      .post<unknown>(this.baseUrl, { ...payload, idSolicitudObservada, versionSolicitud })
      .pipe(map((raw) => this.normalizarEnvelope<PermisoItemApi>(raw)));
  }

  obtenerEquipo(consulta: ConsultaListadoPermisos & { page: number; pageSize: number }): Observable<ApiEnvelope<PaginaPermisosApi>> {
    return this.http
      .get<unknown>(`${this.baseUrl}/equipo`, { params: this.construirParams({ ...consulta }) })
      .pipe(map((raw) => this.normalizarEnvelope<PaginaPermisosApi>(raw)));
  }

  registrarDecisionLider(
    id: number,
    accion: 'aprobar' | 'observar' | 'rechazar',
    comentario: string,
    versionSolicitud?: string | null,
  ): Observable<ApiEnvelope<PermisoItemApi>> {
    return this.http
      .post<unknown>(`${this.baseUrl}/${id}/decision-lider`, {
        accion,
        comentario,
        versionSolicitud,
      })
      .pipe(map((raw) => this.normalizarEnvelope<PermisoItemApi>(raw)));
  }

  obtenerBandejaRrhh(
    consulta?: PaginaConsultaRrhh & {
      bandeja?: 'POR_CONFIRMAR' | 'LIDER_EXTERNO' | 'HISTORIAL';
      tipo?: string | null;
      desde?: string | null;
      hasta?: string | null;
    },
  ): Observable<ApiEnvelope<PaginaApi<PermisoItemApi>>> {
    const params = this.construirParams({ ...consulta });
    return this.http
      .get<unknown>(`${this.baseUrl}/rrhh`, { params })
      .pipe(map((raw) => this.normalizarEnvelope<PaginaApi<PermisoItemApi>>(raw)));
  }

  obtenerResumenRrhh(): Observable<ApiEnvelope<ResumenGestionRrhhApi>> {
    return this.http
      .get<unknown>(`${this.baseUrl}/rrhh/resumen`)
      .pipe(map((raw) => this.normalizarEnvelope<ResumenGestionRrhhApi>(raw)));
  }

  /** Convierte un objeto de filtros en query params, omitiendo vacíos y el valor 'TODOS'. */
  private construirParams(valores: Record<string, unknown>): Record<string, string> {
    const params: Record<string, string> = {};
    for (const [clave, valor] of Object.entries(valores)) {
      if (valor === null || valor === undefined || valor === '' || valor === false || valor === 'TODOS') continue;
      params[clave] = String(valor);
    }
    return params;
  }

  obtenerColaboradoresRrhh(): Observable<ApiEnvelope<ColaboradorSelectorPermisoApi[]>> {
    return this.http
      .get<unknown>(`${this.baseUrl}/rrhh/colaboradores`)
      .pipe(map((raw) => this.normalizarEnvelope<ColaboradorSelectorPermisoApi[]>(raw)));
  }

  obtenerHistorialEditableRrhh(filtros: PaginaConsultaRrhh & {
    idEmpleado?: number | null;
    anio?: number | string | null;
    tipo?: string | null;
    soloPendientesVerificar?: boolean;
    soloHistoricos?: boolean;
  }): Observable<ApiEnvelope<PaginaApi<PermisoItemApi>>> {
    const params = this.construirParams({ ...filtros });
    return this.http
      .get<unknown>(`${this.baseUrl}/rrhh/historial`, { params })
      .pipe(map((raw) => this.normalizarEnvelope<PaginaApi<PermisoItemApi>>(raw)));
  }

  crearRegistroRrhh(payload: GuardarPermisoRrhhPayload): Observable<ApiEnvelope<PermisoItemApi>> {
    return this.http
      .post<unknown>(`${this.baseUrl}/rrhh/registro`, payload)
      .pipe(map((raw) => this.normalizarEnvelope<PermisoItemApi>(raw)));
  }

  actualizarRegistroRrhh(
    id: number,
    payload: GuardarPermisoRrhhPayload,
  ): Observable<ApiEnvelope<PermisoItemApi>> {
    return this.http
      .put<unknown>(`${this.baseUrl}/rrhh/${id}`, payload)
      .pipe(map((raw) => this.normalizarEnvelope<PermisoItemApi>(raw)));
  }

  anularRegistroRrhh(id: number): Observable<ApiEnvelope<{ id: number }>> {
    return this.http
      .delete<unknown>(`${this.baseUrl}/rrhh/${id}`)
      .pipe(map((raw) => this.normalizarEnvelope<{ id: number }>(raw)));
  }

  obtenerSaldosVacacionesRrhh(
    consulta?: PaginaConsultaRrhh & {
      regimen?: 'TODOS' | 'AFILIADO' | 'MIXTO' | 'FACTURA';
      soloSaldoNegativo?: boolean;
    },
  ): Observable<ApiEnvelope<PaginaApi<SaldoVacacionesColaboradorApi>>> {
    const params = this.construirParams({ ...consulta });
    return this.http
      .get<unknown>(`${this.baseUrl}/rrhh/saldos`, { params })
      .pipe(map((raw) => this.normalizarEnvelope<PaginaApi<SaldoVacacionesColaboradorApi>>(raw)));
  }

  crearAjusteVacacionesRrhh(
    idEmpleado: number,
    payload: CrearAjusteVacacionesPayload,
  ): Observable<ApiEnvelope<AjusteVacacionesItemApi>> {
    return this.http
      .post<unknown>(`${this.baseUrl}/rrhh/saldos/${idEmpleado}/ajuste`, payload)
      .pipe(map((raw) => this.normalizarEnvelope<AjusteVacacionesItemApi>(raw)));
  }

  anularAjusteVacacionesRrhh(idAjuste: number): Observable<ApiEnvelope<{ id: number }>> {
    return this.http
      .delete<unknown>(`${this.baseUrl}/rrhh/saldos/ajustes/${idAjuste}`)
      .pipe(map((raw) => this.normalizarEnvelope<{ id: number }>(raw)));
  }

  registrarDecisionRrhh(
    id: number,
    accion: 'confirmar' | 'devolver',
    impactoTimeReport: 'RESTA_META' | 'SUMA_REPORTADAS' | 'SIN_IMPACTO',
    observacion: string,
    versionSolicitud?: string | null,
  ): Observable<ApiEnvelope<PermisoItemApi>> {
    return this.http
      .post<unknown>(`${this.baseUrl}/${id}/decision-rrhh`, {
        accion,
        impactoTimeReport,
        observacion,
        versionSolicitud,
      })
      .pipe(map((raw) => this.normalizarEnvelope<PermisoItemApi>(raw)));
  }

  reenviarEnlaceExterno(id: number): Observable<ApiEnvelope<PermisoItemApi>> {
    return this.http
      .post<unknown>(`${this.baseUrl}/${id}/reenviar-enlace`, {})
      .pipe(map((raw) => this.normalizarEnvelope<PermisoItemApi>(raw)));
  }

  obtenerHistorialGerencia(consulta: ConsultaListadoPermisos & { page: number; pageSize: number }): Observable<ApiEnvelope<PaginaPermisosApi>> {
    return this.http
      .get<unknown>(`${this.baseUrl}/gerencia`, { params: this.construirParams({ ...consulta }) })
      .pipe(map((raw) => this.normalizarEnvelope<PaginaPermisosApi>(raw)));
  }

  /** Historial de gerencia completo con los filtros vigentes (selección masiva para reportes). */
  obtenerHistorialGerenciaCompleto(consulta: Omit<ConsultaListadoPermisos, 'page' | 'pageSize'>): Observable<ApiEnvelope<PermisoItemApi[]>> {
    return this.http
      .get<unknown>(`${this.baseUrl}/gerencia`, { params: this.construirParams({ ...consulta }) })
      .pipe(map((raw) => this.normalizarEnvelope<PermisoItemApi[]>(raw)));
  }

  obtenerPorTokenExterno(token: string): Observable<ApiEnvelope<PermisoItemApi>> {
    return this.http
      .get<unknown>(`${this.baseUrl}/externo/${encodeURIComponent(token)}`)
      .pipe(map((raw) => this.normalizarEnvelope<PermisoItemApi>(raw)));
  }

  registrarDecisionExterna(
    token: string,
    accion: 'aprobar' | 'observar' | 'rechazar',
    comentario: string,
    versionSolicitud?: string | null,
  ): Observable<ApiEnvelope<PermisoItemApi>> {
    return this.http
      .post<unknown>(`${this.baseUrl}/externo/${encodeURIComponent(token)}/decision`, {
        accion,
        comentario,
        versionSolicitud,
      })
      .pipe(map((raw) => this.normalizarEnvelope<PermisoItemApi>(raw)));
  }

  obtenerUrlEvidencia(id: number, adjuntoId?: number): string {
    return adjuntoId
      ? `${this.baseUrl}/${id}/evidencia?adjuntoId=${adjuntoId}`
      : `${this.baseUrl}/${id}/evidencia`;
  }

  descargarEvidenciaBlob(id: number, adjuntoId?: number): Observable<Blob> {
    const url = this.obtenerUrlEvidencia(id, adjuntoId);
    return this.http.get(url, { responseType: 'blob' });
  }

  obtenerUrlEvidenciaExterna(token: string, adjuntoId?: number): string {
    const base = `${this.baseUrl}/externo/${encodeURIComponent(token)}/evidencia`;
    return adjuntoId ? `${base}?adjuntoId=${adjuntoId}` : base;
  }

  descargarEvidenciaExternaBlob(token: string, adjuntoId?: number): Observable<Blob> {
    return this.http.get(this.obtenerUrlEvidenciaExterna(token, adjuntoId), { responseType: 'blob' });
  }

  obtenerUrlPdfBackend(id: number): string {
    return `${this.baseUrl}/${id}/pdf`;
  }

  descargarPdfBlob(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${id}/pdf`, { responseType: 'blob' });
  }

  descargarPdfExternoBlob(token: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/externo/${encodeURIComponent(token)}/pdf`, {
      responseType: 'blob',
    });
  }
}
