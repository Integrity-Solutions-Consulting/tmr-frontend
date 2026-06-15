import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, HostListener, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

interface TipoLider {
  id: number;
  valor: string;
}

interface PersonaDisponible {
  id: number;
  idPersona: number;
  nombreCompleto: string;
  email: string;
  telefono: string;
  activo: boolean;
}

@Component({
  selector: 'app-modal-lider',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  templateUrl: './modal-lider.html',
  styleUrl: './modal-lider.scss'
})
export class ModalLider implements OnInit, OnChanges {
  @Input() mostrarFormulario = false;
  @Input() modoEdicion = false;
  @Input() lider: any | null = null;
  @Input() guardando = false;
  @Output() cerrarModal = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<any>(); // Sigue emitiendo para refrescar la tabla del padre

  enviado = false;
  dropdownAbierto: string | null = null;

  tiposLideres: TipoLider[] = [];
  personasDisponibles: PersonaDisponible[] = [];
  busquedaPersona = '';
  personasFiltradas: PersonaDisponible[] = [];

  form = {
    tipoId: '' as any,
    tipoNombre: '',
    personaId: '',
    identificacion: '',
    nombres: '',
    apellidos: '',
    correo: '',
    telefono: '',
    estado: 'Activo'
  };

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadTiposLideres();
    this.loadPersonasDisponibles();
    this.syncFormWithLider();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['lider'] || changes['modoEdicion']) {
      this.syncFormWithLider();
    }
  }

  private syncFormWithLider(): void {
    if (this.modoEdicion && this.lider) {
      this.form = {
        tipoId: this.tiposLideres.find(t => t.valor === this.lider.tipo)?.id?.toString() || '',
        tipoNombre: this.lider.tipo || '',
        personaId: '',
        identificacion: this.lider.numeroIdentificacion || '',
        nombres: this.lider.nombres || '',
        apellidos: this.lider.apellidos || '',
        correo: this.lider.correo || this.lider.email || '',
        telefono: this.lider.telefono || '',
        estado: this.lider.estado || 'Activo'
      };
    } else {
      this.form = {
        tipoId: '' as any,
        tipoNombre: '',
        personaId: '',
        identificacion: '',
        nombres: '',
        apellidos: '',
        correo: '',
        telefono: '',
        estado: 'Activo'
      };
    }
  }

  private loadTiposLideres(): void {
    this.http.get<TipoLider[]>(`${environment.apiUrl}/lideres/tipos`)
      .subscribe({
        next: (tipos) => {
          this.tiposLideres = tipos ?? [];
          if (this.modoEdicion && this.lider) {
            this.syncFormWithLider();
          }
        },
        error: (error) => console.error('Error al obtener tipos de líderes:', error)
      });
  }

  private loadPersonasDisponibles(): void {
    this.http.get<PersonaDisponible[]>(`${environment.apiUrl}/colaboradores`)
      .subscribe({
        next: (colaboradores) => {
          this.personasDisponibles = colaboradores ?? [];
          this.personasFiltradas = [...this.personasDisponibles];
          if (this.modoEdicion && this.lider) {
            this.syncFormWithLider();
          }
        },
        error: (error) => console.error('Error al obtener colaboradores:', error)
      });
  }    

  @HostListener('document:click')
  onClickFuera() {
    this.dropdownAbierto = null;
  }

  toggleDropdown(nombre: string, event: Event) {
    event.stopPropagation();
    this.dropdownAbierto = this.dropdownAbierto === nombre ? null : nombre;
    if (nombre === 'persona' && this.dropdownAbierto === 'persona') {
      this.busquedaPersona = '';
      this.personasFiltradas = [...this.personasDisponibles];
    }
  }

  filtrarPersonas() {
    const busqueda = this.busquedaPersona.toLowerCase().trim();
    this.personasFiltradas = this.personasDisponibles.filter(p =>
      p.nombreCompleto.toLowerCase().includes(busqueda)
    );
  }

  seleccionar(campo: string, valor: any, event: Event) {
    event.stopPropagation();

    if (campo === 'tipo' && valor && typeof valor === 'object') {
      this.form.tipoId = valor.id.toString();
      this.form.tipoNombre = valor.valor;
      this.form.personaId = '';
      this.form.identificacion = '';
      this.form.nombres = '';
      this.form.apellidos = '';
      this.form.correo = '';
      this.form.telefono = '';
    } else if (campo === 'persona' && valor && typeof valor === 'object') {
      this.form.personaId = valor.idPersona.toString();
      this.form.identificacion = valor.numeroIdentificacion || '';
      this.form.nombres = valor.nombreCompleto.split(' ')[0];
      this.form.apellidos = valor.nombreCompleto.split(' ').slice(1).join(' ');
      this.form.correo = valor.email || '';
      this.form.telefono = valor.telefono || '';
    } else {
      (this.form as any)[campo] = valor;
    }

    this.dropdownAbierto = null;
  }

  getPersonaNombre(): string {
    const persona = this.personasDisponibles.find(p => p.id.toString() === this.form.personaId);
    return persona ? persona.nombreCompleto : '';
  }

  cerrar() {
    this.enviado = false;
    this.dropdownAbierto = null;
    this.syncFormWithLider();
    this.cerrarModal.emit();
  }

  isEmailValid(email: string): boolean {
    if (!email) return true;
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(email.trim());
  }

  isTelefonoValid(telefono: string): boolean {
    if (!telefono) return true;
    const regex = /^[+0-9\s\-()]{7,20}$/;
    return regex.test(telefono.trim());
  }

  isNombresValid(nombres: string): boolean {
    return !!nombres && nombres.trim().length > 0 && nombres.trim().length <= 100;
  }

  isApellidosValid(apellidos: string): boolean {
    return !!apellidos && apellidos.trim().length > 0 && apellidos.trim().length <= 100;
  }

  formularioValido(): boolean {
    const baseValid = !!this.form.tipoId && 
                      this.isNombresValid(this.form.nombres) && 
                      this.isApellidosValid(this.form.apellidos) &&
                      this.isEmailValid(this.form.correo) &&
                      this.isTelefonoValid(this.form.telefono);

    if (this.modoEdicion) {
      return baseValid && !!this.form.estado;
    }

    if (this.form.tipoNombre === 'Interno') {
      return baseValid && !!this.form.personaId;
    }

    return baseValid; 
  }

  // NUEVO MÉTODO ONGUARDAR CONECTADO DIRECTAMENTE AL BACKEND
  onGuardar() {
    if (this.guardando) return;

    this.enviado = true;
    if (!this.formularioValido()) return;

    // Emit the form values directly to the parent component
    this.guardar.emit(this.form);
    this.cerrar();
  }

  // VALIDACIÓN ADICIONAL EN TIEMPO REAL PARA EL TECLADO
  soloLetras(event: KeyboardEvent): boolean {
    const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'\-]$/;
    if (event.key.length > 1) return true;
    if (!regex.test(event.key)) {
      event.preventDefault();
      return false;
    }
    return true;
  }

  soloNumerosYSignos(event: KeyboardEvent): boolean {
    const regex = /^[0-9+\s\-()]$/;
    if (event.key.length > 1) return true;
    if (!regex.test(event.key)) {
      event.preventDefault();
      return false;
    }
    return true;
  }

  onInputNombres(event: Event) {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'\-]/g, '');
    this.form.nombres = input.value;
  }

  onInputApellidos(event: Event) {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'\-]/g, '');
    this.form.apellidos = input.value;
  }

  onInputTelefono(event: Event) {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/[^0-9+\s\-()]/g, '');
    this.form.telefono = input.value;
  }
}