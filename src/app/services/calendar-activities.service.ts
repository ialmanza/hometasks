import { Injectable } from '@angular/core';
import { CalendarActivity, CalendarActivityWithMember } from '../models/calendar-activity';
import { AuthService } from './auth.service';
import { NotificationService } from './notifications.service';
import { CalendarNotificationsService } from './calendar-notifications.service';
import { PushNotificationService } from './push-notification.service';
import { GuestNotificationService } from './guest-notification.service';
import { supabase } from './Supabase-Client/supabase-client';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CalendarActivitiesService {
  private activitiesSubject = new BehaviorSubject<CalendarActivityWithMember[]>([]);
  public activities$ = this.activitiesSubject.asObservable();

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private calendarNotificationsService: CalendarNotificationsService,
    private pushNotificationService: PushNotificationService,
    private guestNotificationService: GuestNotificationService
  ) {
    this.setupRealtimeSubscription();
  }

  // Configurar suscripción en tiempo real
  private setupRealtimeSubscription() {
    const channel = supabase
      .channel('calendar_activities_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calendar_activities'
        },
        (payload) => {
          console.log('Cambio en tiempo real detectado:', payload);

          // Manejar diferentes tipos de eventos
          switch (payload.eventType) {
            case 'INSERT':
              this.handleNewActivity(payload.new as CalendarActivity);
              break;
            case 'UPDATE':
              this.handleUpdatedActivity(payload.new as CalendarActivity);
              break;
            case 'DELETE':
              this.handleDeletedActivity(payload.old as CalendarActivity);
              break;
          }
        }
      )
      .subscribe();
  }

  // Manejar nueva actividad
  private handleNewActivity(activity: CalendarActivity) {
    // La notificación ya se envía en createActivity, pero podemos agregar lógica adicional aquí
  }

  // Manejar actividad actualizada
  private handleUpdatedActivity(activity: CalendarActivity) {
    // La notificación ya se envía en updateActivity, pero podemos agregar lógica adicional aquí
  }

  // Manejar actividad eliminada
  private handleDeletedActivity(activity: CalendarActivity) {
    // La notificación ya se envía en deleteActivity, pero podemos agregar lógica adicional aquí
  }

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

    const activities = data?.map(item => ({
      ...item,
      member_name: item.family_members?.name,
      member_color: item.family_members?.color
    })) || [];

    // Actualizar el BehaviorSubject
    this.activitiesSubject.next(activities);

    return activities;
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

    // Enviar notificación en tiempo real
    if (data) {
      this.notificationService.sendCalendarEventNotification(data);
      // También enviar notificación push
      await this.calendarNotificationsService.sendCalendarEventPushNotification(data);

      // Enviar notificación push a todos los usuarios autorizados
      await this.pushNotificationService.sendPushNotificationToAllAuthorized({
        title: 'Nuevo Evento del Calendario',
        body: `${data.description} - ${data.date} a las ${data.time}`,
        icon: '/assets/icons/icon-192x192.jpg',
        tag: 'calendar-event',
        data: {
          type: 'calendar_event',
          activityId: data.id,
          date: data.date,
          time: data.time
        }
      });

      // Enviar notificación a usuarios invitados
      await this.guestNotificationService.sendGuestNotification({
        title: 'Nuevo Evento del Calendario',
        body: `${data.description} - ${data.date} a las ${data.time}`,
        notification_type: 'calendar_event',
        data: {
          activityId: data.id,
          date: data.date,
          time: data.time,
          description: data.description
        }
      });
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

    // Enviar notificación de actualización en tiempo real
    if (data) {
      this.notificationService.sendCalendarEventUpdateNotification(data);
      // También enviar notificación push
      await this.calendarNotificationsService.sendCalendarEventUpdatePushNotification(data);
    }

    return data;
  }

  // Eliminar actividad
  async deleteActivity(id: number): Promise<boolean> {
    // Obtener la actividad antes de eliminarla para la notificación
    const { data: activityToDelete } = await supabase
      .from('calendar_activities')
      .select('title')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('calendar_activities')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting activity:', error);
      return false;
    }

    // Enviar notificación de eliminación en tiempo real
    if (activityToDelete) {
      this.notificationService.sendCalendarEventDeleteNotification(activityToDelete.title);
      // También enviar notificación push
      await this.calendarNotificationsService.sendCalendarEventDeletePushNotification(activityToDelete.title);
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

  // Obtener próximas citas (hoy + 7 días, máximo 5)
  async getUpcomingActivities(): Promise<CalendarActivityWithMember[]> {
    // Obtener el ID del usuario actual
    const userId = await this.authService.getCurrentUserId();
    if (!userId) {
      console.error('No authenticated user found');
      return [];
    }

    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const startDate = today.toISOString().split('T')[0];
    const endDate = nextWeek.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('calendar_activities')
      .select(`
        *,
        family_members(name, color)
      `)
      .eq('user_id', userId) // Filtrar por usuario actual
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })
      .order('time', { ascending: true })
      .limit(5);

    if (error) {
      console.error('Error fetching upcoming activities:', error);
      return [];
    }

    return data?.map(item => ({
      ...item,
      member_name: item.family_members?.name,
      member_color: item.family_members?.color
    })) || [];
  }
}
