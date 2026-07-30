import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { Router } from '@angular/router';
import { takeUntil } from 'rxjs/operators';
import * as AuthActions from '../../store/auth.actions';
import * as AuthSelectors from '../../store/auth.selectors';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordComponent implements OnInit, OnDestroy {
  forgotPasswordForm!: FormGroup;
  loading$: Observable<boolean>;
  error$: Observable<string | null>;
  successMessage$: Observable<string | null>;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private store: Store,
    private router: Router
  ) {
    this.loading$ = this.store.select(AuthSelectors.selectIsLoading);
    this.error$ = this.store.select(AuthSelectors.selectError);
    this.successMessage$ = this.store.select(AuthSelectors.selectSuccessMessage);
  }

  ngOnInit(): void {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });

    // Auto-redirect on success
    this.successMessage$.pipe(takeUntil(this.destroy$)).subscribe((message) => {
      if (message) {
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 3000);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    if (this.forgotPasswordForm.valid) {
      this.store.dispatch(
        AuthActions.forgotPassword({ email: this.forgotPasswordForm.value.email })
      );
    }
  }

  goBack(): void {
    this.router.navigate(['/auth/login']);
  }

  get email() {
    return this.forgotPasswordForm.get('email');
  }
}
