import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly THEME_KEY = 'app-theme';

  // Signal para el tema actual
  currentTheme = signal<Theme>('system');

  // Signal para el tema efectivo (light o dark, resuelto desde system si es necesario)
  effectiveTheme = signal<'light' | 'dark'>('light');

  constructor() {
    // Cargar tema guardado al inicializar
    const savedTheme = this.getTheme();
    this.currentTheme.set(savedTheme);
    
    // Aplicar tema inicial inmediatamente
    this.applyTheme(savedTheme);

    // Efecto para aplicar el tema cuando cambie
    effect(() => {
      const theme = this.currentTheme();
      this.applyTheme(theme);
    });

    // Escuchar cambios en la preferencia del sistema
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleSystemThemeChange = () => {
        if (this.currentTheme() === 'system') {
          this.applyTheme('system');
        }
      };

      // Usar addEventListener para compatibilidad
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleSystemThemeChange);
      } else {
        // Fallback para navegadores antiguos
        mediaQuery.addListener(handleSystemThemeChange);
      }
    }
  }

  /**
   * Obtiene el tema guardado en localStorage
   */
  getTheme(): Theme {
    if (typeof window === 'undefined' || !window.localStorage) {
      return 'system';
    }

    const saved = localStorage.getItem(this.THEME_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
    return 'system';
  }

  /**
   * Obtiene la preferencia del sistema (light o dark)
   */
  private getSystemTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return 'light';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  /**
   * Resuelve el tema efectivo (light o dark) desde el tema seleccionado
   */
  private resolveTheme(theme: Theme): 'light' | 'dark' {
    if (theme === 'system') {
      return this.getSystemTheme();
    }
    return theme;
  }

  /**
   * Aplica el tema al elemento HTML
   */
  private applyTheme(theme: Theme): void {
    if (typeof document === 'undefined') {
      return;
    }

    const effectiveTheme = this.resolveTheme(theme);
    this.effectiveTheme.set(effectiveTheme);

    const htmlElement = document.documentElement;
    
    if (effectiveTheme === 'dark') {
      htmlElement.classList.add('dark');
      htmlElement.classList.remove('light');
    } else {
      htmlElement.classList.add('light');
      htmlElement.classList.remove('dark');
    }

    // Actualizar meta theme-color para la barra de estado en móviles
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', effectiveTheme === 'dark' ? '#191d1f' : '#f7f8f8');
    }
  }

  /**
   * Guarda el tema en localStorage y lo aplica
   */
  setTheme(theme: Theme): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    localStorage.setItem(this.THEME_KEY, theme);
    this.currentTheme.set(theme);
    // El efecto se encargará de aplicar el tema automáticamente
  }

  /**
   * Obtiene el nombre de la aplicación
   */
  getAppName(): string {
    return 'HomeTasks';
  }

  /**
   * Obtiene la versión de la aplicación
   */
  getAppVersion(): string {
    return '1.0.0';
  }
}

