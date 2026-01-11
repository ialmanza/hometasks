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
  faClock,
  faPlus,
  faEdit,
  faTrash
} from '@fortawesome/free-solid-svg-icons';
import { Observable, Subscription, forkJoin } from 'rxjs';
import { VacationExpensesService } from '../../services/vacation-expenses.service';
import { MembersService } from '../../services/members.service';
import { VacationExpense } from '../../models/vacation-expense.model';
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
  selector: 'app-vacation-expenses-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FontAwesomeModule, FormsModule],
  templateUrl: './vacation-expenses-list.component.html',
  styleUrls: ['./vacation-expenses-list.component.css']
})
export class VacationExpensesListComponent implements OnInit, OnDestroy {
  // Iconos
  faArrowLeft = faArrowLeft;
  faCalendar = faCalendar;
  faUser = faUser;
  faMoneyBill = faMoneyBill;
  faCheck = faCheck;
  faTimes = faTimes;
  faClock = faClock;
  faPlus = faPlus;
  faEdit = faEdit;
  faTrash = faTrash;

  // Estado del componente
  expenses: VacationExpense[] = [];
  members: FamilyMember[] = [];
  filteredExpenses: VacationExpense[] = [];
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
    private vacationExpensesService: VacationExpensesService,
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
        expenses: this.vacationExpensesService.getVacationExpensesByMonth(this.selectedMonth, this.selectedYear),
        members: this.membersService.getAllMembers()
      }).subscribe({
        next: ({ expenses, members }) => {
          this.expenses = expenses || [];
          this.members = members;
          this.calculateStats();
          this.applyFilter();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading vacation expenses data:', error);
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
  }

  applyFilter(): void {
    let filtered: VacationExpense[] = this.expenses;

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

  trackByExpenseId(index: number, expense: VacationExpense): string {
    return expense.id || index.toString();
  }

  getMemberName(memberId: string | null): string {
    if (!memberId) {
      return 'Sin asignar';
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

  getExpenseIcon(expense: VacationExpense): string {
    // Si el gasto tiene un ícono personalizado, usarlo
    if (expense.icon) {
      return expense.icon;
    }
    
    // Si no, usar ícono por defecto para vacaciones
    return '🏖️';
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

  getEmptyStateTitle(): string {
    const monthYear = `${this.getSelectedMonthName()} ${this.selectedYear}`;
    const memberName = this.selectedMemberId ? this.getMemberName(this.selectedMemberId) : null;

    if (memberName) {
      if (this.currentFilter === 'paid') {
        return `No hay gastos pagados para ${memberName} en ${monthYear}`;
      } else if (this.currentFilter === 'pending') {
        return `No hay gastos pendientes para ${memberName} en ${monthYear}`;
      } else {
        return `${memberName} no tiene gastos registrados en ${monthYear}`;
      }
    } else {
      if (this.currentFilter === 'paid') {
        return `No hay gastos pagados en ${monthYear}`;
      } else if (this.currentFilter === 'pending') {
        return `No hay gastos pendientes en ${monthYear}`;
      } else {
        return `No hay gastos de vacaciones en ${monthYear}`;
      }
    }
  }

  getEmptyStateDescription(): string {
    const monthYear = `${this.getSelectedMonthName()} ${this.selectedYear}`;
    const memberName = this.selectedMemberId ? this.getMemberName(this.selectedMemberId) : null;

    if (memberName) {
      if (this.currentFilter === 'paid') {
        return `Todos los gastos de vacaciones de ${memberName} en este mes están pendientes de pago`;
      } else if (this.currentFilter === 'pending') {
        return `¡Excelente! Todos los gastos de vacaciones de ${memberName} en este mes están pagados`;
      } else {
        return `No se registraron gastos de vacaciones para ${memberName} con vencimiento en ${monthYear}`;
      }
    } else {
      if (this.currentFilter === 'paid') {
        return 'Todos los gastos de vacaciones del mes están pendientes de pago';
      } else if (this.currentFilter === 'pending') {
        return '¡Excelente! Todos los gastos de vacaciones del mes están pagados';
      } else {
        return `No se registraron gastos de vacaciones con vencimiento en ${monthYear}`;
      }
    }
  }

  goBack(): void {
    this.location.back();
  }

  addNewExpense(): void {
    this.router.navigate(['/add-vacation-expense']);
  }

  editExpense(expense: VacationExpense): void {
    this.router.navigate(['/edit-vacation-expense', expense.id]);
  }

  deleteExpense(expense: VacationExpense): void {
    if (!expense.id) return;
    
    if (confirm(`¿Estás seguro de que deseas eliminar el gasto "${expense.title}"?`)) {
      this.subscription.add(
        this.vacationExpensesService.deleteVacationExpense(expense.id).subscribe({
          next: () => {
            // Recargar los datos después de eliminar
            this.loadData();
          },
          error: (error) => {
            console.error('Error deleting vacation expense:', error);
            alert('Error al eliminar el gasto. Por favor, intenta de nuevo.');
          }
        })
      );
    }
  }

  togglePaidStatus(expense: VacationExpense): void {
    if (!expense.id) return;
    
    const newPaidStatus = !expense.is_paid;
    
    this.subscription.add(
      this.vacationExpensesService.togglePaidStatus(expense.id, newPaidStatus).subscribe({
        next: () => {
          // Actualizar el gasto localmente
          expense.is_paid = newPaidStatus;
          // Recalcular estadísticas
          this.calculateStats();
          this.applyFilter();
        },
        error: (error) => {
          console.error('Error toggling paid status:', error);
          alert('Error al actualizar el estado del gasto. Por favor, intenta de nuevo.');
        }
      })
    );
  }

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

    // Obtener TODOS los gastos del miembro seleccionado
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
  }

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

  getExpensesByMember(memberId: string | null): VacationExpense[] {
    if (!memberId) {
      return this.expenses;
    }
    return this.expenses.filter(e => e.responsible_member_id === memberId);
  }

  getFooterPaidAmount(): number {
    return this.selectedMemberId ? this.memberStats.paidAmount : this.stats.totalSpent;
  }

  getFooterPendingAmount(): number {
    return this.selectedMemberId ? this.memberStats.pendingAmount : this.stats.totalPending;
  }
}

