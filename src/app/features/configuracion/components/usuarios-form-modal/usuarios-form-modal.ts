import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { catchError, forkJoin, map, of } from 'rxjs';
import { ColaboradorUsuarioOption, Rol, Usuario } from '../../models/configuracion.models';
import { ConfiguracionService } from '../../services/configuracion.service';
import { CrearUsuarioRequest, UsuariosService } from '../../services/usuarios.service';
import {
  INTERNAL_USERNAME_REGEX,
  temporaryPasswordValidator,
} from '../../../../shared/validators/form-validators';

const INTERNAL_EMAIL_DOMAIN = '@integritysolutions.com.ec';

@Component({
  selector: 'app-usuarios-form-modal',
  imports: [ReactiveFormsModule],
  templateUrl: './usuarios-form-modal.html',
  styleUrl: './usuarios-form-modal.scss',
})
export class UsuariosFormModal {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<UsuariosFormModal>);
  private readonly configuracionService = inject(ConfiguracionService);
  private readonly usuariosService = inject(UsuariosService);
  readonly data = inject<{ usuario?: Usuario; roles: Rol[]; nextId: number }>(MAT_DIALOG_DATA);

  readonly guardando = signal(false);
  readonly cargandoColaboradores = signal(false);
  readonly errorGuardar = signal<string | null>(null);
  showTemporaryPassword = false;
  colaboradores: ColaboradorUsuarioOption[] = [];

  readonly rolesList = (this.data.roles ?? [])
    .filter((rol) => rol.activo)
    .map((rol) => ({ id: rol.id, nombre: rol.nombre }));

  readonly form = this.fb.nonNullable.group({
    usuarioInterno: [this.data.usuario?.usuarioInterno ?? Boolean(this.data.usuario?.idPersona)],
    idColaborador: [''],
    idPersona: [this.data.usuario?.idPersona ?? null as number | null],
    roleid: [this.data.usuario?.rolesids?.[0] ?? '', [Validators.required]],
    usuario: [
      this.data.usuario?.usuario ?? '',
      [Validators.required, Validators.minLength(3), Validators.pattern(INTERNAL_USERNAME_REGEX)],
    ],
    email: [this.data.usuario?.email ?? '', [Validators.required, Validators.email]],
    password: [
      '',
      this.data.usuario ? [] : [Validators.required, temporaryPasswordValidator()],
    ],
    debeCambiarPassword: [this.data.usuario?.debeCambiarPassword ?? !this.data.usuario],
  });

  constructor() {
    this.cargarColaboradores();

    this.form.controls.usuario.valueChanges.subscribe(() => this.syncInternalEmail());
    this.form.controls.email.valueChanges.subscribe(() => this.syncUserFromEmail());
    this.form.controls.usuarioInterno.valueChanges.subscribe((isInternal) => {
      this.configureUserMode(Boolean(isInternal));
    });
    this.form.controls.idColaborador.valueChanges.subscribe((idColaborador) => {
      this.resolverPersonaDesdeColaborador(idColaborador);
    });

    this.configureUserMode(this.isInternalUser);
    if (!this.isEdit) {
      this.regenerateTemporaryPassword();
    }
  }

  get isEdit(): boolean {
    return Boolean(this.data.usuario);
  }

  get isInternalUser(): boolean {
    return this.form.controls.usuarioInterno.value;
  }

  get emailSuffix(): string {
    return INTERNAL_EMAIL_DOMAIN;
  }

  get colaboradorSeleccionado(): ColaboradorUsuarioOption | undefined {
    const id = Number(this.form.controls.idColaborador.value);
    return this.colaboradores.find((colaborador) => colaborador.id === id);
  }

  tieneValor(campo: keyof typeof this.form.controls): boolean {
    const value = this.form.controls[campo].value;
    return Array.isArray(value) ? value.length > 0 : value !== null && value !== undefined && value !== '';
  }

  campoInvalido(campo: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[campo];
    return control.invalid && (control.touched || control.dirty);
  }

  userError(): string {
    const errors = this.form.controls.usuario.errors;

    if (errors?.['required']) return 'Campo requerido';
    if (errors?.['pattern']) return 'Use letras, numeros, punto, guion o guion bajo';
    return 'Usuario invalido';
  }

  emailError(): string {
    const errors = this.form.controls.email.errors;

    if (errors?.['required']) return 'Campo requerido';
    return this.isInternalUser ? 'Completa el usuario interno' : 'Formato de correo invalido';
  }

  passwordError(): string {
    const errors = this.form.controls.password.errors;

    if (errors?.['required']) return 'Campo requerido';
    if (errors?.['temporaryPassword']) {
      return 'Debe incluir mayuscula, minuscula, numero y caracter especial';
    }
    return 'Password invalido';
  }

  colaboradorError(): string {
    if (!this.form.controls.idColaborador.value) {
      return 'Seleccione un colaborador';
    }
    return 'Colaborador invalido';
  }

  regenerateTemporaryPassword(): void {
    this.form.controls.password.setValue(this.generateTemporaryPassword());
    this.form.controls.password.markAsDirty();
    this.form.controls.password.updateValueAndValidity();
  }

  toggleTemporaryPasswordVisibility(): void {
    this.showTemporaryPassword = !this.showTemporaryPassword;
  }

  cancel(): void {
    this.dialogRef.close();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const rolesids = value.roleid ? [Number(value.roleid)].filter((roleId) => Number.isFinite(roleId)) : [];
    const idPersona = value.usuarioInterno ? value.idPersona : null;

    if (value.usuarioInterno && !idPersona) {
      this.form.controls.idColaborador.setErrors({ required: true });
      this.form.controls.idColaborador.markAsTouched();
      return;
    }

    this.guardando.set(true);
    this.errorGuardar.set(null);

    if (this.isEdit) {
      const usuarioEditado: Usuario = {
        ...this.data.usuario!,
        idPersona,
        email: String(value.email).trim(),
        usuario: String(value.usuario).trim(),
        usuarioInterno: value.usuarioInterno,
        debeCambiarPassword: value.debeCambiarPassword,
        rolesids: rolesids.map(String),
      };

      const passwordNueva = value.password?.trim() || null;
      const updatePayload = this.configuracionService.toUpdateUsuarioPayload(usuarioEditado, passwordNueva);

      this.configuracionService.updateUsuario(this.data.usuario!.idUsuario, updatePayload).subscribe({
        next: () => {
          this.guardando.set(false);
          this.dialogRef.close('actualizado');
        },
        error: (err) => {
          this.guardando.set(false);
          this.errorGuardar.set(this.extractBackendError(err));
        },
      });
      return;
    }

    const registerPayload: CrearUsuarioRequest = {
      idPersona,
      email: String(value.email).trim(),
      password: String(value.password ?? '').trim(),
      rolesids,
      debeCambiarPassword: value.debeCambiarPassword,
    };

    this.usuariosService.crearUsuario(registerPayload).subscribe({
      next: () => {
        this.guardando.set(false);
        this.form.reset();
        this.dialogRef.close('creado');
      },
      error: (err) => {
        this.guardando.set(false);
        this.errorGuardar.set(this.extractBackendError(err));
      },
    });
  }

  syncInternalEmailInput(value: string): void {
    const user = value.replace(/[^a-zA-Z0-9._-]/g, '');

    if (this.form.controls.usuario.value !== user) {
      this.form.controls.usuario.setValue(user, { emitEvent: false });
    }

    const nextEmail = user ? `${user}${INTERNAL_EMAIL_DOMAIN}` : '';
    if (this.form.controls.email.value !== nextEmail) {
      this.form.controls.email.setValue(nextEmail, { emitEvent: false });
    }
  }

  private cargarColaboradores(): void {
    this.cargandoColaboradores.set(true);
    this.usuariosService.listarColaboradores().subscribe({
      next: (colaboradores) => {
        const activos = (colaboradores ?? []).filter((colaborador) => colaborador.activo !== false);
        if (activos.length === 0) {
          this.colaboradores = [];
          this.cargandoColaboradores.set(false);
          return;
        }

        forkJoin(
          activos.map((colaborador) =>
            this.usuariosService.obtenerColaboradorDetalle(colaborador.id).pipe(
              map((detalle) => ({
                ...colaborador,
                idPersona: detalle.idPersona ?? (detalle as ColaboradorUsuarioOption & { idpersona?: number | null }).idpersona ?? colaborador.idPersona ?? null,
                email: detalle.email ?? colaborador.email,
                nombreCompleto: detalle.nombreCompleto ?? colaborador.nombreCompleto,
              } as ColaboradorUsuarioOption & { idpersona?: number | null })),
              catchError(() => of(colaborador)),
            ),
          ),
        ).subscribe({
          next: (detalles) => {
            this.colaboradores = detalles;
            this.preseleccionarColaborador();
            this.cargandoColaboradores.set(false);
          },
          error: () => {
            this.colaboradores = activos;
            this.cargandoColaboradores.set(false);
          },
        });
      },
      error: () => {
        this.colaboradores = [];
        this.cargandoColaboradores.set(false);
      },
    });
  }

  private preseleccionarColaborador(): void {
    const idPersona = this.data.usuario?.idPersona;
    if (!idPersona) return;

    const colaborador = this.colaboradores.find((item) => item.idPersona === idPersona);
    if (colaborador) {
      this.form.controls.idColaborador.setValue(String(colaborador.id), { emitEvent: false });
      this.form.controls.idPersona.setValue(idPersona, { emitEvent: false });
    }
  }

  private resolverPersonaDesdeColaborador(idColaborador: string): void {
    if (!idColaborador) {
      this.form.controls.idPersona.setValue(null);
      return;
    }

    const colaborador = this.colaboradores.find((item) => item.id === Number(idColaborador));
    if (colaborador?.idPersona) {
      this.form.controls.idPersona.setValue(colaborador.idPersona);
      return;
    }

    this.usuariosService.obtenerColaboradorDetalle(Number(idColaborador)).subscribe({
      next: (detalle) => {
        const idPersona = detalle.idPersona ?? (detalle as ColaboradorUsuarioOption & { idpersona?: number }).idpersona ?? null;
        this.form.controls.idPersona.setValue(idPersona ?? null);
      },
      error: () => this.form.controls.idPersona.setValue(null),
    });
  }

  private configureUserMode(isInternal: boolean): void {
    if (isInternal) {
      this.form.controls.idColaborador.setValidators([Validators.required]);
      this.syncInternalEmail();
    } else {
      this.form.controls.idColaborador.clearValidators();
      this.form.controls.idColaborador.setValue('', { emitEvent: false });
      this.form.controls.idPersona.setValue(null, { emitEvent: false });
      this.releaseExternalEmail();
    }

    this.form.controls.idColaborador.updateValueAndValidity({ emitEvent: false });
    this.form.controls.email.setValidators([Validators.required, Validators.email]);
    this.form.controls.email.updateValueAndValidity({ emitEvent: false });
  }

  private syncInternalEmail(): void {
    if (!this.isInternalUser) return;

    const user = this.form.controls.usuario.value.trim();
    const nextEmail = user ? `${user}${INTERNAL_EMAIL_DOMAIN}` : '';

    if (this.form.controls.email.value !== nextEmail) {
      this.form.controls.email.setValue(nextEmail, { emitEvent: false });
    }
  }

  private syncUserFromEmail(): void {
    if (this.isInternalUser) return;

    const email = this.form.controls.email.value.trim();
    const user = email.includes('@') ? email.split('@')[0] : email;
    const sanitizedUser = user.replace(/[^a-zA-Z0-9._-]/g, '');

    if (this.form.controls.usuario.value !== sanitizedUser) {
      this.form.controls.usuario.setValue(sanitizedUser, { emitEvent: false });
    }
  }

  private releaseExternalEmail(): void {
    const user = this.form.controls.usuario.value.trim();
    const generatedEmail = user ? `${user}${INTERNAL_EMAIL_DOMAIN}` : '';

    if (this.form.controls.email.value === generatedEmail) {
      this.form.controls.email.setValue('', { emitEvent: false });
      this.form.controls.email.markAsPristine();
    }
  }

  private extractBackendError(err: unknown): string {
    const error = (err as { error?: unknown })?.error;

    if (typeof error === 'string') return error;

    const body = error as { message?: string; error?: string; detail?: string; errors?: unknown } | undefined;
    if (body?.message) return body.message;
    if (body?.detail) return body.detail;
    if (body?.error) return body.error;

    if (Array.isArray(body?.errors)) {
      return body.errors.join(', ');
    }

    if (body?.errors && typeof body.errors === 'object') {
      return Object.values(body.errors as Record<string, unknown>).flat().join(', ');
    }

    return 'Error al guardar el usuario. Intente nuevamente.';
  }

  private generateTemporaryPassword(): string {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnopqrstuvwxyz';
    const numbers = '23456789';
    const special = '!@#$%*_-';
    const all = `${upper}${lower}${numbers}${special}`;
    const required = [
      this.randomChar(upper),
      this.randomChar(lower),
      this.randomChar(numbers),
      this.randomChar(special),
    ];
    const rest = Array.from({ length: 6 }, () => this.randomChar(all));

    return [...required, ...rest].sort(() => Math.random() - 0.5).join('');
  }

  private randomChar(characters: string): string {
    const values = new Uint32Array(1);
    const hasCrypto = Boolean(globalThis.crypto?.getRandomValues);

    if (hasCrypto) {
      globalThis.crypto.getRandomValues(values);
    }

    const index = hasCrypto ? values[0] % characters.length : Math.floor(Math.random() * characters.length);

    return characters[index];
  }
}
