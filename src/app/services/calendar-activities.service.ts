import { Injectable } from '@angular/core';
import { CalendarActivity, CalendarActivityWithMember } from '../models/calendar-activity';
import { AuthService } from './auth.service';
import { supabase } from './Supabase-Client/supabase-client';

@Injectable({
  providedIn: 'root'
})
export class CalendarActivitiesService {

  constructor(private authService: AuthService) {}

  // Obtener actividades por mes
  async getActivitiesByMonth(month: number, year: number): Promise<CalendarActivityWithMember[]> {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = `${year}-${month.toString().padStart(2, '0')}-31`;

    const { data, error } = await supabase
      .from('calendar_activities')
      .select(`
        *,
        family_members(name, color)
      `)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    if (error) {
      console.error('Error fetching activities by month:', error);
      return [];
    }

    return data?.map(item => ({
      ...item,
      member_name: item.family_members?.name,
      member_color: item.family_members?.color
    })) || [];
  }

  // Obtener actividades por día específico
  async getActivitiesByDay(date: string): Promise<CalendarActivityWithMember[]> {
    const { data, error } = await supabase
      .from('calendar_activities')
      .select(`
        *,
        family_members(name, color)
      `)
      .eq('date', date)
      .order('time', { ascending: true });

    if (error) {
      console.error('Error fetching activities by day:', error);
      return [];
    }

    return data?.map(item => ({
      ...item,
      member_name: item.family_members?.name,
      member_color: item.family_members?.color
    })) || [];
  }

  // Crear nueva actividad
  async createActivity(activity: CalendarActivity): Promise<CalendarActivity | null> {
    // Obtener el ID del usuario actual
    const userId = await this.authService.getCurrentUserId();
    if (!userId) {
      console.error('No authenticated user found');
      return null;
    }

    // Asegurar que el user_id sea el correcto
    const activityWithUserId = {
      ...activity,
      user_id: userId
    };

    const { data, error } = await supabase
      .from('calendar_activities')
      .insert(activityWithUserId)
      .select()
      .single();

    if (error) {
      console.error('Error creating activity:', error);
      return null;
    }
    return data;
  }

  // Actualizar actividad
  async updateActivity(id: number, activity: Partial<CalendarActivity>): Promise<CalendarActivity | null> {
    const { data, error } = await supabase
      .from('calendar_activities')
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

  // Eliminar actividad
  async deleteActivity(id: number): Promise<boolean> {
    const { error } = await supabase
      .from('calendar_activities')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting activity:', error);
      return false;
    }
    return true;
  }

  // Obtener actividades filtradas por tipo
  async getActivitiesByType(month: number, year: number, type: string): Promise<CalendarActivityWithMember[]> {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = `${year}-${month.toString().padStart(2, '0')}-31`;

    const { data, error } = await supabase
      .from('calendar_activities')
      .select(`
        *,
        family_members(name, color)
      `)
      .eq('activity_type', type)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    if (error) {
      console.error('Error fetching activities by type:', error);
      return [];
    }

    return data?.map(item => ({
      ...item,
      member_name: item.family_members?.name,
      member_color: item.family_members?.color
    })) || [];
  }

  // Obtener actividades filtradas por miembro
  async getActivitiesByMember(month: number, year: number, memberId: string): Promise<CalendarActivityWithMember[]> {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = `${year}-${month.toString().padStart(2, '0')}-31`;

    const { data, error } = await supabase
      .from('calendar_activities')
      .select(`
        *,
        family_members(name, color)
      `)
      .eq('member_id', memberId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    if (error) {
      console.error('Error fetching activities by member:', error);
      return [];
    }

    return data?.map(item => ({
      ...item,
      member_name: item.family_members?.name,
      member_color: item.family_members?.color
    })) || [];
  }

  // Verificar si existe una actividad duplicada en la misma fecha y hora
  async checkDuplicateActivity(date: string, time: string, memberId: string, excludeId?: number): Promise<boolean> {
    let query = supabase
      .from('calendar_activities')
      .select('id')
      .eq('date', date)
      .eq('time', time)
      .eq('member_id', memberId);

    // Si estamos editando una actividad, excluirla de la verificación
    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error checking duplicate activity:', error);
      return false;
    }

    return (data?.length || 0) > 0;
  }
} 