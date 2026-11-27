import { DestroyRef, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, distinctUntilChanged, EMPTY, map, switchMap } from 'rxjs';
import { PermisosApiService, PermisoItemApi, obtenerMensajeAmigablePermisos } from './permisos-api.service';
import { NotificacionToastService } from '../../../shared/services/notificacion-toast.service';

export function conectarEnlaceSolicitud(abrir: (item: PermisoItemApi) => void): void {
  const api = inject(PermisosApiService);
  const toast = inject(NotificacionToastService);
  inject(ActivatedRoute).queryParamMap.pipe(
    map(params => Number(params.get('solicitud'))),
    distinctUntilChanged(),
    switchMap(id => Number.isSafeInteger(id) && id > 0 ? api.obtenerSolicitud(id).pipe(
      catchError(err => {
        toast.error('No se pudo abrir la solicitud', obtenerMensajeAmigablePermisos(err, 'La solicitud no está disponible para tu usuario.'));
        return EMPTY;
      }),
    ) : EMPTY),
    takeUntilDestroyed(inject(DestroyRef)),
  ).subscribe(res => { if (res.success && res.data) abrir(res.data); });
}
