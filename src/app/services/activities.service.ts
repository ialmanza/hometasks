// activities.service.ts
import { Injectable } from '@angular/core';
import { DailyActivity } from '../models/daily_activity';
import { AuthService } from './auth.service';
import { supabase } from './Supabase-Client/supabase-client';

@Injectable({
  providedIn: 'root'
})
export class ActivitiesService {

  constructor(private authService: AuthService) {}

  // Obtener todas las actividades del usuario actual
  async getActivities(): Promise<DailyActivity[]> {
    const userId = await this.authService.getCurrentUserId();
    if (!userId) {
      console.error('No authenticated user found');
      return [];
    }

    const { data, error } = await supabase
      .from('daily_activities')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching activities:', error);
      return [];
    }

    return data || [];
  }

  // Crear una nueva actividad
  async createActivity(activity: DailyActivity): Promise<DailyActivity | null> {
    const { data, error } = await supabase
      .from('daily_activitiestwo')
      .insert(activity)
      .select()
      .single();

    if (error) {
      console.error('Error creating activity:', error);
      return null;
    }
    return data;
  }

  // Obtener todas las actividades de un día específico
  async getActivitiesByDay(day: string): Promise<DailyActivity[]> {
    const { data, error } = await supabase
      .from('daily_activitiestwo')
      .select('*')
      .eq('day_of_week', day);

    if (error) {
      console.error('Error fetching activities:', error);
      return [];
    }
    return data || [];
  }

  // Actualizar una actividad
  async updateActivity(id: number, activity: Partial<DailyActivity>): Promise<DailyActivity | null> {
    const { data, error } = await supabase
      .from('daily_activitiestwo')
      .update(activity)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating activity:', error);
      return null;
    }
    return data;
  }

  // Eliminar una actividad
  async deleteActivity(id: number): Promise<boolean> {
    const { error } = await supabase
      .from('daily_activitiestwo')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting activity:', error);
      return false;
    }
    return true;
  }
}
