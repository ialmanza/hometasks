import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { 
  faArrowLeft, 
  faDollarSign, 
  faClock, 
  faReceipt, 
  faUser,
  faCalendar,
  faExclamationTriangle,
  faHome,
  faCar,
  faUtensils,
  faShoppingCart,
  faWifi,
  faBolt,
  faWater,
  faPhone
} from '@fortawesome/free-solid-svg-icons';
import { Observable, Subscription } from 'rxjs';
import { ExpensesService, ExpenseStats } from '../../services/expenses.service';
import { Location } from '@angular/common';

@Component({
  selector: 'app-family-expenses-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FontAwesomeModule],
  templateUrl: './family-expenses-dashboard.component.html',
  styleUrls: ['./family-expenses-dashboard.component.css']
})
export class FamilyExpensesDashboardComponent implements OnInit, OnDestroy {
  // Iconos
  faArrowLeft = faArrowLeft;
  faDollarSign = faDollarSign;
  faClock = faClock;
  faReceipt = faReceipt;
  faUser = faUser;
  faCalendar = faCalendar;
  faExclamationTriangle = faExclamationTriangle;

  // Estado del componente
  selectedRange: 'week' | 'month' = 'month';
  stats$: Observable<ExpenseStats> | null = null;
  stats: ExpenseStats | null = null;
  loading = true;
  error = false;

  private subscription = new Subscription();

  constructor(
    private expensesService: ExpensesService,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.loadStats();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  onRangeChange(): void {
    this.loadStats();
  }

  goBack(): void {
    this.location.back();
  }

  getIcon(iconName: string): any {
    const iconMap: { [key: string]: any } = {
      'home': faHome,
      'car': faCar,
      'utensils': faUtensils,
      'shopping-cart': faShoppingCart,
      'wifi': faWifi,
      'bolt': faBolt,
      'water': faWater,
      'phone': faPhone,
      'receipt': faReceipt
    };
    return iconMap[iconName] || faReceipt;
  }

  private loadStats(): void {
    this.loading = true;
    this.error = false;
    
    this.stats$ = this.expensesService.getExpenseStats(this.selectedRange);
    
    this.subscription.add(
      this.stats$.subscribe({
        next: (stats) => {
          this.stats = stats;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading stats:', error);
          this.error = true;
          this.loading = false;
        }
      })
    );
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format(amount);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit'
    });
  }

  getDaysUntilDue(dueDate: string): number {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  getDueStatusClass(dueDate: string): string {
    const daysUntilDue = this.getDaysUntilDue(dueDate);
    if (daysUntilDue < 0) return 'text-red-500';
    if (daysUntilDue <= 3) return 'text-orange-500';
    return 'text-gray-500';
  }
} 