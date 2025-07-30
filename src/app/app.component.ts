import { CommonModule } from '@angular/common';
import { Component, OnInit, HostListener } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { AppNavigationComponent } from './components/app-navigation/app-navigation.component';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AppNavigationComponent, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  isDesktop = false;
  isLoginPage = false;

  constructor(private router: Router) {}

  ngOnInit() {
    this.checkScreenSize();
    this.checkCurrentRoute();

    // Suscribirse solo a los eventos NavigationEnd para detectar cambios de ruta
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.checkCurrentRoute();
    });
  }

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
    console.log('Current route:', currentUrl, 'Is login page:', this.isLoginPage);
  }
}
