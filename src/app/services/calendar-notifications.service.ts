import { Injectable } from '@angular/core';
import { supabase } from './Supabase-Client/supabase-client';
import { AuthService } from './auth.service';
import { CalendarActivity } from '../models/calendar-activity';

@Injectable({
  providedIn: 'root'
})
export class CalendarNotificationsService {

  constructor(private authService: AuthService) {}

  // Enviar notificación push para nuevo evento del calendario
  async sendCalendarEventPushNotification(eventData: CalendarActivity): Promise<void> {
    try {
      const userId = await this.authService.getCurrentUserId();
      if (!userId) {
        console.error('No authenticated user found');
        return;
      }

      // Obtener todas las suscripciones push del usuario
      const { data: subscriptions, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching push subscriptions:', error);
        return;
      }

      if (!subscriptions || subscriptions.length === 0) {
        console.log('No push subscriptions found for user');
        return;
      }

      // Enviar notificación a todas las suscripciones del usuario
      for (const subscription of subscriptions) {
        await this.sendPushNotification(subscription, {
          title: 'Nuevo Evento del Calendario',
          body: `${eventData.title} - ${eventData.date} ${eventData.time ? `a las ${eventData.time}` : ''}`,
          icon: '/assets/icons/icon-192x192.jpg',
          tag: 'calendar-event',
          data: {
            type: 'calendar_event',
            eventId: eventData.id,
            eventTitle: eventData.title,
            eventDate: eventData.date,
            eventTime: eventData.time
          }
        });
      }
    } catch (error) {
      console.error('Error sending calendar push notification:', error);
    }
  }

  // Enviar notificación push para evento actualizado
  async sendCalendarEventUpdatePushNotification(eventData: CalendarActivity): Promise<void> {
    try {
      const userId = await this.authService.getCurrentUserId();
      if (!userId) {
        console.error('No authenticated user found');
        return;
      }

      const { data: subscriptions, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching push subscriptions:', error);
        return;
      }

      if (!subscriptions || subscriptions.length === 0) {
        console.log('No push subscriptions found for user');
        return;
      }

      for (const subscription of subscriptions) {
        await this.sendPushNotification(subscription, {
          title: 'Evento Actualizado',
          body: `${eventData.title} ha sido actualizado`,
          icon: '/assets/icons/icon-192x192.jpg',
          tag: 'calendar-update',
          data: {
            type: 'calendar_update',
            eventId: eventData.id,
            eventTitle: eventData.title
          }
        });
      }
    } catch (error) {
      console.error('Error sending calendar update push notification:', error);
    }
  }

  // Enviar notificación push para evento eliminado
  async sendCalendarEventDeletePushNotification(eventTitle: string): Promise<void> {
    try {
      const userId = await this.authService.getCurrentUserId();
      if (!userId) {
        console.error('No authenticated user found');
        return;
      }

      const { data: subscriptions, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching push subscriptions:', error);
        return;
      }

      if (!subscriptions || subscriptions.length === 0) {
        console.log('No push subscriptions found for user');
        return;
      }

      for (const subscription of subscriptions) {
        await this.sendPushNotification(subscription, {
          title: 'Evento Eliminado',
          body: `${eventTitle} ha sido eliminado del calendario`,
          icon: '/assets/icons/icon-192x192.jpg',
          tag: 'calendar-delete',
          data: {
            type: 'calendar_delete',
            eventTitle: eventTitle
          }
        });
      }
    } catch (error) {
      console.error('Error sending calendar delete push notification:', error);
    }
  }

  // Método privado para enviar notificación push
  private async sendPushNotification(subscription: any, notificationData: any): Promise<void> {
    try {
      // Aquí usarías webpush para enviar la notificación
      // Por ahora, solo registramos la intención
      console.log('Enviando notificación push:', notificationData);
      
      // En una implementación real, usarías:
      // import webpush from 'web-push';
      // webpush.sendNotification(subscription, JSON.stringify(notificationData));
      
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }
} 