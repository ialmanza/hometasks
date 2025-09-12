import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { FormsModule } from '@angular/forms';
import {
  faArrowLeft,
  faCalendar,
  faUser,
  faMoneyBill,
  faCheck,
  faTimes,
  faClock
} from '@fortawesome/free-solid-svg-icons';
import { Observable, Subscription, forkJoin } from 'rxjs';
import { ExpensesService } from '../../services/expenses.service';
import { MembersService } from '../../services/members.service';
import { FamilyExpense } from '../../models/family-expense.model';
import { FamilyMember } from '../../models/family-member.model';
import { Location } from '@angular/common';
import { Router } from '@angular/router';

type FilterType = 'all' | 'paid' | 'pending';

interface MonthlyStats {
  totalSpent: number;
  totalPending: number;
  totalExpenses: number;
  paidExpenses: number;
  pendingExpenses: number;
}

@Component({
  selector: 'app-monthly-transactions',
  standalone: true,
  imports: [CommonModule, RouterModule, FontAwesomeModule, FormsModule],
  templateUrl: './monthly-transactions.component.html',
  styleUrls: ['./monthly-transactions.component.css']
})
export class MonthlyTransactionsComponent implements OnInit, OnDestroy {
  // Iconos
  faArrowLeft = faArrowLeft;
  faCalendar = faCalendar;
  faUser = faUser;
  faMoneyBill = faMoneyBill;
  faCheck = faCheck;
  faTimes = faTimes;
  faClock = faClock;

  // Estado del componente
  expenses: FamilyExpense[] = [];
  members: FamilyMember[] = [];
  filteredExpenses: FamilyExpense[] = [];
  currentFilter: FilterType = 'all';
  loading = false;
  stats: MonthlyStats = {
    totalSpent: 0,
    totalPending: 0,
    totalExpenses: 0,
    paidExpenses: 0,
    pendingExpenses: 0
  };

  // Selector de mes/año
  selectedMonth: number;
  selectedYear: number;
  months = [
    { value: 1, name: 'Enero' },
    { value: 2, name: 'Febrero' },
    { value: 3, name: 'Marzo' },
    { value: 4, name: 'Abril' },
    { value: 5, name: 'Mayo' },
    { value: 6, name: 'Junio' },
    { value: 7, name: 'Julio' },
    { value: 8, name: 'Agosto' },
    { value: 9, name: 'Septiembre' },
    { value: 10, name: 'Octubre' },
    { value: 11, name: 'Noviembre' },
    { value: 12, name: 'Diciembre' }
  ];

  private subscription = new Subscription();

  constructor(
    private expensesService: ExpensesService,
    private membersService: MembersService,
    private location: Location,
    private router: Router
  ) {
    const now = new Date();
    this.selectedMonth = now.getMonth() + 1; // getMonth() devuelve 0-11
    this.selectedYear = now.getFullYear();
  }

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  loadData(): void {
    this.loading = true;
    
    // Cargar gastos del mes y miembros en paralelo
    this.subscription.add(
      forkJoin({
        expenses: this.expensesService.getExpensesByMonth(this.selectedMonth, this.selectedYear),
        members: this.membersService.getAllMembers()
      }).subscribe({
        next: ({ expenses, members }) => {
          console.log('=== DATOS CARGADOS ===');
          console.log('Mes/Año seleccionado:', this.selectedMonth, this.selectedYear);
          console.log('Gastos cargados:', expenses.length);
          console.log('Miembros cargados:', members.length);
          console.log('Gastos:', expenses.map(e => ({ 
            title: e.title, 
            amount: e.amount, 
            is_paid: e.is_paid, 
            due_date: e.due_date,
            created_at: e.created_at 
          })));
          
          this.expenses = expenses;
          this.members = members;
          this.calculateStats();
          this.applyFilter();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading data:', error);
          // Si hay error, asumimos que no hay gastos en ese mes
          this.expenses = [];
          this.members = [];
          this.calculateStats();
          this.applyFilter();
          this.loading = false;
        }
      })
    );
  }

  calculateStats(): void {
    // Filtrar gastos pagados y pendientes
    const paidExpenses = this.expenses.filter(e => e.is_paid === true);
    const pendingExpenses = this.expenses.filter(e => e.is_paid === false);

    // Calcular totales usando reduce con valor inicial 0
    const totalSpent = paidExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalPending = pendingExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    this.stats = {
      totalSpent: totalSpent,
      totalPending: totalPending,
      totalExpenses: this.expenses.length,
      paidExpenses: paidExpenses.length,
      pendingExpenses: pendingExpenses.length
    };

    // Debug: mostrar los cálculos en consola
    console.log('=== CÁLCULOS DE ESTADÍSTICAS ===');
    console.log('Total gastos:', this.expenses.length);
    console.log('Gastos pagados:', paidExpenses.length);
    console.log('Gastos pendientes:', pendingExpenses.length);
    console.log('Total pagado:', totalSpent);
    console.log('Total pendiente:', totalPending);
    console.log('Gastos pagados:', paidExpenses.map(e => ({ title: e.title, amount: e.amount, is_paid: e.is_paid })));
    console.log('Gastos pendientes:', pendingExpenses.map(e => ({ title: e.title, amount: e.amount, is_paid: e.is_paid })));
  }

  applyFilter(): void {
    switch (this.currentFilter) {
      case 'paid':
        this.filteredExpenses = this.expenses.filter(e => e.is_paid);
        break;
      case 'pending':
        this.filteredExpenses = this.expenses.filter(e => !e.is_paid);
        break;
      default:
        this.filteredExpenses = this.expenses;
    }
  }

  setFilter(filter: FilterType): void {
    this.currentFilter = filter;
    this.applyFilter();
  }

  getFilterButtonClass(filter: FilterType): string {
    const baseClass = 'flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-full pl-4 pr-4 transition-colors';
    return this.currentFilter === filter 
      ? `${baseClass} bg-[#1978e5] text-white` 
      : `${baseClass} bg-[#e7edf3] text-[#0e141b]`;
  }

  onMonthYearChange(): void {
    // Asegurar que los valores sean números
    this.selectedMonth = Number(this.selectedMonth);
    this.selectedYear = Number(this.selectedYear);
    this.loadData();
  }

  getMemberName(memberId: string): string {
    const member = this.members.find(m => m.id === memberId);
    return member ? member.name : 'Sin asignar';
  }

  formatAmount(amount: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format(amount);
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'Sin fecha';
    
    // Parsear la fecha como fecha local (sin zona horaria)
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month es 0-indexado
    
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit'
    });
  }

  getExpenseIcon(expense: FamilyExpense): string {
    // Si el gasto tiene un ícono personalizado, usarlo
    if (expense.icon) {
      return expense.icon;
    }
    
    // Si no, usar la lógica automática basada en el título
    const lowerTitle = expense.title.toLowerCase();
    
    if (lowerTitle.includes('rent') || lowerTitle.includes('alquiler')) return '🏠';
    if (lowerTitle.includes('utilities') || lowerTitle.includes('servicios')) return '💡';
    if (lowerTitle.includes('groceries') || lowerTitle.includes('compras')) return '🛒';
    if (lowerTitle.includes('internet') || lowerTitle.includes('wifi')) return '📶';
    if (lowerTitle.includes('subscription') || lowerTitle.includes('suscripción')) return '📺';
    if (lowerTitle.includes('insurance') || lowerTitle.includes('seguro')) return '🛡️';
    if (lowerTitle.includes('transport') || lowerTitle.includes('transporte')) return '🚗';
    if (lowerTitle.includes('entertainment') || lowerTitle.includes('entretenimiento')) return '🎮';
    
    return '💰'; // Icono por defecto
  }

  getExpenseStatusClass(isPaid: boolean): string {
    return isPaid 
      ? 'text-green-600 font-medium' 
      : 'text-orange-600 font-medium';
  }

  getExpenseStatusText(isPaid: boolean): string {
    return isPaid ? '✅ Pagado' : '❌ Pend.';
  }

  getSelectedMonthName(): string {
    const month = this.months.find(m => m.value === this.selectedMonth);
    return month ? month.name : '';
  }

  goBack(): void {
    this.location.back();
  }

  addNewExpense(): void {
    this.router.navigate(['/add-expense']);
  }
} 