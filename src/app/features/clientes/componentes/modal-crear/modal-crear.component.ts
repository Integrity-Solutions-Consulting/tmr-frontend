import { Component, EventEmitter, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { CrearClienteRequest } from '../../modelos/cliente.model';
import { ClientesService, TipoIdentificacionBackend } from '../../servicios/clientes.service';

@Component({
  selector: 'app-modal-crear',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './modal-crear.component.html',
  styleUrl: './modal-crear.component.scss',
})
export class ModalCrearComponent implements OnInit {
  @Output() guardar = new EventEmitter<CrearClienteRequest>();
  @Output() cancelar = new EventEmitter<void>();

  private clientesService = inject(ClientesService);

  tipos: TipoIdentificacionBackend[] = [];
  enviado = false;
  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      tipoId: ['', Validators.required],
      identificador: ['', [Validators.required, this.identificacionValidator()]],
      nombreComercial: ['', [Validators.required, this.noSoloEspaciosValidator(), this.noEmojiValidator()]],
      nombres: ['', [Validators.required, this.noSoloEspaciosValidator(), this.soloLetrasValidator()]],
      apellidos: ['', [Validators.required, this.noSoloEspaciosValidator(), this.soloLetrasValidator()]],
      correoElectronico: ['', [Validators.required, Validators.email, this.noEmojiValidator()]],
      telefono: ['', [Validators.required, this.telefonoValidator()]],
      direccion: ['', [Validators.required, this.noSoloEspaciosValidator(), this.noEmojiValidator()]],
    });

    this.form.get('tipoId')?.valueChanges.subscribe(() => {
      this.form.get('identificador')?.updateValueAndValidity();
      this.limpiarIdentificador();
    });
  }

  ngOnInit(): void {
    this.cargarTiposIdentificacion();
  }

  cargarTiposIdentificacion(): void {
    this.clientesService.getTiposIdentificacion().subscribe({
      next: tipos => {
        this.tipos = tipos;
      },
      error: error => {
        console.error('Error al cargar tipos de identificacion', error);
      },
    });
  }

  private identificacionValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const identificador = String(control.value ?? '').trim();

      if (!identificador || !this.form) return null;
      if (this.tieneEmoji(identificador)) return { invalido: true };

      const tipo = this.normalizarTexto(String(this.form.get('tipoId')?.value ?? ''));

      if (tipo.includes('ced')) {
        return /^\d{10}$/.test(identificador) ? null : { cedulaInvalida: true };
      }

      if (tipo.includes('ruc')) {
        return /^\d{13}$/.test(identificador) ? null : { rucInvalido: true };
      }

      return /^[A-Za-z0-9]+$/.test(identificador) ? null : { invalido: true };
    };
  }

  private telefonoValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const valor = String(control.value ?? '').trim();
      if (!valor) return null;
      return /^\+?\d+$/.test(valor) ? null : { invalido: true };
    };
  }

  private noEmojiValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const valor = String(control.value ?? '');
      if (!valor) return null;
      return this.tieneEmoji(valor) ? { invalido: true } : null;
    };
  }

  private noSoloEspaciosValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const valor = String(control.value ?? '');
      if (!valor) return null;
      return valor.trim() ? null : { invalido: true };
    };
  }

  private soloLetrasValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const valor = String(control.value ?? '');
      if (!valor) return null;
      if (this.tieneEmoji(valor) || !valor.trim()) return { invalido: true };
      return /^[A-Za-z\u00C0-\u017F\s'-]+$/.test(valor) ? null : { invalido: true };
    };
  }

  limpiarIdentificador(): void {
    const ctrl = this.form.get('identificador');
    const valor = String(ctrl?.value ?? '');
    const tipo = this.normalizarTexto(String(this.form.get('tipoId')?.value ?? ''));

    if (tipo.includes('ced')) {
      ctrl?.setValue(valor.replace(/\D/g, '').slice(0, 10), { emitEvent: false });
      return;
    }

    if (tipo.includes('ruc')) {
      ctrl?.setValue(valor.replace(/\D/g, '').slice(0, 13), { emitEvent: false });
      return;
    }

    ctrl?.setValue(valor.replace(/[^A-Za-z0-9]/g, ''), { emitEvent: false });
  }

  limpiarTelefono(): void {
    const ctrl = this.form.get('telefono');
    const valor = String(ctrl?.value ?? '');
    const tieneMasInicial = valor.trim().startsWith('+');
    const digitos = valor.replace(/\D/g, '');

    ctrl?.setValue(tieneMasInicial ? `+${digitos}` : digitos, { emitEvent: false });
  }

  campoInvalido(campo: string): boolean {
    const ctrl = this.form.get(campo);
    return !!(ctrl?.invalid && (ctrl.touched || this.enviado));
  }

  tieneValor(campo: string): boolean {
    const valor = this.form.get(campo)?.value;
    return valor !== null && valor !== undefined && valor !== '';
  }

  mensajeErrorIdentificacion(): string {
    const ctrl = this.form.get('identificador');

    if (ctrl?.hasError('required')) return 'Campo requerido';
    if (ctrl?.hasError('cedulaInvalida')) return 'La c\u00e9dula debe tener exactamente 10 d\u00edgitos';
    if (ctrl?.hasError('rucInvalido')) return 'El RUC debe tener exactamente 13 d\u00edgitos';

    return 'Campo inv\u00e1lido';
  }

  mensajeErrorCampo(campo: string): string {
    const ctrl = this.form.get(campo);
    if (ctrl?.hasError('required')) return 'Campo requerido';
    return 'Campo inv\u00e1lido';
  }

  onSubmit(): void {
    this.enviado = true;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardar.emit(this.form.value as CrearClienteRequest);
  }

  private tieneEmoji(valor: string): boolean {
    return /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(valor);
  }

  private normalizarTexto(valor: string): string {
    return valor
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
}
