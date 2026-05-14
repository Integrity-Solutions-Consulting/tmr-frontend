import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-badge-estado',
  standalone: true,
  imports: [],
  templateUrl: './badge-estado.html',
  styleUrl: './badge-estado.scss'
})
export class BadgeEstado {
  @Input() estado: string = '';
}