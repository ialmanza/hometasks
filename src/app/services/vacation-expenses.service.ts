import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Observable, from, map, forkJoin } from 'rxjs';
import { environment } from '../../environments/environments';
import { VacationExpense } from '../models/vacation-expense.model';
import { FamilyMember } from '../models/family-member.model';

export interface VacationExpenseStats {
  totalSpent: number;
  totalPending: number;
  totalExpenses: number;
  topSpender: { name: string; amount: number } | null;
  dailyTotals: { date: string; amount: number }[];
  memberTotals: { name: string; amount: number }[];
  upcomingExpenses: VacationExpense[];
}

@Injectable({
  providedIn: 'root'
})
export class VacationExpensesService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
  }

  // Obtener gasto de vacaciones por ID
  getVacationExpenseById(id: string): Observable<VacationExpense> {
    return from(
      this.supabase
        .from('vacation_expenses')
        .select('*')
        .eq('id', id)
        .single()
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        return response.data as VacationExpense;
      })
    );
  }

  // Obtener todos los gastos de vacaciones
  getAllVacationExpenses(): Observable<VacationExpense[]> {
    return from(
      this.supabase
        .from('vacation_expenses')
        .select('*')
        .order('created_at', { ascending: false })
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        return response.data as VacationExpense[] || [];
      })
    );
  }

  // Obtener gastos de vacaciones no pagados
  getUnpaidVacationExpenses(): Observable<VacationExpense[]> {
    return from(
      this.supabase
        .from('vacation_expenses')
        .select('*')
        .eq('is_paid', false)
        .order('created_at', { ascending: false })
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        return response.data as VacationExpense[] || [];
      })
    );
  }

  // Obtener gastos de vacaciones en un rango de fechas
  getVacationExpensesInRange(startDate: Date, endDate: Date): Observable<VacationExpense[]> {
    return from(
      this.supabase
        .from('vacation_expenses')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false })
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        return response.data as VacationExpense[] || [];
      })
    );
  }

  // Obtener estadísticas completas para el dashboard
  getVacationExpenseStats(range: 'week' | 'month'): Observable<VacationExpenseStats> {
    const now = new Date();
    let startDate: Date;
    
    if (range === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return forkJoin({
      expenses: this.getVacationExpensesInRange(startDate, now),
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
        return response.data as FamilyMember[] || [];
      })
    );
  }

  // Agrupar gastos por miembro con nombres
  private groupByMemberWithNames(expenses: VacationExpense[], members: FamilyMember[]): { name: string; amount: number }[] {
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
  private groupByDay(expenses: VacationExpense[]): { date: string; amount: number }[] {
    const dayMap = new Map<string, number>();
    
    expenses.forEach(expense => {
      const date = new Date(expense.created_at!).toISOString().split('T')[0];
      dayMap.set(date, (dayMap.get(date) || 0) + expense.amount);
    });
    
    return Array.from(dayMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // Crear nuevo gasto de vacaciones
  addVacationExpense(expense: Omit<VacationExpense, 'id' | 'created_at'>): Observable<VacationExpense> {
    return from(
      this.supabase
        .from('vacation_expenses')
        .insert(expense)
        .select()
        .single()
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        return response.data as VacationExpense;
      })
    );
  }

  // Actualizar gasto de vacaciones
  updateVacationExpense(expense: VacationExpense): Observable<VacationExpense> {
    const { id, created_at, ...updateData } = expense;
    
    return from(
      this.supabase
        .from('vacation_expenses')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        return response.data as VacationExpense;
      })
    );
  }

  // Eliminar gasto de vacaciones
  deleteVacationExpense(id: string): Observable<boolean> {
    return from(
      this.supabase
        .from('vacation_expenses')
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
  togglePaidStatus(id: string, isPaid: boolean): Observable<VacationExpense> {
    return from(
      this.supabase
        .from('vacation_expenses')
        .update({ is_paid: isPaid })
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        return response.data as VacationExpense;
      })
    );
  }

  // Obtener gastos de vacaciones por mes y año
  getVacationExpensesByMonth(month: number, year: number): Observable<VacationExpense[]> {
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
        .from('vacation_expenses')
        .select('*')
        .not('due_date', 'is', null) // Solo gastos con fecha de vencimiento
        .gte('due_date', startDate)
        .lt('due_date', endDate)
        .order('due_date', { ascending: true })
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        return response.data as VacationExpense[] || [];
      })
    );
  }

  // Obtener gastos de vacaciones por miembro
  getVacationExpensesByMember(memberId: string): Observable<VacationExpense[]> {
    return from(
      this.supabase
        .from('vacation_expenses')
        .select('*')
        .eq('responsible_member_id', memberId)
        .order('created_at', { ascending: false })
    ).pipe(
      map(response => {
        if (response.error) {
          throw response.error;
        }
        return response.data as VacationExpense[] || [];
      })
    );
  }
}

