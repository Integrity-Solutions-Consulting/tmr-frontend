import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-lideres-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-container" style="padding: 0; background: transparent; min-height: auto;">
      <div class="header-main-row" style="margin-bottom: 24px;">
        <h1 class="page-title" style="font-size: clamp(28px, 3vw, 34px);">Líderes</h1>
      </div>
      
      <div class="table-card" style="padding: 4rem 2rem; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
        <div class="lideres-placeholder__icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#163572" stroke-width="1.5">
            <circle cx="12" cy="7" r="4"/>
            <path d="M5.5 21a9 9 0 0 1 13 0"/>
            <path d="M12 14 l-1.5 3 l1.5 1.5 l1.5-1.5 z" fill="#163572"/>
            <path d="M12 17.5 v2"/>
          </svg>
        </div>
        <h3 style="font-size: 24px; font-weight: 700; color: #163572; margin: 16px 0 8px;">Próximamente</h3>
        <p style="font-size: 15px; color: #475569; max-width: 500px; margin: 0 0 8px; line-height: 1.6;">
          Este módulo está siendo desarrollado por <strong>Elisa (ERfeaturelideres)</strong>.
        </p>
        <p style="font-size: 14px; color: #64748b; max-width: 500px; margin: 0; line-height: 1.6;">
          Aquí podrás gestionar los líderes de proyecto: cards, filtros de búsqueda y formulario de creación.
        </p>
      </div>
    </div>
  `,
  styles: [`
    .lideres-placeholder__icon {
      width: 100px;
      height: 100px;
      background: #eef4ff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto;
    }
  `]
})
export class LideresPlaceholderPage { }
