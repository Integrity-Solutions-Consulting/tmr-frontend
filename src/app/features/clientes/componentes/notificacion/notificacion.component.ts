import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Notificacion } from '../../modelos/cliente.model';

@Component({
  selector: 'app-notificacion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notificacion.component.html',
  styleUrl: './notificacion.component.scss',
})
export class NotificacionComponent implements OnInit, OnDestroy {
  @Input() notificacion: Notificacion | null = null;
  @Output() cerrar = new EventEmitter<void>();

  private timer: any;

  // ── Auto cerrar después de 2.5s ───────────────────────────
  ngOnInit(): void {
    this.timer = setTimeout(() => this.cerrar.emit(), 2500);
  }

  ngOnDestroy(): void {
    clearTimeout(this.timer);
  }
}
