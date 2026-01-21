import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faHome, faTasks, faShoppingCart, faDollarSign, faEllipsisV, faUsers, faCalendar, faCalendarAlt, faUtensils, faSignOutAlt, faUmbrella, faCog } from '@fortawesome/free-solid-svg-icons';
import { PinLockService } from '../../services/pin-lock.service';

@Component({
  selector: 'app-app-navigation',
  imports: [CommonModule, RouterModule, FontAwesomeModule],
  templateUrl: './app-navigation.component.html',
  styleUrl: './app-navigation.component.css'
})
export class AppNavigationComponent {
  showMoreMenu = false;

  // Icons
  faHome = faHome;
  faTasks = faTasks;
  faShoppingCart = faShoppingCart;
  faDollarSign = faDollarSign;
  faEllipsisV = faEllipsisV;
  faUsers = faUsers;
  faCalendar = faCalendar;
  faCalendarAlt = faCalendarAlt;
  faUtensils = faUtensils;
  faSignOutAlt = faSignOutAlt;
  faUmbrella = faUmbrella;
  faCog = faCog;

  constructor(
    private pinLockService: PinLockService
  ) {}

  toggleMoreMenu() {
    this.showMoreMenu = !this.showMoreMenu;
  }

  closeMoreMenu() {
    this.showMoreMenu = false;
  }

  /**
   * Cierra sesión temporalmente (solo recarga la página y muestra el lock screen)
   * No cierra la sesión de Supabase, solo limpia el cache de desbloqueo y recarga
   * para que se muestre la pantalla de PIN
   */
  logout() {
    // Limpiar cache de desbloqueo para que se pida el PIN
    this.pinLockService.clearUnlockCache();
    // Limpiar sessionStorage para que se detecte como recarga
    sessionStorage.removeItem('app_session_active');
    // Recargar la página, lo cual activará el lock screen automáticamente
    window.location.reload();
  }
}
