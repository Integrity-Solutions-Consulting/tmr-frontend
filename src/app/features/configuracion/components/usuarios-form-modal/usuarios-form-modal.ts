import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from '../../../auth/servicios/auth.service';
import { Rol, Usuario, UsuarioPayload, RegisterUserRequest } from '../../models/configuracion.models';
import { CatalogoResponse, ConfiguracionService } from '../../services/configuracion.service';
import {
  cedulaEcuatorianaValidator,
  INTERNAL_USERNAME_REGEX,
  ONLY_LETTERS_REGEX,
  PHONE_10_DIGITS_REGEX,
  rucEcuatorianoValidator,
  SAFE_ALPHANUMERIC_REGEX,
  temporaryPasswordValidator,
} from '../../../../shared/validators/form-validators';

type TipoIdentificacionCode = 'C' | 'R' | 'P' | 'O';
type CatalogoOption = { id: string; nombre: string; codigo: string };
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
  private readonly authService = inject(AuthService);
  private readonly configuracionService = inject(ConfiguracionService);
  readonly data = inject<{ usuario?: Usuario; roles: Rol[]; nextId: number }>(MAT_DIALOG_DATA);
  showTemporaryPassword = false;
  readonly guardando = signal(false);
  readonly errorGuardar = signal<string | null>(null);

  readonly tiposPersona = ['NATURAL', 'JURIDICA'];

  tiposIdentificacion: CatalogoOption[] = [];
  generos: CatalogoOption[] = [];
  nacionalidades: CatalogoOption[] = [];

  readonly rolesList = (this.data.roles ?? [])
    .filter((rol) => rol.activo)
    .map((rol) => ({ id: rol.id, nombre: rol.nombre }));

  readonly form = this.fb.nonNullable.group({
    tipoPersona: [this.data.usuario?.tipoPersona ?? 'NATURAL', Validators.required],
    idtipoidentificacion: [
      this.data.usuario?.idtipoidentificacion ?? '',
      Validators.required,
    ],
    numeroidentificacion: [
      this.data.usuario?.numeroidentificacion ?? '',
      [Validators.required],
    ],
    nombres: [
      this.data.usuario?.nombres ?? '',
      [Validators.required, Validators.minLength(3), Validators.pattern(ONLY_LETTERS_REGEX)],
    ],
    apellidos: [
      this.data.usuario?.apellidos ?? '',
      [Validators.required, Validators.minLength(3), Validators.pattern(ONLY_LETTERS_REGEX)],
    ],
    idgenero: [this.data.usuario?.idgenero ?? '', Validators.required],
    idnacionalidad: [this.data.usuario?.idnacionalidad ?? '', Validators.required],
    fechanacimiento: [this.data.usuario?.fechanacimiento ?? '', Validators.required],
    telefono: [this.data.usuario?.telefono ?? null as string | null, [Validators.pattern(PHONE_10_DIGITS_REGEX)]],
    direccion: [this.data.usuario?.direccion ?? null as string | null],
    correoContacto: [this.data.usuario?.correoContacto ?? '', [Validators.email]],
    roleid: [this.data.usuario?.rolesids?.[0] ?? '', [Validators.required]],
    usuario: [
      this.data.usuario?.usuario ?? '',
      [Validators.required, Validators.minLength(3), Validators.pattern(INTERNAL_USERNAME_REGEX)],
    ],
    usuarioInterno: [this.data.usuario?.usuarioInterno ?? true],
    email: [this.data.usuario?.email ?? '', [Validators.required, Validators.email]],
    password: [
      '',
      this.data.usuario ? [] : [Validators.required, temporaryPasswordValidator()],
    ],
    debeCambiarPassword: [this.data.usuario?.debeCambiarPassword ?? !this.data.usuario],
    usuarioCreacion: [this.data.usuario?.usuarioCreacion ?? this.getCurrentUserName()],
    idUsuarioCreacion: [this.data.usuario?.idUsuarioCreacion ?? this.getCurrentUserId()],
    ip: [this.data.usuario?.ip ?? ''],
  });

  constructor() {
    this.cargarCatalogos();

    this.form.controls.idtipoidentificacion.valueChanges.subscribe(() => {
      this.form.controls.numeroidentificacion.setValue('');
      this.configureIdentificationValidator();
    });

    this.form.controls.usuario.valueChanges.subscribe(() => {
      this.syncInternalEmail();
    });

    this.form.controls.email.valueChanges.subscribe(() => {
      this.syncUserFromEmail();
    });

    this.form.controls.usuarioInterno.valueChanges.subscribe((isInternal) => {
      this.configureUserValidators();
      if (isInternal) {
        this.syncInternalEmail();
      } else {
        this.releaseExternalEmail();
      }
    });

    this.configureIdentificationValidator();
    this.configureUserValidators();
    if (this.isInternalUser) {
      this.syncInternalEmail();
    } else {
      this.syncUserFromEmail();
    }
  }

  get isEdit(): boolean {
    return Boolean(this.data.usuario);
  }

  get identificationMaxLength(): number | null {
    const type = this.selectedIdentificationCode();

    if (type === 'C') {
      return 10;
    }

    if (type === 'R') {
      return 13;
    }

    return null;
  }

  tieneValor(campo: keyof typeof this.form.controls): boolean {
    const value = this.form.controls[campo].value;
    return Array.isArray(value) ? value.length > 0 : value !== null && value !== undefined && value !== '';
  }

  campoInvalido(campo: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[campo];
    return control.invalid && (control.touched || control.dirty);
  }

  get isInternalUser(): boolean {
    return this.form.controls.usuarioInterno.value;
  }

  get emailSuffix(): string {
    return INTERNAL_EMAIL_DOMAIN;
  }

  sanitizeIdentificationInput(): void {
    const control = this.form.controls.numeroidentificacion;
    const type = this.form.controls.idtipoidentificacion.value;
    const code = this.identificationCodeById(type);
    const rawValue = control.value ?? '';
    const sanitized =
      code === 'C' || code === 'R'
        ? rawValue.replace(/\D/g, '')
        : rawValue.replace(/[^a-zA-Z0-9\s_-]/g, '');
    const maxLength = this.identificationMaxLength;
    const nextValue = maxLength ? sanitized.slice(0, maxLength) : sanitized;

    if (nextValue !== rawValue) {
      control.setValue(nextValue, { emitEvent: false });
    }
  }

  sanitizePhoneInput(): void {
    const control = this.form.controls.telefono;
    const rawValue = control.value ?? '';
    const nextValue = rawValue.replace(/\D/g, '').slice(0, 10);

    if (nextValue !== rawValue) {
      control.setValue(nextValue, { emitEvent: false });
    }
  }

  sanitizeNameInput(field: 'nombres' | 'apellidos'): void {
    const control = this.form.controls[field];
    const rawValue = String(control.value ?? '');
    const nextValue = rawValue.replace(/[^a-zA-ZÀ-ÿ\s]/g, '');

    if (nextValue !== rawValue) {
      control.setValue(nextValue, { emitEvent: false });
    }
  }

  identificationError(): string {
    const errors = this.form.controls.numeroidentificacion.errors;
    const type = this.selectedIdentificationCode();

    if (errors?.['required']) {
      return 'Campo requerido';
    }

    if (errors?.['numbersOnly']) {
      return 'Solo se permiten numeros';
    }

    if (errors?.['cedulaEcuador']) {
      return 'Cedula ecuatoriana invalida';
    }

    if (errors?.['rucEcuador']) {
      return 'RUC ecuatoriano invalido';
    }

    if (errors?.['pattern']) {
      return type === 'P'
        ? 'Use solo letras y numeros'
        : 'Use solo letras, numeros, espacios, guion o guion bajo';
    }

    return 'Valor invalido';
  }

  userError(): string {
    const errors = this.form.controls.usuario.errors;

    if (errors?.['required']) {
      return 'Campo requerido';
    }

    if (errors?.['pattern']) {
      return 'Use letras, numeros, punto, guion o guion bajo';
    }

    return 'Usuario invalido';
  }

  emailError(): string {
    const errors = this.form.controls.email.errors;

    if (errors?.['required']) {
      return 'Campo requerido';
    }

    return this.isInternalUser ? 'Completa el usuario interno' : 'Formato de correo invalido';
  }

  passwordError(): string {
    const errors = this.form.controls.password.errors;

    if (errors?.['required']) {
      return 'Campo requerido';
    }

    if (errors?.['temporaryPassword']) {
      return 'Debe incluir mayuscula, minuscula, numero y caracter especial';
    }

    return 'Password invalido';
  }

  phoneError(): string {
    const errors = this.form.controls.telefono.errors;

    if (errors?.['pattern']) {
      return 'Ingrese exactamente 10 digitos numericos';
    }

    return 'Telefono invalido';
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
    const idTipoIdentificacion = value.idtipoidentificacion;
    const idGenero = value.idgenero;
    const idNacionalidad = value.idnacionalidad;
    const fechaNacimiento = value.fechanacimiento ?? '';

    const payload: UsuarioPayload = {
      idGenero,
      idNacionalidad,
      idTipoIdentificacion,
      tipoIdentificacion: this.mapIdentificationType(idTipoIdentificacion),
      numeroidentificacion: String(value.numeroidentificacion).trim(),
      nombres: String(value.nombres).trim(),
      apellidos: String(value.apellidos).trim(),
      correoContacto: String(value.correoContacto || value.email).trim(),
      tipoPersona: value.tipoPersona,
      fechaNacimiento,
      usuarioCreacion: value.usuarioCreacion,
      idUsuarioCreacion: value.idUsuarioCreacion,
      ip: value.ip,
      email: String(value.email).trim(),
      usuario: String(value.usuario).trim(),
      password: value.password,
      debeCambiarPassword: true,
      usuarioInterno: value.usuarioInterno,
      idtipoidentificacion: idTipoIdentificacion,
      idgenero: idGenero,
      idnacionalidad: idNacionalidad,
      fechanacimiento: fechaNacimiento,
      telefono: value.telefono ? String(value.telefono).trim() : '',
      direccion: value.direccion ? String(value.direccion).trim() : '',
      rolesids: value.roleid ? [String(value.roleid)] : (this.data.usuario?.rolesids ?? []),
    };

    // ── Modo Edición: llama al backend con datos completos ───────────────────
    if (this.isEdit) {
      this.guardando.set(true);
      this.errorGuardar.set(null);

      const usuarioEditado: Usuario = {
        id: this.data.usuario!.id,
        estado: this.data.usuario!.estado,
        ...payload,
      };

      // Incluir la nueva contraseña solo si el usuario escribió algo
      const passwordNueva = value.password?.trim() || null;

      const updatePayload = this.configuracionService.toUpdateUsuarioPayload(usuarioEditado, passwordNueva);

      this.configuracionService.updateUsuario(this.data.usuario!.id, updatePayload).subscribe({
        next: () => {
          this.guardando.set(false);
          this.configuracionService.loadUsuarios();
          this.dialogRef.close('actualizado');
        },
        error: (err) => {
          this.guardando.set(false);
          this.errorGuardar.set(this.extractBackendError(err));
        },
      });
      return;
    }

    // ── Modo Creación: llama al backend ─────────────────────────────────────
    this.guardando.set(true);
    this.errorGuardar.set(null);

    const registerPayload: RegisterUserRequest = {
      idRol: Number(value.roleid),
      idGenero: this.mapGenderId(payload.idgenero),
      idNacionalidad: Number(payload.idnacionalidad),
      idTipoIdentificacion: this.mapIdentificationTypeId(payload.idtipoidentificacion),
      tipoIdentificacion: this.mapIdentificationType(payload.idtipoidentificacion),
      numeroidentificacion: payload.numeroidentificacion,
      nombres: payload.nombres,
      apellidos: payload.apellidos,
      correoContacto: payload.correoContacto || payload.email,
      tipoPersona: this.mapTipoPersona(payload.tipoPersona),
      fechaNacimiento: this.formatBackendDate(payload.fechanacimiento),
      telefono: payload.telefono?.trim() || null,
      direccion: payload.direccion?.trim() || null,
      email: payload.email,
      usuario: this.getAuthenticatedUserForPayload(),
    };

    this.configuracionService.crearUsuarioAdministrativo(registerPayload).subscribe({
      next: () => {
        this.guardando.set(false);
        this.configuracionService.loadUsuarios();
        this.form.reset();
        this.dialogRef.close('creado');
      },
      error: (err) => {
        this.guardando.set(false);
        this.errorGuardar.set(this.extractBackendError(err));
      },
    });
  }

  private extractBackendError(err: unknown): string {
    const error = (err as { error?: unknown })?.error;

    if (typeof error === 'string') {
      return error;
    }

    const body = error as { message?: string; error?: string; errors?: unknown } | undefined;
    if (body?.message) {
      return body.message;
    }

    if (body?.error) {
      return body.error;
    }

    if (Array.isArray(body?.errors)) {
      return body.errors.join(', ');
    }

    if (body?.errors && typeof body.errors === 'object') {
      return Object.values(body.errors as Record<string, unknown>)
        .flat()
        .join(', ');
    }

    return 'Error al crear el usuario. Intente nuevamente.';
  }

  private cargarCatalogos(): void {
    this.configuracionService.getCatalogo('TID').subscribe({
      next: (data) => {
        this.tiposIdentificacion = this.mapCatalogoOptions(data);
        this.ensureDefaultTipoIdentificacion();
        this.configureIdentificationValidator();
      },
      error: (err) => console.error(err),
    });

    this.configuracionService.getCatalogo('GEN').subscribe({
      next: (data) => {
        this.generos = this.mapCatalogoOptions(data);
      },
      error: (err) => console.error(err),
    });

    this.configuracionService.getCatalogo('NAC').subscribe({
      next: (data) => {
        this.nacionalidades = this.mapCatalogoOptions(data);
      },
      error: (err) => console.error(err),
    });
  }

  private mapCatalogoOptions(data: CatalogoResponse[]): CatalogoOption[] {
    return (data ?? []).map((item) => ({
      id: String(item.id),
      nombre: item.valor,
      codigo: item.codigovalor,
    }));
  }

  private ensureDefaultTipoIdentificacion(): void {
    if (this.tieneValor('idtipoidentificacion')) {
      return;
    }

    const cedula = this.tiposIdentificacion.find((tipo) => tipo.codigo === 'C');
    const defaultTipo = cedula ?? this.tiposIdentificacion[0];

    if (defaultTipo) {
      this.form.controls.idtipoidentificacion.setValue(defaultTipo.id, { emitEvent: false });
    }
  }

  private configureIdentificationValidator(): void {
    const type = this.selectedIdentificationCode();
    const validators = [Validators.required];

    if (type === 'C') {
      validators.push(cedulaEcuatorianaValidator());
    }

    if (type === 'R') {
      validators.push(rucEcuatorianoValidator());
    }

    if (type === 'P') {
      validators.push(Validators.pattern(/^[a-zA-Z0-9]+$/));
    }

    if (type === 'O') {
      validators.push(Validators.pattern(SAFE_ALPHANUMERIC_REGEX));
    }

    this.form.controls.numeroidentificacion.setValidators(validators);
    this.form.controls.numeroidentificacion.updateValueAndValidity({ emitEvent: false });
  }

  private mapIdentificationType(type: string): TipoIdentificacionCode {
    return this.identificationCodeById(type) ?? 'C';
  }

  private mapIdentificationTypeId(type: string): number {
    return Number(type);
  }

  private mapGenderId(gender: string): number {
    return Number(gender);
  }

  private selectedIdentificationCode(): TipoIdentificacionCode | null {
    return this.identificationCodeById(this.form.controls.idtipoidentificacion.value);
  }

  private identificationCodeById(id: string): TipoIdentificacionCode | null {
    const code = this.tiposIdentificacion.find((tipo) => tipo.id === String(id))?.codigo;
    return code === 'R' || code === 'P' || code === 'O' ? code : code === 'C' ? 'C' : null;
  }

  private formatBackendDate(value: string | null): string {
    if (!value) {
      return '';
    }

    const datePart = value.includes('T') ? value.split('T')[0] : value;
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);

    if (isoMatch) {
      return `${isoMatch[3]}-${isoMatch[2]}-${isoMatch[1]}`;
    }

    return datePart;
  }

  private mapTipoPersona(value: string): 'NATURAL' | 'JURIDICA' {
    return value === 'JURIDICA' ? 'JURIDICA' : 'NATURAL';
  }

  private configureUserValidators(): void {
    const usuarioValidators = [Validators.required, Validators.minLength(3), Validators.pattern(INTERNAL_USERNAME_REGEX)];
    this.form.controls.usuario.setValidators(usuarioValidators);
    this.form.controls.usuario.updateValueAndValidity({ emitEvent: false });

    this.form.controls.email.setValidators([Validators.required, Validators.email]);
    this.form.controls.email.updateValueAndValidity({ emitEvent: false });
  }

  private syncInternalEmail(): void {
    if (!this.isInternalUser) {
      return;
    }

    const user = this.form.controls.usuario.value.trim();
    const nextEmail = user ? `${user}${INTERNAL_EMAIL_DOMAIN}` : '';

    if (this.form.controls.email.value !== nextEmail) {
      this.form.controls.email.setValue(nextEmail, { emitEvent: false });
    }
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

  private syncUserFromEmail(): void {
    if (this.isInternalUser) {
      return;
    }

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

  private getCurrentUserName(): string {
    const user = this.authService.getCurrentUser() as { name?: string; nombre?: string; email?: string } | null;
    return user?.name ?? user?.nombre ?? user?.email ?? '';
  }

  private getAuthenticatedUserForPayload(): string {
    const user = this.authService.getCurrentUser() as { email?: string } | null;
    return user?.email || 'admin@isc.local';
  }

  private getCurrentUserId(): string {
    const user = this.authService.getCurrentUser() as { id?: string } | null;
    return user?.id ?? '';
  }
}
