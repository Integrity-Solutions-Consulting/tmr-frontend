import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { catchError, map, mergeMap } from 'rxjs/operators';
import * as DashboardActions from './dashboard.actions';
import { DashboardService } from '../servicios/dashboard.service';

@Injectable()
export class DashboardEffects {

  loadDashboardData$!: any;

  constructor(
    private actions$: Actions,
    private dashboardService: DashboardService
  ) {
    this.loadDashboardData$ = createEffect(() =>
      this.actions$.pipe(
        ofType(DashboardActions.loadDashboardData),
        mergeMap(() =>
          this.dashboardService.getDashboardData().pipe(
            map(data => DashboardActions.loadDashboardDataSuccess({ data })),
            catchError(error => of(DashboardActions.loadDashboardDataFailure({ error })))
          )
        )
      )
    );
  }
}
