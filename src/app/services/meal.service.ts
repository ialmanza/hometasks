// meals.service.ts
import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Meal } from '../models/meals';
import { environment } from '../../environments/environments';

@Injectable({
  providedIn: 'root'
})
export class MealsService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
  }

  // Crear una nueva comida
  async createMeal(meal: Meal): Promise<Meal | null> {
    const { data, error } = await this.supabase
      .from('mealstwo')
      .insert(meal)
      .select()
      .single();

    if (error) {
      console.error('Error creating meal:', error);
      return null;
    }
    return data;
  }

  // Obtener todas las comidas de un día específico
  async getMealsByDay(day: string): Promise<Meal[]> {
    const { data, error } = await this.supabase
      .from('mealstwo')
      .select('*')
      .eq('day_of_week', day);

    if (error) {
      console.error('Error fetching meals:', error);
      return [];
    }
    return data || [];
  }

  // Actualizar una comida
  async updateMeal(id: number, meal: Partial<Meal>): Promise<Meal | null> {
    const { data, error } = await this.supabase
      .from('mealstwo')
      .update(meal)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating meal:', error);
      return null;
    }
    return data;
  }

  // Eliminar una comida
  async deleteMeal(id: number): Promise<boolean> {
    const { error } = await this.supabase
      .from('mealstwo')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting meal:', error);
      return false;
    }
    return true;
  }
}
