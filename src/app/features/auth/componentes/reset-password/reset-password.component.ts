import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';
import * as AuthActions from '../../store/auth.actions';
import * as AuthSelectors from '../../store/auth.selectors';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
  resetPasswordForm!: FormGroup;
  loading$: Observable<boolean>;
  error$: Observable<string | null>;
  successMessage$: Observable<string | null>;
  showPassword = false;
  showConfirmPassword = false;
  token: string | null = null;
  tokenInvalid = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private store: Store,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.loading$ = this.store.select(AuthSelectors.selectIsLoading);
    this.error$ = this.store.select(AuthSelectors.selectError);
    this.successMessage$ = this.store.select(AuthSelectors.selectSuccessMessage);
  }

  ngOnInit(): void {
    // Extract token from URL
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.token = params['token'];
      if (!this.token) {
        this.tokenInvalid = true;
      }
    });

    this.resetPasswordForm = this.fb.group(
      {
        newPassword: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: this.passwordsMatchValidator }
    );

    // Auto-redirect on success
    this.successMessage$.pipe(takeUntil(this.destroy$)).subscribe((message) => {
      if (message) {
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 2000);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    if (this.resetPasswordForm.valid && this.token) {
      this.store.dispatch(
        AuthActions.resetPassword({
          request: {
            token: this.token,
            newPassword: this.resetPasswordForm.get('newPassword')?.value,
            confirmPassword: this.resetPasswordForm.get('confirmPassword')?.value,
          },
        })
      );
    }
  }

  toggleShowPassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleShowConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  goBack(): void {
    this.router.navigate(['/auth/login']);
  }

  private passwordsMatchValidator(group: FormGroup): { [key: string]: boolean } | null {
    const password = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password && confirmPassword && password !== confirmPassword ? { passwordsMismatch: true } : null;
  }

  get newPassword(): FormControl<any> {
    return this.resetPasswordForm.get('newPassword') as FormControl<any>;
  }

  get confirmPassword(): FormControl<any> {
    return this.resetPasswordForm.get('confirmPassword') as FormControl<any>;
  }

  get passwordsMatch() {
    return this.resetPasswordForm.hasError('passwordsMismatch');
  }
}
