import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environments';
import { AuthorizedUsersService } from './authorized-users.service';
import { PushNotificationService } from './push-notification.service';

export interface GuestNotification {
  id: number;
  email: string;
  name: string;
  notification_type: 'calendar_event' | 'task' | 'expense' | 'general';
  title: string;
  body: string;
  data?: any;
  is_read: boolean;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class GuestNotificationService {
  private supabase: SupabaseClient;

  constructor(
    private authorizedUsersService: AuthorizedUsersService,
    private pushNotificationService: PushNotificationService
  ) {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
  }

  /**
   * Envía notificación a usuarios invitados (no logueados)
   */
  async sendGuestNotification(data: {
    title: string;
    body: string;
    notification_type: 'calendar_event' | 'task' | 'expense' | 'general';
    data?: any;
  }) {
    try {
      // Obtener todos los usuarios autorizados
      const authorizedUsers = await this.authorizedUsersService.getAuthorizedUsers();
      
      console.log(`Enviando notificación a ${authorizedUsers.length} usuarios invitados`);

      // Para cada usuario autorizado, enviar notificación
      for (const user of authorizedUsers) {
        await this.sendNotificationToGuest(user.email, user.name, data);
      }
    } catch (error) {
      console.error('Error enviando notificación a invitados:', error);
    }
  }

  /**
   * Envía notificación a un usuario invitado específico
   */
  async sendNotificationToGuest(
    email: string, 
    name: string, 
    data: {
      title: string;
      body: string;
      notification_type: 'calendar_event' | 'task' | 'expense' | 'general';
      data?: any;
    }
  ) {
    try {
      // Verificar que el usuario esté autorizado
      const authorizedUser = await this.authorizedUsersService.isUserAuthorized(email);
      
      if (!authorizedUser) {
        console.log(`Usuario ${email} no autorizado para recibir notificaciones`);
        return;
      }

      // Verificar preferencias de notificación
      if (!authorizedUser.notification_preferences?.push) {
        console.log(`Usuario ${email} no tiene habilitadas las notificaciones push`);
        return;
      }

      // Enviar notificación push
      await this.pushNotificationService.sendPushNotificationToUserByEmail(email, {
        title: data.title,
        body: data.body,
        icon: '/assets/icons/icon-192x192.jpg',
        tag: `guest-${data.notification_type}`,
        data: {
          type: 'guest_notification',
          notification_type: data.notification_type,
          ...data.data
        }
      });

      // Guardar notificación en base de datos para historial
      await this.saveGuestNotification(email, name, data);

    } catch (error) {
      console.error(`Error enviando notificación a invitado ${email}:`, error);
    }
  }

  /**
   * Guarda la notificación en la base de datos
   */
  private async saveGuestNotification(
    email: string,
    name: string,
    data: {
      title: string;
      body: string;
      notification_type: 'calendar_event' | 'task' | 'expense' | 'general';
      data?: any;
    }
  ) {
    try {
      const { error } = await this.supabase
        .from('guest_notifications')
        .insert({
          email: email.toLowerCase(),
          name: name,
          notification_type: data.notification_type,
          title: data.title,
          body: data.body,
          data: data.data || {},
          is_read: false
        });

      if (error) {
        console.error('Error guardando notificación de invitado:', error);
      } else {
        console.log('Notificación de invitado guardada exitosamente');
      }
    } catch (error) {
      console.error('Excepción al guardar notificación de invitado:', error);
    }
  }

  /**
   * Obtiene las notificaciones de un usuario invitado
   */
  async getGuestNotifications(email: string): Promise<GuestNotification[]> {
    try {
      const { data, error } = await this.supabase
        .from('guest_notifications')
        .select('*')
        .eq('email', email.toLowerCase())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error obteniendo notificaciones de invitado:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Excepción al obtener notificaciones de invitado:', error);
      return [];
    }
  }

  /**
   * Marca una notificación como leída
   */
  async markNotificationAsRead(notificationId: number): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('guest_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marcando notificación como leída:', error);
        return false;
      }

      console.log('Notificación marcada como leída');
      return true;
    } catch (error) {
      console.error('Excepción al marcar notificación como leída:', error);
      return false;
    }
  }

  /**
   * Elimina notificaciones antiguas (más de 30 días)
   */
  async cleanupOldNotifications(): Promise<number> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await this.supabase
        .from('guest_notifications')
        .delete()
        .lt('created_at', thirtyDaysAgo.toISOString())
        .select('id');

      if (error) {
        console.error('Error limpiando notificaciones antiguas:', error);
        return 0;
      }

      const deletedCount = data?.length || 0;
      console.log(`${deletedCount} notificaciones antiguas eliminadas`);
      return deletedCount;
    } catch (error) {
      console.error('Excepción al limpiar notificaciones antiguas:', error);
      return 0;
    }
  }

  /**
   * Obtiene estadísticas de notificaciones
   */
  async getNotificationStats(email: string): Promise<{
    total: number;
    unread: number;
    by_type: Record<string, number>;
  }> {
    try {
      const notifications = await this.getGuestNotifications(email);
      
      const stats = {
        total: notifications.length,
        unread: notifications.filter(n => !n.is_read).length,
        by_type: {} as Record<string, number>
      };

      // Contar por tipo
      notifications.forEach(notification => {
        const type = notification.notification_type;
        stats.by_type[type] = (stats.by_type[type] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Error obteniendo estadísticas de notificaciones:', error);
      return {
        total: 0,
        unread: 0,
        by_type: {}
      };
    }
  }
} 