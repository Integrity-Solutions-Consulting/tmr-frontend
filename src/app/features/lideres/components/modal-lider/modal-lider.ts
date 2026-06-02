import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, HostListener, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { ModalConfirmacion } from '../modal-confirmacion/modal-confirmacion';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-modal-lider',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, ModalConfirmacion],
  templateUrl: './modal-lider.html',
  styleUrl: './modal-lider.scss'
})
export class ModalLider implements OnInit {
  @Input() mostrarFormulario = false;
  @Input() modoEdicion = false;
  @Output() cerrarModal = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<void>();

  enviado = false;
  dropdownAbierto: string | null = null;
  
  tiposLideres: { id: number, valor: string }[] = [];
  personasDisponibles: { id: number, nombres: string, apellidos: string, email: string, telefono: string }[] = [];

  form = {
    tipo: '' as any,
    persona: '', // Aquí guardaremos el id de la persona como string
    nombres: '',
    apellidos: '',
    correo: '',
    telefono: '',
    estado: ''
  };

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadTiposLideres();
    this.loadPersonasDisponibles();
  }

  private loadTiposLideres(): void {
    console.log('📋 Obteniendo tipos de líderes...');
    this.http.get<{ id: number, valor: string }[]>('http://localhost:5071/api/lideres/tipos')
      .subscribe({
        next: (tipos: any) => { // ◄ Corregido: Agregado tipo explicitamente
          console.log('✅ Tipos de líderes obtenidos:', tipos);
          this.tiposLideres = tipos;
        },
        error: (error: any) => console.error('❌ Error al obtener tipos de líderes:', error) // ◄ Corregido
      });
  }

  private loadPersonasDisponibles(): void {
    console.log('👥 Obteniendo personas disponibles...');
    this.http.get<{ id: number, nombres: string, apellidos: string, email: string, telefono: string }[]>('http://localhost:5071/api/lideres/personas-disponibles')
      .subscribe({
        next: (personas: any) => { // ◄ Corregido: Agregado tipo explicitamente
          console.log('✅ Personas disponibles obtenidas:', personas);
          this.personasDisponibles = personas;
        },
        error: (error: any) => console.error('❌ Error al obtener personas disponibles:', error) // ◄ Corregido
      });
  }

  @HostListener('document:click')
  onClickFuera() {
    this.dropdownAbierto = null;
  }

  toggleDropdown(nombre: string, event: Event) {
    event.stopPropagation();
    this.dropdownAbierto = this.dropdownAbierto === nombre ? null : nombre;
  }

  seleccionar(campo: string, valor: any, event: Event) {
    event.stopPropagation();
    
    if (campo === 'tipo' && valor && typeof valor === 'object') {
      this.form.tipo = valor.valor; 
    } else if (campo === 'persona' && valor && typeof valor === 'object') {
      // Guardamos el id en el formulario
      this.form.persona = valor.id.toString();
      
      // Auto-llenamos los campos de texto con los datos de la persona seleccionada
      this.form.nombres = valor.nombres;
      this.form.apellidos = valor.apellidos;
      this.form.correo = valor.email;
      this.form.telefono = valor.telefono;
    } else {
      (this.form as any)[campo] = valor;
    }
    
    this.dropdownAbierto = null;
  }

  getPersonaNombre(): string {
    const persona = this.personasDisponibles.find(p => p.id.toString() === this.form.persona);
    return persona ? `${persona.nombres} ${persona.apellidos}` : '';
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