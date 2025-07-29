import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Observable, from, map, forkJoin } from 'rxjs';
import { environment } from '../../environments/environments';
import { FamilyExpense } from '../models/family-expense.model';
import { FamilyMember } from '../models/family-member.model';

export interface ExpenseStats {
  totalSpent: number;
  totalPending: number;
  totalExpenses: number;
  topSpender: { name: string; amount: number } | null;
  dailyTotals: { date: string; amount: number }[];
  memberTotals: { name: string; amount: number }[];
  upcomingExpenses: FamilyExpense[];
}

@Injectable({
  providedIn: 'root'
})
export class ExpensesService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
  }

  // Obtener gasto por ID
  getExpenseById(id: string): Observable<FamilyExpense> {
    return from(
      this.supabase
        .from('family_expenses')
        .select('*')
        .eq('id', id)
        .single()
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        return response.data as FamilyExpense;
      })
    );
  }

  // Obtener todos los gastos
  getAllExpenses(): Observable<FamilyExpense[]> {
    return from(
      this.supabase
        .from('family_expenses')
        .select('*')
        .order('created_at', { ascending: false })
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        return response.data as FamilyExpense[];
      })
    );
  }

  // Obtener gastos no pagados
  getUnpaidExpenses(): Observable<FamilyExpense[]> {
    return from(
      this.supabase
        .from('family_expenses')
        .select('*')
        .eq('is_paid', false)
        .order('created_at', { ascending: false })
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        return response.data as FamilyExpense[];
      })
    );
  }

  // Obtener gastos en un rango de fechas
  getExpensesInRange(startDate: Date, endDate: Date): Observable<FamilyExpense[]> {
    return from(
      this.supabase
        .from('family_expenses')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false })
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        return response.data as FamilyExpense[];
      })
    );
  }

  // Obtener estadísticas completas para el dashboard
  getExpenseStats(range: 'week' | 'month'): Observable<ExpenseStats> {
    const now = new Date();
    let startDate: Date;
    
    if (range === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return forkJoin({
      expenses: this.getExpensesInRange(startDate, now),
      members: this.getAllMembers()
    }).pipe(
      map(({ expenses, members }) => {
        const totalSpent = expenses
          .filter(e => e.is_paid)
          .reduce((sum, e) => sum + e.amount, 0);
        
        const totalPending = expenses
          .filter(e => !e.is_paid)
          .reduce((sum, e) => sum + e.amount, 0);
        
        const totalExpenses = expenses.length;
        
        // Agrupar por miembro responsable con nombres
        const memberTotals = this.groupByMemberWithNames(expenses, members);
        const topSpender = memberTotals.length > 0 ? memberTotals[0] : null;
        
        // Agrupar por día
        const dailyTotals = this.groupByDay(expenses);
        
        // Gastos próximos a vencer (no pagados)
        const upcomingExpenses = expenses
          .filter(e => !e.is_paid && e.due_date)
          .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
          .slice(0, 5);

        return {
          totalSpent,
          totalPending,
          totalExpenses,
          topSpender,
          dailyTotals,
          memberTotals,
          upcomingExpenses
        };
      })
    );
  }

  // Obtener todos los miembros
  private getAllMembers(): Observable<FamilyMember[]> {
    return from(
      this.supabase
        .from('family_members')
        .select('*')
        .order('created_at', { ascending: false })
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        return response.data as FamilyMember[];
      })
    );
  }

  // Agrupar gastos por miembro
  private groupByMember(expenses: FamilyExpense[]): { name: string; amount: number }[] {
    const memberMap = new Map<string, number>();
    
    expenses.forEach(expense => {
      const memberName = expense.responsible_member_id || 'Sin asignar';
      memberMap.set(memberName, (memberMap.get(memberName) || 0) + expense.amount);
    });
    
    return Array.from(memberMap.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }

  // Agrupar gastos por miembro con nombres
  private groupByMemberWithNames(expenses: FamilyExpense[], members: FamilyMember[]): { name: string; amount: number }[] {
    const memberMap = new Map<string, number>();
    const memberNameMap = new Map<string, string>();
    
    // Crear mapa de IDs a nombres
    members.forEach(member => {
      memberNameMap.set(member.id!, member.name);
    });
    
    expenses.forEach(expense => {
      const memberId = expense.responsible_member_id;
      const memberName = memberId ? (memberNameMap.get(memberId) || 'Miembro no encontrado') : 'Sin asignar';
      memberMap.set(memberName, (memberMap.get(memberName) || 0) + expense.amount);
    });
    
    return Array.from(memberMap.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }

  // Agrupar gastos por día
  private groupByDay(expenses: FamilyExpense[]): { date: string; amount: number }[] {
    const dayMap = new Map<string, number>();
    
    expenses.forEach(expense => {
      const date = new Date(expense.created_at!).toISOString().split('T')[0];
      dayMap.set(date, (dayMap.get(date) || 0) + expense.amount);
    });
    
    return Array.from(dayMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // Crear nuevo gasto
  addExpense(expense: Omit<FamilyExpense, 'id' | 'created_at'>): Observable<FamilyExpense> {
    return from(
      this.supabase
        .from('family_expenses')
        .insert(expense)
        .select()
        .single()
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        return response.data as FamilyExpense;
      })
    );
  }

  // Actualizar gasto
  updateExpense(expense: FamilyExpense): Observable<FamilyExpense> {
    const { id, created_at, ...updateData } = expense;
    
    return from(
      this.supabase
        .from('family_expenses')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        return response.data as FamilyExpense;
      })
    );
  }

  // Eliminar gasto
  deleteExpense(id: string): Observable<boolean> {
    return from(
      this.supabase
        .from('family_expenses')
        .delete()
        .eq('id', id)
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        return true;
      })
    );
  }

  // Cambiar estado de pago
  togglePaidStatus(id: string, isPaid: boolean): Observable<FamilyExpense> {
    return from(
      this.supabase
        .from('family_expenses')
        .update({ is_paid: isPaid })
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        return response.data as FamilyExpense;
      })
    );
  }

  // Obtener gastos por mes y año
  getExpensesByMonth(month: number, year: number): Observable<FamilyExpense[]> {
    // Asegurar que month sea un número
    const monthNum = Number(month);
    const yearNum = Number(year);
    
    // Calcular la fecha de inicio del mes
    const startDate = `${yearNum}-${monthNum.toString().padStart(2, '0')}-01`;
    
    // Calcular la fecha de inicio del siguiente mes
    let nextMonth = monthNum + 1;
    let nextYear = yearNum;
    
    // Si estamos en diciembre, el siguiente mes es enero del año siguiente
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear = yearNum + 1;
    }
    
    const endDate = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`;
    
    return from(
      this.supabase
        .from('family_expenses')
        .select('*')
        .not('due_date', 'is', null) // Solo gastos con due_date
        .gte('due_date', startDate)
        .lt('due_date', endDate)
        .order('due_date', { ascending: true })
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        return response.data as FamilyExpense[];
      })
    );
  }
} 