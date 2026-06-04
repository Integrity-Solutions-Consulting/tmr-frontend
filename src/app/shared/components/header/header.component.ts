import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="header-container">
      <div>
        <h1 class="header-title">{{ title() }}</h1>
        <p class="header-subtitle">{{ subtitle() }}</p>
      </div>
    </div>
  `,
  styles: [`
    .header-container {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      width: 100%;
      padding: 0 0 24px 0;
    }
    .header-title {
      font-size: 28px;
      font-weight: 800;
      color: #163572;
      letter-spacing: -0.025em;
      line-height: 1;
      margin: 0;
    }
    .header-subtitle {
      color: #7C7C7C;
      font-size: 13px;
      margin-top: 8px;
      margin-bottom: 0;
      font-weight: 500;
    }
  `]
})
export class HeaderComponent {
  title = input<string>('');
  subtitle = input<string>('');
}
