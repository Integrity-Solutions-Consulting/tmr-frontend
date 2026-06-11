import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
  ValidatorFn
} from '@angular/forms';
import { Cliente, EditarClienteRequest, EstadoCliente } from '../../modelos/cliente.model';
import { ClientesService, TipoIdentificacionBackend } from '../../servicios/clientes.service';

@Component({
  selector: 'app-modal-editar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './modal-editar.component.html',
  styleUrl: './modal-editar.component.scss',
})
export class ModalEditarComponent implements OnChanges, OnInit {
  @Input() cliente!: Cliente;
  @Output() guardar  = new EventEmitter<EditarClienteRequest>();
  @Output() cancelar = new EventEmitter<void>();

  private clientesService = inject(ClientesService);

  tipos: TipoIdentificacionBackend[] = [];
  estados: EstadoCliente[] = ['Activo', 'Inactivo'];

  // ── Estados focus para floating label ────────────────────
  focusEstado    = false;
  focusTipo      = false;
  focusIdent     = false;
  focusNombre    = false;
  focusNombres   = false;
  focusApellidos = false;
  focusCorreo    = false;
  focusTelefono  = false;
  focusDireccion = false;

  form!: FormGroup;

  constructor(private fb: FormBuilder) {}

  // ── Cargar combo de tipos de identificación ───────────────
  ngOnInit(): void {
    this.cargarTiposIdentificacion();
  }

  cargarTiposIdentificacion(): void {
    this.clientesService.getTiposIdentificacion().subscribe({
      next: (tipos) => {
        this.tipos = tipos;
      },
      error: (error) => {
        console.error('Error al cargar tipos de identificación', error);
      }
    });
  }

  // ── Validadores personalizados ────────────────────────────
  private soloNumerosValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const valor = control.value ?? '';

      if (!valor) return null;

      return /^\d+$/.test(valor) ? null : { soloNumeros: true };
    };
  }

  private identificacionValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const identificador = control.value ?? '';

      if (!identificador) return null;
      if (!this.form) return null;

      const tipo = this.form.get('tipoId')?.value ?? '';
      const tipoNormalizado = tipo.toString().toLowerCase();

      // Cédula Ecuador: exactamente 10 números
      if (tipoNormalizado.includes('céd') || tipoNormalizado.includes('ced')) {
        return /^\d{10}$/.test(identificador)
          ? null
          : { cedulaInvalida: true };
      }

      // RUC Ecuador: exactamente 13 números
      if (tipoNormalizado.includes('ruc')) {
        return /^\d{13}$/.test(identificador)
          ? null
          : { rucInvalido: true };
      }

      // Pasaporte: letras y números, libre de longitud, mínimo 3 caracteres
      if (tipoNormalizado.includes('pasaporte')) {
        return /^[a-zA-Z0-9]{3,30}$/.test(identificador)
          ? null
          : { pasaporteInvalido: true };
      }

      // Otro documento: letras y números, libre de longitud, mínimo 3 caracteres
      if (tipoNormalizado.includes('otro')) {
        return /^[a-zA-Z0-9]{3,30}$/.test(identificador)
          ? null
          : { documentoInvalido: true };
      }

      return null;
    };
  }

  // ── Limpiar campos según reglas ───────────────────────────
  soloNumeros(campo: string): void {
    const ctrl = this.form.get(campo);
    const valor = ctrl?.value ?? '';

    ctrl?.setValue(valor.replace(/\D/g, ''), { emitEvent: false });
  }

  limpiarIdentificador(): void {
    const ctrl = this.form.get('identificador');
    const valor = ctrl?.value ?? '';
    const tipo = this.form.get('tipoId')?.value ?? '';
    const tipoNormalizado = tipo.toString().toLowerCase();

    if (
      tipoNormalizado.includes('céd') ||
      tipoNormalizado.includes('ced') ||
      tipoNormalizado.includes('ruc')
    ) {
      ctrl?.setValue(valor.replace(/\D/g, ''), { emitEvent: false });
      return;
    }

    ctrl?.setValue(valor.replace(/[^a-zA-Z0-9]/g, ''), { emitEvent: false });
  }

  mensajeErrorIdentificacion(): string {
    const ctrl = this.form.get('identificador');

    if (ctrl?.hasError('required')) return 'Campo requerido';
    if (ctrl?.hasError('cedulaInvalida')) return 'La cédula debe tener exactamente 10 números';
    if (ctrl?.hasError('rucInvalido')) return 'El RUC debe tener exactamente 13 números';
    if (ctrl?.hasError('pasaporteInvalido')) return 'El pasaporte debe contener solo letras y números';
    if (ctrl?.hasError('documentoInvalido')) return 'El documento debe contener solo letras y números';

    return 'Identificación inválida';
  }

  mensajeErrorTelefono(): string {
    const ctrl = this.form.get('telefono');

    if (ctrl?.hasError('required')) return 'Campo requerido';
    if (ctrl?.hasError('soloNumeros')) return 'El teléfono solo debe contener números';

    return 'Teléfono inválido';
  }

  // ── Re-inicializar el form cada vez que cambie el cliente ──
  // Se usa ngOnChanges (no ngOnInit) porque el cliente llega primero
  // con datos básicos de la lista y luego se actualiza con el detalle
  // completo del backend (nombres, apellidos, dirección).
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['cliente'] && this.cliente) {
      this.form = this.fb.group({
        estado:            [this.cliente.estado,            Validators.required],
        tipoId:            [this.cliente.tipoId,            Validators.required],
        identificador:     [this.cliente.identificador,     [Validators.required, this.identificacionValidator()]],
        nombreComercial:   [this.cliente.nombreComercial,   Validators.required],
        nombres:           [this.cliente.nombres   || '',   Validators.required],
        apellidos:         [this.cliente.apellidos || '',   Validators.required],
        correoElectronico: [this.cliente.correoElectronico, [Validators.required, Validators.email]],
        telefono:          [this.cliente.telefono,          [Validators.required, this.soloNumerosValidator()]],
        direccion:         [this.cliente.direccion || '',   Validators.required],
      });

      this.form.get('tipoId')?.valueChanges.subscribe(() => {
        this.form.get('identificador')?.updateValueAndValidity();
        this.limpiarIdentificador();
      });
    }
  }

  // ── Validación de campos ──────────────────────────────────
  campoInvalido(campo: string): boolean {
    const ctrl = this.form.get(campo);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  // ── Submit ────────────────────────────────────────────────
  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardar.emit(this.form.value as EditarClienteRequest);
  }

  // ── Cerrar con overlay ────────────────────────────────────
  onOverlay(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
      this.cancelar.emit();
    }
  }
}