import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { catchError, map, of, switchMap, withLatestFrom } from 'rxjs';
import { ClientesService } from '../servicios/clientes.service';
import { ClientesActions } from './clientes.actions';
import { selectFiltros, selectPaginaActual, selectTamanoPagina } from './clientes.reducer';

export const cargarClientesEffect = createEffect(
  (actions$ = inject(Actions), svc = inject(ClientesService)) =>
    actions$.pipe(
      ofType(ClientesActions.cargarClientes),
      switchMap(({ pagina, tamanoPagina, filtros }) =>
        svc.getClientes(pagina, tamanoPagina, filtros).pipe(
          map(respuesta => ClientesActions.cargarClientesExitoso({ respuesta })),
          catchError(err  => of(ClientesActions.cargarClientesFallido({ error: err.message })))
        )
      )
    ),
  { functional: true }
);

export const cargarClientePorIdEffect = createEffect(
  (actions$ = inject(Actions), svc = inject(ClientesService)) =>
    actions$.pipe(
      ofType(ClientesActions.cargarClientePorId),
      switchMap(({ id }) =>
        svc.getClientePorId(id).pipe(
          map(cliente => ClientesActions.cargarClientePorIdExitoso({ cliente })),
          catchError(err  => of(ClientesActions.cargarClientePorIdFallido({ error: err.message })))
        )
      )
    ),
  { functional: true }
);

export const cargarResumenClientesEffect = createEffect(
  (actions$ = inject(Actions), svc = inject(ClientesService)) =>
    actions$.pipe(
      ofType(ClientesActions.cargarResumenClientes),
      switchMap(() =>
        svc.getResumenClientes().pipe(
          map(resumen => ClientesActions.cargarResumenClientesExitoso({ resumen })),
          catchError(err => of(ClientesActions.cargarResumenClientesFallido({ error: err.message })))
        )
      )
    ),
  { functional: true }
);

export const crearClienteEffect = createEffect(
  (actions$ = inject(Actions), svc = inject(ClientesService)) =>
    actions$.pipe(
      ofType(ClientesActions.crearCliente),
      switchMap(({ request }) =>
        svc.crearCliente(request).pipe(
          map(cliente => ClientesActions.crearClienteExitoso({ cliente })),
          catchError(err  => of(ClientesActions.crearClienteFallido({ error: err.message })))
        )
      )
    ),
  { functional: true }
);

export const editarClienteEffect = createEffect(
  (actions$ = inject(Actions), svc = inject(ClientesService)) =>
    actions$.pipe(
      ofType(ClientesActions.editarCliente),
      switchMap(({ id, request }) =>
        svc.editarCliente(id, request).pipe(
          map(cliente => ClientesActions.editarClienteExitoso({ cliente })),
          catchError(err  => of(ClientesActions.editarClienteFallido({ error: err.message })))
        )
      )
    ),
  { functional: true }
);

export const recargarTrasCrearEffect = createEffect(
  (actions$ = inject(Actions), svc = inject(ClientesService), store = inject(Store)) =>
    actions$.pipe(
      ofType(ClientesActions.crearClienteExitoso, ClientesActions.editarClienteExitoso),
      withLatestFrom(
        store.select(selectFiltros),
        store.select(selectTamanoPagina),
        store.select(selectPaginaActual)
      ),
      switchMap(([_, filtros, tamanoPagina, paginaActual]) =>
        svc.getClientes(paginaActual, tamanoPagina, filtros).pipe(
          map(respuesta => ClientesActions.cargarClientesExitoso({ respuesta })),
          catchError(err  => of(ClientesActions.cargarClientesFallido({ error: err.message })))
        )
      )
    ),
  { functional: true }
);

export const recargarResumenTrasGuardarEffect = createEffect(
  (actions$ = inject(Actions), svc = inject(ClientesService)) =>
    actions$.pipe(
      ofType(ClientesActions.crearClienteExitoso, ClientesActions.editarClienteExitoso),
      switchMap(() =>
        svc.getResumenClientes().pipe(
          map(resumen => ClientesActions.cargarResumenClientesExitoso({ resumen })),
          catchError(err => of(ClientesActions.cargarResumenClientesFallido({ error: err.message })))
        )
      )
    ),
  { functional: true }
);
