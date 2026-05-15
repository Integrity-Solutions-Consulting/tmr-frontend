import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Router } from '@angular/router';
import { Observable, Subject, takeUntil } from 'rxjs';
import { RouterLink } from '@angular/router';
import * as AuthActions from '../../store/auth.actions';
import * as AuthSelectors from '../../store/auth.selectors';
import { Actions, ofType } from '@ngrx/effects';
import { TokenService } from '../../servicios/token.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm!: FormGroup;
  loading$: Observable<boolean>;
  error$: Observable<string | null>;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private store: Store,
    private router: Router,
    private actions$: Actions,
    private tokenService: TokenService
  ) {
    this.loading$ = this.store.select(AuthSelectors.selectIsLoading);
    this.error$ = this.store.select(AuthSelectors.selectError);
  }

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });

    // Redirige a /proyectos cuando el login es exitoso
    this.actions$
      .pipe(
        ofType(AuthActions.loginSuccess),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.router.navigate(['/proyectos']);
      });
  }

  onLogin(): void {
    if (this.loginForm.valid) {
      this.store.dispatch(
        AuthActions.login({ credentials: this.loginForm.value })
      );
    }
  }

  // Acceso rápido para demo sin backend — guarda token y redirige
  onLoginDemo(): void {
    this.tokenService.setToken('mock-demo-token-' + Date.now());
    this.tokenService.setUser(JSON.stringify({ nombre: 'Marlene', email: 'demo@tmr.com' }));
    this.router.navigate(['/proyectos']);
  }

  get email() {
    return this.loginForm.get('email');
  }

  get password() {
    return this.loginForm.get('password');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
