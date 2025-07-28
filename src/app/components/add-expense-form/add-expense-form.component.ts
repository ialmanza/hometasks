import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faX, faCalendar, faSmile } from '@fortawesome/free-solid-svg-icons';
import { ActivatedRoute, Router } from '@angular/router';
import { FamilyExpense } from '../../models/family-expense.model';
import { FamilyMember } from '../../models/family-member.model';
import { ExpensesService } from '../../services/expenses.service';
import { MembersService } from '../../services/members.service';
import { AppNavigationComponent } from "../app-navigation/app-navigation.component";
import { EXPENSE_ICONS, ExpenseIcon, getIconByTitle } from './expense-icons';

@Component({
  selector: 'app-add-expense-form',
  imports: [CommonModule, ReactiveFormsModule, FontAwesomeModule, AppNavigationComponent],
  templateUrl: './add-expense-form.component.html',
  styleUrl: './add-expense-form.component.css'
})
export class AddExpenseFormComponent implements OnInit {
  expenseForm: FormGroup;
  members: FamilyMember[] = [];
  loading = false;
  submitting = false;
  isEditing = false;
  expenseId: string | null = null;
  currentExpense: FamilyExpense | null = null;
  showIconSelector = false;
  expenseIcons = EXPENSE_ICONS;
  selectedIcon = '💰';

  // Icons
  faX = faX;
  faCalendar = faCalendar;
  faSmile = faSmile;

  constructor(
    private expensesService: ExpensesService,
    private membersService: MembersService,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.expenseForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', Validators.maxLength(500)],
      amount: ['', [Validators.required, Validators.min(1)]], // Mínimo 1 peso argentino
      due_date: ['', Validators.required],
      responsible_member_id: [''],
      icon: ['']
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.icon-selector-container') && this.showIconSelector) {
      this.showIconSelector = false;
    }
  }

  ngOnInit() {
    this.loadMembers();
    this.checkIfEditing();
    this.setupIconAutoSelection();
  }

  setupIconAutoSelection() {
    // Auto-seleccionar ícono basado en el título cuando el usuario escribe
    this.expenseForm.get('title')?.valueChanges.subscribe(title => {
      if (title && !this.expenseForm.get('icon')?.value) {
        const suggestedIcon = getIconByTitle(title);
        this.selectedIcon = suggestedIcon;
        this.expenseForm.patchValue({ icon: suggestedIcon });
      }
    });
  }

  checkIfEditing() {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditing = true;
        this.expenseId = params['id'];
        if (this.expenseId) {
          this.loadExpenseForEditing(this.expenseId);
        }
      }
    });
  }

  loadExpenseForEditing(expenseId: string) {
    this.loading = true;
    this.expensesService.getExpenseById(expenseId).subscribe({
      next: (expense: FamilyExpense) => {
        this.currentExpense = expense;
        this.populateFormWithExpense(expense);
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading expense for editing:', error);
        this.loading = false;
        // Si no se puede cargar el gasto, redirigir a la lista
        this.router.navigate(['/expenses']);
      }
    });
  }

  populateFormWithExpense(expense: FamilyExpense) {
    // Formatear la fecha para el input de tipo date
    if (expense.due_date) {
      const dueDate = new Date(expense.due_date);
      const formattedDate = dueDate.toISOString().split('T')[0];

      this.expenseForm.patchValue({
        title: expense.title,
        description: expense.description || '',
        amount: expense.amount.toString(),
        due_date: formattedDate,
        responsible_member_id: expense.responsible_member_id || '',
        icon: expense.icon || getIconByTitle(expense.title)
      });
      
      this.selectedIcon = expense.icon || getIconByTitle(expense.title);
    }
  }

  loadMembers() {
    this.loading = true;
    this.membersService.getAllMembers().subscribe({
      next: (members) => {
        this.members = members;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading members:', error);
        this.loading = false;
      }
    });
  }

  toggleIconSelector() {
    this.showIconSelector = !this.showIconSelector;
  }

  selectIcon(icon: ExpenseIcon) {
    this.selectedIcon = icon.emoji;
    this.expenseForm.patchValue({ icon: icon.emoji });
    this.showIconSelector = false;
  }

  getIconsByCategory(category: string): ExpenseIcon[] {
    return this.expenseIcons.filter(icon => icon.category === category);
  }

  getUniqueCategories(): string[] {
    return [...new Set(this.expenseIcons.map(icon => icon.category))];
  }

  onSubmit() {
    if (this.expenseForm.valid) {
      this.submitting = true;
      
      const expenseData: Omit<FamilyExpense, 'id' | 'created_at'> = {
        title: this.expenseForm.get('title')?.value,
        description: this.expenseForm.get('description')?.value || '',
        amount: parseFloat(this.expenseForm.get('amount')?.value),
        due_date: this.expenseForm.get('due_date')?.value,
        is_paid: this.currentExpense?.is_paid || false,
        responsible_member_id: this.expenseForm.get('responsible_member_id')?.value || null,
        icon: this.expenseForm.get('icon')?.value || this.selectedIcon
      };

      if (this.isEditing && this.expenseId) {
        // Actualizar gasto existente
        const updatedExpense: FamilyExpense = {
          id: this.expenseId,
          ...expenseData,
          created_at: this.currentExpense?.created_at || new Date().toISOString()
        };
        
        this.expensesService.updateExpense(updatedExpense).subscribe({
          next: () => {
            this.submitting = false;
            this.router.navigate(['/expenses']);
          },
          error: (error: any) => {
            console.error('Error updating expense:', error);
            this.submitting = false;
          }
        });
      } else {
        // Crear nuevo gasto
        this.expensesService.addExpense(expenseData).subscribe({
          next: () => {
            this.expenseForm.reset();
            this.submitting = false;
            this.router.navigate(['/expenses']);
          },
          error: (error) => {
            console.error('Error adding expense:', error);
            this.submitting = false;
          }
        });
      }
    } else {
      this.markFormGroupTouched();
    }
  }

  markFormGroupTouched() {
    Object.keys(this.expenseForm.controls).forEach(key => {
      const control = this.expenseForm.get(key);
      control?.markAsTouched();
    });
  }

  goBack() {
    this.router.navigate(['/expenses']);
  }

  formatAmount(event: any) {
    let value = event.target.value;
    // Remover caracteres no numéricos excepto punto
    value = value.replace(/[^\d.]/g, '');
    // Asegurar solo un punto decimal
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    // Limitar a 2 decimales
    if (parts.length === 2 && parts[1].length > 2) {
      value = parts[0] + '.' + parts[1].substring(0, 2);
    }
    this.expenseForm.patchValue({ amount: value });
  }

  getMemberName(memberId: string): string {
    const member = this.members.find(m => m.id === memberId);
    return member ? member.name : '';
  }

  getErrorMessage(controlName: string): string {
    const control = this.expenseForm.get(controlName);
    if (control?.invalid && control?.touched) {
      if (control.errors?.['required']) {
        return `${this.getFieldLabel(controlName)} es requerido`;
      }
      if (control.errors?.['minlength']) {
        return `${this.getFieldLabel(controlName)} debe tener al menos ${control.errors['minlength'].requiredLength} caracteres`;
      }
      if (control.errors?.['min']) {
        return `${this.getFieldLabel(controlName)} debe ser al menos ${control.errors['min'].min}`;
      }
      if (control.errors?.['maxlength']) {
        return `${this.getFieldLabel(controlName)} no debe tener más de ${control.errors['maxlength'].requiredLength} caracteres`;
      }
    }
    return '';
  }

  private getFieldLabel(controlName: string): string {
    const labels: { [key: string]: string } = {
      title: 'Título',
      description: 'Descripción',
      amount: 'Monto',
      due_date: 'Fecha de vencimiento',
      responsible_member_id: 'Miembro responsable',
      icon: 'Ícono'
    };
    return labels[controlName] || controlName;
  }
} 