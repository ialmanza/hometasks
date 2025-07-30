import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Observable, from, map } from 'rxjs';
import { environment } from '../../environments/environments';
import { AuthService } from './auth.service';
import { supabase } from './Supabase-Client/supabase-client';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  constructor(private authService: AuthService) {}

  // Programar notificación para actividad
  async scheduleActivityNotification(notification: {
    id: number;
    day_of_week: string;
    title: string;
    description: string;
    time: string;
  }): Promise<void> {
    const userId = await this.authService.getCurrentUserId();
    if (!userId) {
      console.error('No authenticated user found');
      return;
    }

    const { error } = await supabase
      .from('activity_notifications')
      .insert({
        user_id: userId,
        activity_id: notification.id,
        day_of_week: notification.day_of_week,
        title: notification.title,
        description: notification.description,
        time: notification.time
      });

    if (error) {
      console.error('Error scheduling notification:', error);
    }
  }

  // Cancelar notificación programada
  async cancelScheduledNotification(activityId: number): Promise<void> {
    const { error } = await supabase
      .from('activity_notifications')
      .delete()
      .eq('activity_id', activityId);

    if (error) {
      console.error('Error canceling notification:', error);
    }
  }

  // Limpiar recursos
  cleanup(): void {
    // Implementar limpieza si es necesario
  }

  // Solicitar permiso de notificaciones
  requestNotificationPermission(): void {
    if ('Notification' in window) {
      Notification.requestPermission();
    }
  }

  // Enviar notificación de tarea
  sendTaskNotification(taskData: any): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Nueva Tarea', {
        body: taskData.title,
        icon: '/assets/icons/icon-192x192.jpg'
      });
    }
  }
}
