import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faHome, faTasks, faShoppingCart, faDollarSign, faEllipsisV, faUsers, faCalendar, faUtensils } from '@fortawesome/free-solid-svg-icons';

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
  faUtensils = faUtensils;

  toggleMoreMenu() {
    this.showMoreMenu = !this.showMoreMenu;
  }

  closeMoreMenu() {
    this.showMoreMenu = false;
  }
}
