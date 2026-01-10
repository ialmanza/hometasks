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

interface MemberStats {
  totalExpenses: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
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

  // Filtro por miembro
  selectedMemberId: string | null = null;
  memberStats: MemberStats = {
    totalExpenses: 0,
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0
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
    let filtered: FamilyExpense[] = this.expenses;

    // Aplicar filtro por estado
    switch (this.currentFilter) {
      case 'paid':
        filtered = filtered.filter(e => e.is_paid === true);
        break;
      case 'pending':
        filtered = filtered.filter(e => e.is_paid === false);
        break;
      default:
        // 'all' - no filtrar por estado
        break;
    }

    // Aplicar filtro por miembro (si hay selección)
    if (this.selectedMemberId) {
      filtered = filtered.filter(e => e.responsible_member_id === this.selectedMemberId);
    }

    this.filteredExpenses = filtered;
    this.calculateMemberStats();
  }

  setFilter(filter: FilterType): void {
    this.currentFilter = filter;
    this.applyFilter();
    // calculateMemberStats se llama dentro de applyFilter()
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
    // El filtro de miembro se mantiene al cambiar mes/año para mejor UX
    this.loadData();
  }

  /**
   * TrackBy function para optimizar el renderizado de la lista de gastos.
   */
  trackByExpenseId(index: number, expense: FamilyExpense): string {
    return expense.id || index.toString();
  }

  getMemberName(memberId: string | null): string {
    if (!memberId) {
      return 'Todos los miembros';
    }
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

  /**
   * Genera el mensaje de título para el estado vacío considerando todos los filtros activos.
   */
  getEmptyStateTitle(): string {
    const monthYear = `${this.getSelectedMonthName()} ${this.selectedYear}`;
    const memberName = this.selectedMemberId ? this.getMemberName(this.selectedMemberId) : null;

    if (memberName) {
      // Hay filtro por miembro activo
      if (this.currentFilter === 'paid') {
        return `No hay gastos pagados para ${memberName} en ${monthYear}`;
      } else if (this.currentFilter === 'pending') {
        return `No hay gastos pendientes para ${memberName} en ${monthYear}`;
      } else {
        return `${memberName} no tiene gastos registrados en ${monthYear}`;
      }
    } else {
      // Sin filtro por miembro
      if (this.currentFilter === 'paid') {
        return `No hay gastos pagados en ${monthYear}`;
      } else if (this.currentFilter === 'pending') {
        return `No hay gastos pendientes en ${monthYear}`;
      } else {
        return `No hay gastos en ${monthYear}`;
      }
    }
  }

  /**
   * Genera el mensaje descriptivo para el estado vacío considerando todos los filtros activos.
   */
  getEmptyStateDescription(): string {
    const monthYear = `${this.getSelectedMonthName()} ${this.selectedYear}`;
    const memberName = this.selectedMemberId ? this.getMemberName(this.selectedMemberId) : null;

    if (memberName) {
      // Hay filtro por miembro activo
      if (this.currentFilter === 'paid') {
        return `Todos los gastos de ${memberName} en este mes están pendientes de pago`;
      } else if (this.currentFilter === 'pending') {
        return `¡Excelente! Todos los gastos de ${memberName} en este mes están pagados`;
      } else {
        return `No se registraron gastos para ${memberName} con vencimiento en ${monthYear}`;
      }
    } else {
      // Sin filtro por miembro
      if (this.currentFilter === 'paid') {
        return 'Todos los gastos del mes están pendientes de pago';
      } else if (this.currentFilter === 'pending') {
        return '¡Excelente! Todos los gastos del mes están pagados';
      } else {
        return `No se registraron gastos con vencimiento en ${monthYear}`;
      }
    }
  }

  goBack(): void {
    this.location.back();
  }

  addNewExpense(): void {
    this.router.navigate(['/add-expense']);
  }

  /**
   * Calcula las estadísticas del miembro seleccionado.
   * Calcula las estadísticas basándose en TODOS los gastos del miembro en el mes,
   * independientemente del filtro de estado actual (para mostrar el total completo).
   * Solo calcula estadísticas si hay un miembro seleccionado.
   */
  calculateMemberStats(): void {
    // Si no hay miembro seleccionado, resetear estadísticas
    if (!this.selectedMemberId) {
      this.memberStats = {
        totalExpenses: 0,
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0
      };
      return;
    }

    // Obtener TODOS los gastos del miembro seleccionado (sin filtrar por estado)
    // para mostrar el total completo del miembro
    const allMemberExpenses = this.getExpensesByMember(this.selectedMemberId);

    // Si no hay gastos, establecer valores en 0
    if (allMemberExpenses.length === 0) {
      this.memberStats = {
        totalExpenses: 0,
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0
      };
      return;
    }

    // Calcular totales de TODOS los gastos del miembro
    const totalAmount = allMemberExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    
    // Filtrar gastos pagados y pendientes del miembro
    const paidExpenses = allMemberExpenses.filter(e => e.is_paid === true);
    const pendingExpenses = allMemberExpenses.filter(e => e.is_paid === false);
    
    const paidAmount = paidExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const pendingAmount = pendingExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    this.memberStats = {
      totalExpenses: allMemberExpenses.length,
      totalAmount: totalAmount,
      paidAmount: paidAmount,
      pendingAmount: pendingAmount
    };

    // Debug: mostrar los cálculos en consola
    console.log('=== ESTADÍSTICAS DEL MIEMBRO ===');
    console.log('Miembro seleccionado:', this.selectedMemberId, this.getMemberName(this.selectedMemberId || ''));
    console.log('Total gastos del miembro:', allMemberExpenses.length);
    console.log('Total monto del miembro:', totalAmount);
    console.log('Total pagado del miembro:', paidAmount);
    console.log('Total pendiente del miembro:', pendingAmount);
  }

  /**
   * Maneja el cambio de selección del filtro por miembro.
   * @param memberId ID del miembro seleccionado, o null para "Todos los miembros"
   */
  onMemberFilterChange(memberId: string | null): void {
    // Convertir string vacío a null
    if (memberId === '' || memberId === 'null') {
      this.selectedMemberId = null;
    } else {
      this.selectedMemberId = memberId;
    }
    
    // Reaplicar filtros para actualizar la lista y estadísticas
    this.applyFilter();
  }

  /**
   * Obtiene los gastos filtrados por miembro (sin considerar el filtro de estado).
   * Útil para cálculos que necesiten todos los gastos del miembro.
   * @param memberId ID del miembro, o null para todos
   * @returns Array de gastos del miembro especificado
   */
  getExpensesByMember(memberId: string | null): FamilyExpense[] {
    if (!memberId) {
      return this.expenses;
    }
    return this.expenses.filter(e => e.responsible_member_id === memberId);
  }

  /**
   * Retorna el monto de gastos pagados para mostrar en el botón del footer.
   * Si hay un miembro seleccionado, retorna los gastos pagados del miembro.
   * Si no hay miembro seleccionado, retorna el total general de gastos pagados.
   * @returns Monto total de gastos pagados (general o del miembro según filtro)
   */
  getFooterPaidAmount(): number {
    return this.selectedMemberId ? this.memberStats.paidAmount : this.stats.totalSpent;
  }

  /**
   * Retorna el monto de gastos pendientes para mostrar en el botón del footer.
   * Si hay un miembro seleccionado, retorna los gastos pendientes del miembro.
   * Si no hay miembro seleccionado, retorna el total general de gastos pendientes.
   * @returns Monto total de gastos pendientes (general o del miembro según filtro)
   */
  getFooterPendingAmount(): number {
    return this.selectedMemberId ? this.memberStats.pendingAmount : this.stats.totalPending;
  }
} 