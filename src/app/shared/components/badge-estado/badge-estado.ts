import { Component, Input, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-badge-estado',
  standalone: true,
  imports: [NgClass],
  templateUrl: './badge-estado.html',
  styleUrl: './badge-estado.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class BadgeEstado {
  @Input() estado = '';
}