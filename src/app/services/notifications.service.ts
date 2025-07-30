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

  // Enviar notificación de evento del calendario en tiempo real
  sendCalendarEventNotification(eventData: any): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('Nuevo Evento del Calendario', {
        body: `${eventData.title} - ${eventData.date} ${eventData.time ? `a las ${eventData.time}` : ''}`,
        icon: '/assets/icons/icon-192x192.jpg',
        tag: 'calendar-event',
        requireInteraction: false
      });

      // Reproducir sonido de notificación
      this.playNotificationSound();

      // Auto-cerrar la notificación después de 5 segundos
      setTimeout(() => {
        notification.close();
      }, 5000);
    }
  }

  // Enviar notificación de actualización de evento
  sendCalendarEventUpdateNotification(eventData: any): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('Evento Actualizado', {
        body: `${eventData.title} ha sido actualizado`,
        icon: '/assets/icons/icon-192x192.jpg',
        tag: 'calendar-update',
        requireInteraction: false
      });

      this.playNotificationSound();

      setTimeout(() => {
        notification.close();
      }, 5000);
    }
  }

  // Enviar notificación de eliminación de evento
  sendCalendarEventDeleteNotification(eventTitle: string): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('Evento Eliminado', {
        body: `${eventTitle} ha sido eliminado del calendario`,
        icon: '/assets/icons/icon-192x192.jpg',
        tag: 'calendar-delete',
        requireInteraction: false
      });

      this.playNotificationSound();

      setTimeout(() => {
        notification.close();
      }, 5000);
    }
  }

  // Reproducir sonido de notificación
  private playNotificationSound(): void {
    try {
      const audio = new Audio('/level-up-191997.mp3');
      audio.volume = 0.5;
      audio.play().catch(error => {
        console.log('No se pudo reproducir el sonido:', error);
      });
    } catch (error) {
      console.log('Error reproduciendo sonido:', error);
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
