import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-lideres-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="lideres-placeholder">
      <div class="lideres-placeholder__icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#163572" stroke-width="1.5">
          <!-- Person with tie -->
          <circle cx="12" cy="7" r="4"/>
          <path d="M5.5 21a9 9 0 0 1 13 0"/>
          <path d="M12 14 l-1.5 3 l1.5 1.5 l1.5-1.5 z" fill="#163572"/>
          <path d="M12 17.5 v2"/>
        </svg>
      </div>
      <h1>Líderes</h1>
      <p>Este módulo está siendo desarrollado por <strong>Elisa (ERfeaturelideres)</strong>.</p>
      <p class="sub">Aquí podrás gestionar los líderes de proyecto: cards, filtros de búsqueda y formulario de creación.</p>
    </div>
  `,
  styles: [`
    .lideres-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
      text-align: center;
      font-family: 'Inter', sans-serif;
      padding: 40px;
    }
    .lideres-placeholder__icon {
      width: 100px;
      height: 100px;
      background: #eef4ff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 24px;
    }
    h1 {
      font-size: 32px;
      font-weight: 800;
      color: #163572;
      margin: 0 0 12px;
    }
    p {
      font-size: 15px;
      color: #64748b;
      max-width: 400px;
      line-height: 1.6;
      margin: 4px 0;
    }
    .sub { font-size: 13px; }
  `]
})
export class LideresPlaceholderPage {}
