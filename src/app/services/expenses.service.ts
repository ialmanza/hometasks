import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Observable, from, map } from 'rxjs';
import { environment } from '../../environments/environments';
import { FamilyExpense } from '../models/family-expense.model';

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
} 