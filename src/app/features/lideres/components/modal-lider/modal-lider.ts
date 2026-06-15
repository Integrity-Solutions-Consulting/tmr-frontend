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
  nombreCompleto: string;
  email: string;
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
  @Output() guardar = new EventEmitter<any>();

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
        nombres: this.lider.nombre || '',
        apellidos: this.lider.apellidos || '',
        correo: this.lider.correo || '',
        telefono: this.lider.telefono || '',
        estado: this.lider.estado || 'Activo'
      };
    } else {
      this.form = {
        tipoId: '' as any,
        tipoNombre: '',
        personaId: '',
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
   } else if (campo === 'persona' && valor && typeof valor === 'object') {
  this.form.personaId = valor.id.toString();
  this.form.nombres = valor.nombreCompleto.split(' ')[0];
  this.form.apellidos = valor.nombreCompleto.split(' ').slice(1).join(' ');
  this.form.correo = valor.email;
  this.form.telefono = '';
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

  formularioValido(): boolean {
    const baseValid = !!this.form.tipoId && !!this.form.nombres && !!this.form.apellidos && !!this.form.correo && !!this.form.telefono;
    if (this.modoEdicion) {
      return baseValid && !!this.form.estado;
    }
    return baseValid && !!this.form.personaId;
  }

  onGuardar() {
    if (this.guardando) return;

    this.enviado = true;
    if (!this.formularioValido()) return;

    this.guardar.emit({
      tipoId: Number(this.form.tipoId),
      personaId: this.form.personaId ? Number(this.form.personaId) : undefined,
      nombres: this.form.nombres.trim(),
      apellidos: this.form.apellidos.trim(),
      correo: this.form.correo.trim(),
      telefono: this.form.telefono.trim(),
      estado: this.form.estado as 'Activo' | 'Inactivo'
    });
  }
}
