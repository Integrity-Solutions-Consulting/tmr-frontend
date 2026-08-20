import { Injectable, signal, OnDestroy } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root'
})
export class ThemeService implements OnDestroy {
  private readonly STORAGE_KEY = 'tmr_theme_preference';

  /** Signal con la opción de tema seleccionada por el usuario ('light', 'dark', 'system') */
  readonly selectedTheme = signal<ThemeMode>('system');

  /** Signal con el tema resuelto aplicado en el DOM ('light' | 'dark') */
  readonly activeTheme = signal<'light' | 'dark'>('light');

  private mediaQueryListener?: (e: MediaQueryListEvent) => void;
  private mediaQuery?: MediaQueryList;
  private isInitialized = false;

  /**
   * Método público de inicialización única (se invoca desde AppComponent)
   */
  initializeTheme(): void {
    if (this.isInitialized) {
      return;
    }
    this.isInitialized = true;

    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const savedTheme = localStorage.getItem(this.STORAGE_KEY) as ThemeMode | null;
    const initialTheme: ThemeMode = savedTheme && ['light', 'dark', 'system'].includes(savedTheme)
      ? savedTheme
      : 'system';

    this.setTheme(initialTheme);
  }

  /**
   * Cambia el tema de la aplicación y persiste la preferencia
   */
  setTheme(mode: ThemeMode): void {
    this.selectedTheme.set(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, mode);
    }
    this.applyTheme(mode);
  }

  private applyTheme(mode: ThemeMode): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    this.cleanupMediaQueryListener();

    let resolvedTheme: 'light' | 'dark';

    if (mode === 'system') {
      this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      resolvedTheme = this.mediaQuery.matches ? 'dark' : 'light';

      this.mediaQueryListener = (event: MediaQueryListEvent) => {
        if (this.selectedTheme() === 'system') {
          const newResolved = event.matches ? 'dark' : 'light';
          this.activeTheme.set(newResolved);
          document.documentElement.setAttribute('data-theme', newResolved);
        }
      };
      this.mediaQuery.addEventListener('change', this.mediaQueryListener);
    } else {
      resolvedTheme = mode;
    }

    this.activeTheme.set(resolvedTheme);
    document.documentElement.setAttribute('data-theme', resolvedTheme);
  }

  private cleanupMediaQueryListener(): void {
    if (this.mediaQuery && this.mediaQueryListener) {
      this.mediaQuery.removeEventListener('change', this.mediaQueryListener);
      this.mediaQueryListener = undefined;
    }
  }

  ngOnDestroy(): void {
    this.cleanupMediaQueryListener();
  }
}
