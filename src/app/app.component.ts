import { CommonModule } from '@angular/common';
import { Component, OnInit, HostListener } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { AppNavigationComponent } from './components/app-navigation/app-navigation.component';
import { AppUpdateComponent } from './components/app-update/app-update.component';
import { PushSubscriptionService } from './services/push-subscription.service';
import { PinLockService } from './services/pin-lock.service';
import { SettingsService } from './services/settings/settings.service';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, AppNavigationComponent, AppUpdateComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  isDesktop = false;
  isLoginPage = false;
  isSettingsPage = false;
  isLockPage = false;
  isPinRelatedPage = false; // Para pantallas relacionadas con PIN

  constructor(
    private router: Router,
    private pushSubscriptionService: PushSubscriptionService,
    private pinLockService: PinLockService,
    private settingsService: SettingsService
  ) {}

  ngOnInit() {
    // Limpiar cache de desbloqueo al recargar la página
    // Esto asegura que siempre se pida el PIN después de una recarga
    this.clearUnlockCacheOnReload();

    // Inicialización básica primero (síncrona)
    this.checkScreenSize();
    this.checkCurrentRoute();

    // Manejar errores de navegación no capturados
    this.setupErrorHandling();

    // Suscribirse solo a los eventos NavigationEnd para detectar cambios de ruta
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.checkCurrentRoute();
    });

    // Las notificaciones push se inicializan después del login exitoso
    // para evitar conflictos con la autenticación
  }

  /**
   * Limpia el cache de desbloqueo cuando se recarga la página
   * Usa sessionStorage para detectar si es una recarga de página
   */
  private clearUnlockCacheOnReload() {
    const SESSION_KEY = 'app_session_active';
    const wasActive = sessionStorage.getItem(SESSION_KEY);
    
    if (!wasActive) {
      // Es una recarga de página o primera carga
      // Limpiar el cache de desbloqueo para que se pida el PIN
      this.pinLockService.clearUnlockCache();
      console.log('Cache de desbloqueo limpiado por recarga de página');
    }
    
    // Marcar que la sesión está activa
    sessionStorage.setItem(SESSION_KEY, 'true');
    
    // Limpiar cuando se cierra la pestaña/ventana
    window.addEventListener('beforeunload', () => {
      sessionStorage.removeItem(SESSION_KEY);
    });
  }

  /**
   * Configura el manejo de errores global para la aplicación
   */
  private setupErrorHandling(): void {
    // Manejar errores no capturados
    window.addEventListener('error', (event) => {
      console.error('Error global capturado:', event.error);
      // No bloquear la aplicación por errores no críticos
    });

    // Manejar promesas rechazadas no capturadas
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Promesa rechazada no capturada:', event.reason);
      // Prevenir que el error bloquee la aplicación
      event.preventDefault();
    });
  }

  // Método comentado - las notificaciones se inicializan después del login
  // private async initializePushNotifications() {
  //   try {
  //     console.log('Inicializando notificaciones push...');
  //     await this.pushSubscriptionService.checkAndSubscribe();
  //   } catch (error) {
  //     console.error('Error inicializando notificaciones push:', error);
  //   }
  // }

  @HostListener('window:resize')
  onResize() {
    this.checkScreenSize();
  }

  private checkScreenSize() {
    this.isDesktop = window.innerWidth >= 768;
  }

  private checkCurrentRoute() {
    const currentUrl = this.router.url;
    // Verificar si la ruta actual es login (la ruta raíz ahora redirige al dashboard)
    this.isLoginPage = currentUrl === '/login';
    
    // Verificar si la ruta actual es lock screen
    this.isLockPage = currentUrl === '/lock' || currentUrl.startsWith('/lock?');
    
    // Verificar si la ruta actual es settings
    // Ocultar navegación siempre en settings porque:
    // 1. Settings tiene su propia UI completa con botón atrás
    // 2. Cuando está configurando/cambiando PIN, definitivamente no necesita navegación
    // 3. Settings puede estar en modo de configuración inicial o cambio de PIN
    const isSettingsRoute = currentUrl === '/settings' || currentUrl.startsWith('/settings');
    this.isSettingsPage = isSettingsRoute;
    
    // Verificar si estamos en una pantalla relacionada con PIN
    // Esto incluye lock screen y settings (que puede estar en modo PIN)
    this.isPinRelatedPage = this.isLockPage || this.isSettingsPage;
  }
}
