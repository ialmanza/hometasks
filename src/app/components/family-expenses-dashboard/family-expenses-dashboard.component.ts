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
  faPhone,
  faPlus,
  faList,
  faCalendarAlt
} from '@fortawesome/free-solid-svg-icons';
import { Observable, Subscription } from 'rxjs';
import { ExpensesService, ExpenseStats } from '../../services/expenses.service';
import { ShoppingListService } from '../../services/shopping-list.service';
import { ShoppingListItem } from '../../models/shoppinglist';
import { CalendarActivitiesService } from '../../services/calendar-activities.service';
import { CalendarActivityWithMember } from '../../models/calendar-activity';
import { Location } from '@angular/common';
import { Router } from '@angular/router';

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
  faPlus = faPlus;
  faList = faList;
  faShoppingCart = faShoppingCart;
  faCalendarAlt = faCalendarAlt;

  // Estado del componente
  selectedRange: 'week' | 'month' = 'month';
  stats$: Observable<ExpenseStats> | null = null;
  stats: ExpenseStats | null = null;
  loading = true;
  error = false;

  // Shopping List
  shoppingList: ShoppingListItem[] = [];
  shoppingListLoading = false;

  // Calendar Activities
  upcomingActivities: CalendarActivityWithMember[] = [];
  activitiesLoading = false;

  private subscription = new Subscription();

  constructor(
    private expensesService: ExpensesService,
    private shoppingListService: ShoppingListService,
    private calendarActivitiesService: CalendarActivitiesService,
    private location: Location,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadShoppingList();
    this.loadUpcomingActivities();
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

  goToAddExpense(): void {
    this.router.navigate(['/add-expense']);
  }

  goToMonthlyTransactions(): void {
    this.router.navigate(['/monthly-transactions']);
  }

  goToShoppingList(): void {
    this.router.navigate(['/shopping-list']);
  }

  goToCalendar(): void {
    this.router.navigate(['/calendar']);
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

  private loadShoppingList(): void {
    this.shoppingListLoading = true;
    
    this.subscription.add(
      this.shoppingListService.getItems().subscribe({
        next: (items) => {
          // Obtener solo los últimos 5 elementos no comprados
          this.shoppingList = items
            .filter(item => !item.is_purchased)
            .slice(0, 5);
          this.shoppingListLoading = false;
        },
        error: (error) => {
          console.error('Error loading shopping list:', error);
          this.shoppingListLoading = false;
        }
      })
    );
  }

  private async loadUpcomingActivities(): Promise<void> {
    this.activitiesLoading = true;
    
    try {
      const today = new Date();
      const endDate = new Date();
      endDate.setDate(today.getDate() + 7); // 7 días desde hoy
      
      const startDateStr = today.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      // Obtener todas las actividades del mes actual y filtrar por fecha
      const currentMonth = today.getMonth() + 1;
      const currentYear = today.getFullYear();
      
      const allActivities = await this.calendarActivitiesService.getActivitiesByMonth(currentMonth, currentYear);
      
      // Filtrar actividades que están entre hoy y 7 días
      this.upcomingActivities = allActivities
        .filter(activity => {
          const activityDate = new Date(activity.date);
          return activityDate >= today && activityDate <= endDate;
        })
        .sort((a, b) => {
          // Ordenar por fecha y luego por hora
          const dateA = new Date(`${a.date} ${a.time || '00:00'}`);
          const dateB = new Date(`${b.date} ${b.time || '00:00'}`);
          return dateA.getTime() - dateB.getTime();
        })
        .slice(0, 10); // Limitar a 10 actividades
      
      this.activitiesLoading = false;
    } catch (error) {
      console.error('Error loading upcoming activities:', error);
      this.activitiesLoading = false;
    }
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

  formatTime(timeString: string | undefined): string {
    if (!timeString) return '';
    return timeString.substring(0, 5); // Formato HH:MM
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

  getCategoryIcon(category: string): any {
    const categoryIcons: { [key: string]: any } = {
      'fruits': faUtensils,
      'vegetables': faUtensils,
      'other': faShoppingCart
    };
    return categoryIcons[category] || faShoppingCart;
  }

  getCategoryColor(category: string): string {
    const categoryColors: { [key: string]: string } = {
      'fruits': 'text-green-600',
      'vegetables': 'text-green-600',
      'other': 'text-blue-600'
    };
    return categoryColors[category] || 'text-gray-600';
  }

  getActivityTypeIcon(activityType: string): any {
    const typeIcons: { [key: string]: any } = {
      'medico': faUser,
      'salida': faCar,
      'cumple': faCalendarAlt
    };
    return typeIcons[activityType] || faCalendarAlt;
  }

  getActivityTypeColor(activityType: string): string {
    const typeColors: { [key: string]: string } = {
      'medico': 'text-blue-600',
      'salida': 'text-green-600',
      'cumple': 'text-purple-600'
    };
    return typeColors[activityType] || 'text-gray-600';
  }

  getActivityTypeLabel(activityType: string): string {
    const typeLabels: { [key: string]: string } = {
      'medico': 'Médico',
      'salida': 'Salida',
      'cumple': 'Cumpleaños'
    };
    return typeLabels[activityType] || 'Otro';
  }
}
