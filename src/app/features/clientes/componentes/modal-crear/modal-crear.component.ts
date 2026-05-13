import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CrearClienteRequest, TipoIdentificacion } from '../../modelos/cliente.model';

@Component({
  selector: 'app-modal-crear',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './modal-crear.component.html',
  styleUrl: './modal-crear.component.scss',
})
export class ModalCrearComponent {
  @Output() guardar  = new EventEmitter<CrearClienteRequest>();
  @Output() cancelar = new EventEmitter<void>();

  tipos: TipoIdentificacion[] = ['RUC', 'Cédula', 'Pasaporte'];

  // ── Estados focus para floating label ────────────────────
  focusTipo      = false;
  focusIdent     = false;
  focusNombre    = false;
  focusNombres   = false;
  focusApellidos = false;
  focusCorreo    = false;
  focusTelefono  = false;
  focusDireccion = false;

  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      tipoId:            ['', Validators.required],
      identificador:     ['', Validators.required],
      nombreComercial:   ['', Validators.required],
      nombres:           ['', Validators.required],
      apellidos:         ['', Validators.required],
      correoElectronico: ['', [Validators.required, Validators.email]],
      telefono:          ['', Validators.required],
      direccion:         ['', Validators.required],
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
    this.guardar.emit(this.form.value as CrearClienteRequest);
  }

  // ── Cerrar con overlay ────────────────────────────────────
  onOverlay(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
      this.cancelar.emit();
    }
  }
}