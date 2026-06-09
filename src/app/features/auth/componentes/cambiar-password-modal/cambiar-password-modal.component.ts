import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../servicios/auth.service';

const passwordsMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const newPassword = control.get('newPassword');
  const confirmPassword = control.get('confirmPassword');
  
  if (!newPassword || !confirmPassword) return null;
  
  return newPassword.value === confirmPassword.value ? null : { passwordsMismatch: true };
};

@Component({
  selector: 'app-cambiar-password-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './cambiar-password-modal.component.html',
  styleUrl: './cambiar-password-modal.component.scss'
})
export class CambiarPasswordModalComponent {
  private dialogRef = inject(MatDialogRef<CambiarPasswordModalComponent>);
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  readonly form: FormGroup = this.fb.group({
    oldPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: passwordsMatchValidator });

  // Signals para manejar visibilidad
  readonly showOldPassword = signal(false);
  readonly showNewPassword = signal(false);
  readonly showConfirmPassword = signal(false);

  // Signals de estado
  readonly guardando = signal(false);
  readonly cambiadoExitosamente = signal(false);
  readonly errorGuardar = signal<string | null>(null);

  toggleOldPasswordVisibility(): void {
    this.showOldPassword.set(!this.showOldPassword());
  }

  toggleNewPasswordVisibility(): void {
    this.showNewPassword.set(!this.showNewPassword());
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.set(!this.showConfirmPassword());
  }

  campoInvalido(campo: string): boolean {
    const control = this.form.get(campo);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    this.errorGuardar.set(null);

    const payload = {
      oldPassword: this.form.value.oldPassword,
      newPassword: this.form.value.newPassword,
      confirmPassword: this.form.value.confirmPassword
    };

    this.authService.changePassword(payload).subscribe({
      next: () => {
        this.guardando.set(false);
        this.cambiadoExitosamente.set(true);
        setTimeout(() => {
          this.dialogRef.close(true);
        }, 1500);
      },
      error: (err) => {
        this.guardando.set(false);
        this.errorGuardar.set(this.extractError(err));
      }
    });
  }

  private extractError(err: any): string {
    const errorBody = err?.error;
    if (typeof errorBody === 'string') {
      return errorBody;
    }
    
    return errorBody?.errors?.[0]?.message 
      || errorBody?.message 
      || errorBody?.mensaje 
      || errorBody?.error 
      || errorBody?.title 
      || 'No se pudo cambiar la contraseña. Verifique los datos ingresados.';
  }
}
