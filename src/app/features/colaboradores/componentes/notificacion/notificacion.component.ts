import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Notificacion } from '../../models/colaborador.model';

@Component({
  selector: 'app-notificacion-colaborador',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notificacion.component.html',
  styleUrl: './notificacion.component.scss',
})
export class NotificacionColaboradorComponent implements OnInit, OnDestroy {
  @Input() notificacion: Notificacion | null = null;
  @Output() cerrar = new EventEmitter<void>();

  private timer: any;

  ngOnInit(): void {
    this.timer = setTimeout(() => this.cerrar.emit(), 2500);
  }

  ngOnDestroy(): void {
    clearTimeout(this.timer);
  }
}
