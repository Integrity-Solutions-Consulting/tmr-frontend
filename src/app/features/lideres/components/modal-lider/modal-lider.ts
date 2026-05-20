import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { ModalConfirmacion } from '../modal-confirmacion/modal-confirmacion';

@Component({
  selector: 'app-modal-lider',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, ModalConfirmacion],
  templateUrl: './modal-lider.html',
  styleUrl: './modal-lider.scss'
})
export class ModalLider {
  @Input() mostrarFormulario = false;
  @Input() modoEdicion = false;
  @Output() cerrarModal = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<void>();

  enviado = false;
  dropdownAbierto: string | null = null;

  personas: { [key: string]: string } = {
    '1': 'Maribel Sofía Cabezas Paredes',
    '2': 'Leonel Pablo Catro Jiménez',
    '3': 'Diego Armando Maradona Carchi',
    '4': 'Óscar Mario Suárez Torres'
  };

  form = {
    tipo: '',
    persona: '',
    nombres: '',
    apellidos: '',
    correo: '',
    telefono: '',
    estado: ''
  };

  @HostListener('document:click')
  onClickFuera() {
    this.dropdownAbierto = null;
  }

  toggleDropdown(nombre: string, event: Event) {
    event.stopPropagation();
    this.dropdownAbierto = this.dropdownAbierto === nombre ? null : nombre;
  }

  seleccionar(campo: string, valor: string, event: Event) {
    event.stopPropagation();
    (this.form as any)[campo] = valor;
    this.dropdownAbierto = null;
  }

  getPersonaNombre(): string {
    return this.personas[this.form.persona] || '';
  }

  cerrar() {
    this.enviado = false;
    this.dropdownAbierto = null;
    this.form = { tipo: '', persona: '', nombres: '', apellidos: '', correo: '', telefono: '', estado: '' };
    this.cerrarModal.emit();
  }

  formularioValido(): boolean {
    if (this.modoEdicion) {
      return !!this.form.tipo && !!this.form.persona &&
             !!this.form.nombres && !!this.form.apellidos &&
             !!this.form.correo && !!this.form.telefono &&
             !!this.form.estado;
    }
    return !!this.form.tipo && !!this.form.persona &&
           !!this.form.nombres && !!this.form.apellidos &&
           !!this.form.correo && !!this.form.telefono;
  }

  onGuardar() {
    this.enviado = true;
    if (!this.formularioValido()) return;
    this.guardar.emit();
    this.cerrarModal.emit();
    this.form = { tipo: '', persona: '', nombres: '', apellidos: '', correo: '', telefono: '', estado: '' };
    this.enviado = false;
  }
}