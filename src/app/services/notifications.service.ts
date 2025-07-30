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

  // Programar notificación para actividad (versión simplificada sin persistencia)
  async scheduleActivityNotification(notification: {
    id: number;
    day_of_week: string;
    title: string;
    description: string;
    time: string;
  }): Promise<void> {
    console.log('Programando notificación local para actividad:', notification);
    
    // Aquí podrías implementar lógica para programar notificaciones locales
    // usando la API de Notifications del navegador
    if ('Notification' in window && Notification.permission === 'granted') {
      // Calcular cuándo mostrar la notificación basado en el día y hora
      const nextNotificationTime = this.calculateNextNotificationTime(notification.day_of_week, notification.time);
      
      if (nextNotificationTime) {
        const timeUntilNotification = nextNotificationTime.getTime() - Date.now();
        
        if (timeUntilNotification > 0) {
          setTimeout(() => {
            this.showActivityNotification(notification);
          }, timeUntilNotification);
          
          console.log(`Notificación programada para ${notification.title} en ${Math.round(timeUntilNotification / 1000 / 60)} minutos`);
        }
      }
    }
  }

  // Cancelar notificación programada (versión simplificada)
  async cancelScheduledNotification(activityId: number): Promise<void> {
    console.log('Cancelando notificación para actividad:', activityId);
    // En una implementación más avanzada, aquí cancelarías los timeouts programados
  }

  // Calcular la próxima hora de notificación
  private calculateNextNotificationTime(dayOfWeek: string, time: string): Date | null {
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetDayIndex = daysOfWeek.indexOf(dayOfWeek);
    
    if (targetDayIndex === -1) return null;
    
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    const targetTime = new Date();
    targetTime.setHours(hours, minutes, 0, 0);
    
    // Calcular días hasta el próximo día objetivo
    const daysUntilTarget = (targetDayIndex - now.getDay() + 7) % 7;
    targetTime.setDate(now.getDate() + daysUntilTarget);
    
    // Si ya pasó la hora hoy, programar para la próxima semana
    if (targetTime <= now) {
      targetTime.setDate(targetTime.getDate() + 7);
    }
    
    return targetTime;
  }

  // Mostrar notificación de actividad
  private showActivityNotification(notification: {
    id: number;
    day_of_week: string;
    title: string;
    description: string;
    time: string;
  }): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notificationObj = new Notification('Actividad Programada', {
        body: `${notification.title} - ${notification.description || 'Sin descripción'}`,
        icon: '/assets/icons/icon-192x192.jpg',
        tag: `activity-${notification.id}`,
        requireInteraction: false
      });

      this.playNotificationSound();

      // Auto-cerrar después de 10 segundos
      setTimeout(() => {
        notificationObj.close();
      }, 10000);
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

  // Verificar el estado de las notificaciones programadas (versión simplificada)
  async checkScheduledNotifications(): Promise<void> {
    console.log('Verificando notificaciones programadas...');
    // En esta versión simplificada, las notificaciones se manejan localmente
    // No necesitamos verificar en la base de datos
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
