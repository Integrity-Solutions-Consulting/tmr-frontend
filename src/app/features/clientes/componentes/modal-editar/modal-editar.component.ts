import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Cliente, EditarClienteRequest, TipoIdentificacion, EstadoCliente } from '../../modelos/cliente.model';

@Component({
  selector: 'app-modal-editar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './modal-editar.component.html',
  styleUrl: './modal-editar.component.scss',
})
export class ModalEditarComponent implements OnInit {
  @Input() cliente!: Cliente;
  @Output() guardar  = new EventEmitter<EditarClienteRequest>();
  @Output() cancelar = new EventEmitter<void>();

  tipos: TipoIdentificacion[] = ['RUC', 'Cédula', 'Pasaporte'];
  estados: EstadoCliente[]    = ['Activo', 'Inactivo'];

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

  // ── Inicializar form con datos del cliente ────────────────
  ngOnInit(): void {
    this.form = this.fb.group({
      estado:            [this.cliente.estado,            Validators.required],
      tipoId:            [this.cliente.tipoId,            Validators.required],
      identificador:     [this.cliente.identificador,     Validators.required],
      nombreComercial:   [this.cliente.nombreComercial,   Validators.required],
      nombres:           [this.cliente.nombres   || '',   Validators.required],
      apellidos:         [this.cliente.apellidos || '',   Validators.required],
      correoElectronico: [this.cliente.correoElectronico, [Validators.required, Validators.email]],
      telefono:          [this.cliente.telefono,          Validators.required],
      direccion:         [this.cliente.direccion || '',   Validators.required],
    });
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