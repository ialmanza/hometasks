import { CommonModule } from '@angular/common';
import { Component, OnInit, HostListener } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { AppNavigationComponent } from './components/app-navigation/app-navigation.component';
import { AppUpdateComponent } from './components/app-update/app-update.component';
import { PushSubscriptionService } from './services/push-subscription.service';
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

  constructor(
    private router: Router,
    private pushSubscriptionService: PushSubscriptionService
  ) {}

  ngOnInit() {
    this.checkScreenSize();
    this.checkCurrentRoute();

    // Suscribirse solo a los eventos NavigationEnd para detectar cambios de ruta
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.checkCurrentRoute();
    });

    // Las notificaciones push se inicializan después del login exitoso
    // para evitar conflictos con la autenticación
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
  }
}
