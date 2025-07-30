import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faHome, faTasks, faShoppingCart, faDollarSign, faEllipsisV, faUsers, faCalendar, faCalendarAlt, faUtensils, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
import { AuthService } from '../../services/auth.service';

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

  constructor(private authService: AuthService) {}

  toggleMoreMenu() {
    this.showMoreMenu = !this.showMoreMenu;
  }

  closeMoreMenu() {
    this.showMoreMenu = false;
  }

  async logout() {
    try {
      await this.authService.logout();
      // Redirigir a la página de login o home
      window.location.href = '/';
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }
}
