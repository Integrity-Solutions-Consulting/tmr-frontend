import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';
import { ClientesMockService } from '../servicios/clientes-mock.service';
import { ClientesActions } from './clientes.actions';

export const cargarClientesEffect = createEffect(
  (actions$ = inject(Actions), svc = inject(ClientesMockService)) =>
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
  (actions$ = inject(Actions), svc = inject(ClientesMockService)) =>
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

export const crearClienteEffect = createEffect(
  (actions$ = inject(Actions), svc = inject(ClientesMockService)) =>
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
  (actions$ = inject(Actions), svc = inject(ClientesMockService)) =>
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
  (actions$ = inject(Actions), svc = inject(ClientesMockService)) =>
    actions$.pipe(
      ofType(ClientesActions.crearClienteExitoso, ClientesActions.editarClienteExitoso),
      switchMap(() =>
        svc.getClientes(1, 9, { busqueda: '', estado: 'todos' }).pipe(
          map(respuesta => ClientesActions.cargarClientesExitoso({ respuesta })),
          catchError(err  => of(ClientesActions.cargarClientesFallido({ error: err.message })))
        )
      )
    ),
  { functional: true }
);