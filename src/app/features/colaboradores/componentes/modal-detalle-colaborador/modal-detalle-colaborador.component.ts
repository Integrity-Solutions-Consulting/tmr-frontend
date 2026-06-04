import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Colaborador } from '../../models/colaborador.model';
import { BadgeEstadoComponent } from '../../../../shared/components/badge-estado/badge-estado.component';
 
@Component({
  selector: 'app-modal-detalle-colaborador',
  standalone: true,
  imports: [CommonModule, BadgeEstadoComponent],
  templateUrl: './modal-detalle-colaborador.component.html',
  styleUrl: './modal-detalle-colaborador.component.scss',
})
export class ModalDetalleColaboradorComponent {
  @Input() colaborador!: Colaborador;
  @Output() cerrar  = new EventEmitter<void>();
  @Output() editar  = new EventEmitter<Colaborador>();
 
  proyectosExpandido = false;
 
  toggleProyectos(): void {
    this.proyectosExpandido = !this.proyectosExpandido;
  }
 
  onEditar(): void {
    this.editar.emit(this.colaborador);
  }
 
  onCerrar(): void {
    this.cerrar.emit();
  }
 
  formatFecha(fecha: string): string {
    if (!fecha) return '—';
    const [y, m, d] = fecha.split('-');
    return `${d}/${m}/${y}`;
  }


  get contratoTipo(): string {
    return this.colaborador?.tipoContrato ?? '';
  }

 
  get codigoColaborador(): string {
    return this.colaborador?.codigoEmpleado ?? '';
  }
}
