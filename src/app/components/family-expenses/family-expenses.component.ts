import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faPlus, faEdit, faTrash, faCheck, faTimes, faChartBar, faCalendar } from '@fortawesome/free-solid-svg-icons';
import { FamilyExpense } from '../../models/family-expense.model';
import { FamilyMember } from '../../models/family-member.model';
import { ExpensesService } from '../../services/expenses.service';
import { MembersService } from '../../services/members.service';
import { AppNavigationComponent } from "../app-navigation/app-navigation.component";
import { RouterLink } from '@angular/router';

type FilterType = 'all' | 'unpaid' | 'paid';

@Component({
  selector: 'app-family-expenses',
  imports: [CommonModule, FontAwesomeModule, AppNavigationComponent, RouterLink],
  templateUrl: './family-expenses.component.html',
  styleUrl: './family-expenses.component.css'
})
export class FamilyExpensesComponent implements OnInit {
  expenses: FamilyExpense[] = [];
  members: FamilyMember[] = [];
  filteredExpenses: FamilyExpense[] = [];
  currentFilter: FilterType = 'all';
  loading = false;

  // Icons
  faPlus = faPlus;
  faEdit = faEdit;
  faTrash = faTrash;
  faCheck = faCheck;
  faTimes = faTimes;
  faChartBar = faChartBar;
  faCalendar = faCalendar;

  constructor(
    private expensesService: ExpensesService,
    private membersService: MembersService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    
    // Cargar gastos y miembros en paralelo
    Promise.all([
      this.expensesService.getAllExpenses().toPromise(),
      this.membersService.getAllMembers().toPromise()
    ]).then(([expenses, members]) => {
      this.expenses = expenses || [];
      this.members = members || [];
      this.applyFilter();
      this.loading = false;
    }).catch(error => {
      console.error('Error loading data:', error);
      this.loading = false;
    });
  }

  applyFilter() {
    switch (this.currentFilter) {
      case 'unpaid':
        this.filteredExpenses = this.expenses.filter(expense => !expense.is_paid);
        break;
      case 'paid':
        this.filteredExpenses = this.expenses.filter(expense => expense.is_paid);
        break;
      default:
        this.filteredExpenses = this.expenses;
    }
  }

  setFilter(filter: FilterType) {
    this.currentFilter = filter;
    this.applyFilter();
  }

  togglePaidStatus(expense: FamilyExpense) {
    const updatedExpense = { ...expense, is_paid: !expense.is_paid };
    
    this.expensesService.togglePaidStatus(expense.id!, !expense.is_paid).subscribe({
      next: (updatedExpense) => {
        // Actualizar el gasto en la lista local
        const index = this.expenses.findIndex(e => e.id === expense.id);
        if (index !== -1) {
          this.expenses[index] = updatedExpense;
          this.applyFilter();
        }
      },
      error: (error) => {
        console.error('Error toggling expense status:', error);
      }
    });
  }

  deleteExpense(expenseId: string) {
    const confirmed = window.confirm('¿Estás seguro de eliminar este gasto?');
    if (confirmed) {
      this.expensesService.deleteExpense(expenseId).subscribe({
        next: () => {
          this.expenses = this.expenses.filter(e => e.id !== expenseId);
          this.applyFilter();
        },
        error: (error) => {
          console.error('Error deleting expense:', error);
        }
      });
    }
  }

  editExpense(expense: FamilyExpense) {
    // Navegar al formulario de edición con el ID del gasto
    this.router.navigate(['/edit-expense', expense.id!]);
  }

  addNewExpense() {
    this.router.navigate(['/add-expense']);
  }

  getMemberName(memberId: string): string {
    const member = this.members.find(m => m.id === memberId);
    return member ? member.name : 'Sin asignar';
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

  formatAmount(amount: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getFilterButtonClass(filter: FilterType): string {
    const baseClass = 'flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-lg pl-4 pr-2';
    return this.currentFilter === filter 
      ? `${baseClass} bg-[#1978e5] text-white` 
      : `${baseClass} bg-[#e7edf3] text-[#0e141b]`;
  }

  getExpenseStatusClass(isPaid: boolean): string {
    return isPaid 
      ? 'text-green-600 font-medium' 
      : 'text-orange-600 font-medium';
  }

  getExpenseStatusText(isPaid: boolean): string {
    return isPaid ? 'Pagado' : 'Pendiente';
  }
} 