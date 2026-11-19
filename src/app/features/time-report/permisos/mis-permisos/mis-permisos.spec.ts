import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { EMPTY } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MisPermisosComponent, SolicitudColaborador } from './mis-permisos';
import { PermisosApiService } from '../permisos-api.service';
import { PermisosPdfService } from '../permisos-pdf.service';
import { NotificacionToastService } from '../../../../shared/services/notificacion-toast.service';

const api = { crearSolicitud: vi.fn(() => EMPTY), obtenerContexto: vi.fn(() => EMPTY), obtenerMisPermisos: vi.fn(() => EMPTY) };
const toast = { error: vi.fn(), warning: vi.fn(), exito: vi.fn() };
beforeEach(() => {
  vi.clearAllMocks();
  TestBed.configureTestingModule({ providers: [
    { provide: PermisosApiService, useValue: api },
    { provide: PermisosPdfService, useValue: {} },
    { provide: NotificacionToastService, useValue: toast },
    { provide: ActivatedRoute, useValue: { queryParamMap: EMPTY } },
  ] });
});
afterEach(() => TestBed.resetTestingModule());
const solicitud = (estadoClase: SolicitudColaborador['estadoClase'] = 'observado') => ({
  tipo: 'Vacaciones', fechas: '', fechaAprobacion: '', diasSolicitados: '1', horasSolicitadas: '8', duracion: '', cliente: '', proyecto: '', lider: '', tipoLider: 'INT', evidencia: null, aprobadoLider: false, confirmadoRrhh: false, estadoTexto: 'Observado',
  id: 42, codigo: 'PER-42', versionSolicitud: '123456', estadoClase,
  motivo: 'Motivo original', tipoOficial: 'VACACIONES', fechaInicio: '2030-01-08',
  fechaFin: '2030-01-08', fechaRegreso: '2030-01-09', horario: 'COMPLETA',
  detalleHorario: '08:30 - 17:30', adjuntos: [],
} as SolicitudColaborador);
const crear = () => TestBed.runInInjectionContext(() => new MisPermisosComponent());
describe('Corrección de solicitudes', () => {
  it.each(['pendiente', 'rrhh', 'confirmado', 'rechazado'] as const)('impide editar %s', estado => {
    const c = crear(); c.editarObservada(solicitud(estado));
    expect(c.modalNuevaVisible()).toBe(false);
    expect(toast.error).toHaveBeenCalled();
    expect(api.crearSolicitud).not.toHaveBeenCalled();
  });
  it('precarga los datos y reenvía el mismo ID y versión sin duplicar el clic', () => {
    const c = crear(); c.editarObservada(solicitud());
    expect(c.motivoForm()).toBe('Motivo original');
    expect(c.fechaInicioForm()).toBe('2030-01-08');
    c.motivoForm.set('Motivo corregido');
    c.guardarNuevaSolicitud(); c.guardarNuevaSolicitud();
    expect(api.crearSolicitud).toHaveBeenCalledTimes(1);
    expect(api.crearSolicitud).toHaveBeenCalledWith(expect.objectContaining({ motivo: 'Motivo corregido' }), [], 42, '123456');
  });
  it('abrir una nueva solicitud abandona el modo de corrección', () => {
    const c = crear(); c.editarObservada(solicitud()); c.abrirNuevaSolicitud();
    expect(c.editandoSolicitud()).toBeNull();
  });
});
