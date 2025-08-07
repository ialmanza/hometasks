import { Injectable } from '@angular/core';
import { environment } from '../../environments/environments';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AuthorizedUsersService } from './authorized-users.service';

export type PushSubscriptionKeys = {
  p256dh: string;
  auth: string;
};

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {
  private supabase: SupabaseClient;

  constructor(private authorizedUsersService: AuthorizedUsersService) {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
  }
  
  /**
   * Envía notificación push real usando Supabase Edge Function
   */
  async sendPushNotification(subscription: PushSubscription & { keys: PushSubscriptionKeys }, data: any) {
    try {
      console.log('Enviando notificación push real...');
      
      // Crear el payload de la notificación
      const payload = JSON.stringify({
        title: data.title || 'Hometasks',
        body: data.body || 'Nueva notificación',
        icon: data.icon || '/icons/icono angular/icon-192x192.png',
        badge: data.badge || '/icons/icono angular/icon-72x72.png',
        data: data.data || {},
        tag: data.tag || 'default'
      });

      // Para desarrollo local, usar notificación local del navegador
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('🔄 Modo desarrollo: usando notificación local del navegador');
        
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(data.title || 'Hometasks', {
            body: data.body || 'Nueva notificación',
            icon: data.icon || '/icons/icono angular/icon-192x192.png',
            badge: data.badge || '/icons/icono angular/icon-72x72.png',
            data: data.data || {},
            tag: data.tag || 'default'
          });
          console.log('✅ Notificación local enviada en desarrollo');
        } else {
          console.log('⚠️ Permisos de notificación no concedidos en desarrollo');
        }
        return;
      }

      // Para producción, usar Supabase Edge Function
      console.log('🔄 Modo producción: usando Supabase Edge Function');
      
      const response = await fetch(`${environment.supabaseUrl}/functions/v1/send-push-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${environment.supabaseKey}`,
        },
        body: JSON.stringify({
          subscription: {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.keys.p256dh,
              auth: subscription.keys.auth
            }
          },
          payload: payload
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Notificación push enviada exitosamente:', result);
      } else {
        console.error('❌ Error enviando notificación push:', response.status, response.statusText);
        
        // Fallback: usar notificación local si falla la Edge Function
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(data.title || 'Hometasks', {
            body: data.body || 'Nueva notificación',
            icon: data.icon || '/icons/icono angular/icon-192x192.png',
            badge: data.badge || '/icons/icono angular/icon-72x72.png',
            data: data.data || {},
            tag: data.tag || 'default'
          });
          console.log('✅ Notificación local enviada como fallback');
        }
      }
      
    } catch (error) {
      console.error('❌ Error en envío de notificación push:', error);
      
      // Fallback: usar notificación local en caso de error
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(data.title || 'Hometasks', {
          body: data.body || 'Nueva notificación',
          icon: data.icon || '/icons/icono angular/icon-192x192.png',
          badge: data.badge || '/icons/icono angular/icon-72x72.png',
          data: data.data || {},
          tag: data.tag || 'default'
        });
        console.log('✅ Notificación local enviada como fallback');
      }
    }
  }

  // Método para enviar notificación a múltiples suscripciones
  async sendPushNotificationToUser(userId: string, data: any) {
    try {
      // Aquí implementarías la lógica para obtener las suscripciones del usuario
      // desde Supabase y enviar a todas
      console.log('Enviando notificación push al usuario:', userId);
    } catch (error) {
      console.error('Error enviando notificación push al usuario:', error);
    }
  }

  /**
   * Envía notificación push a todos los usuarios autorizados
   */
  async sendPushNotificationToAllAuthorized(data: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: any;
  }) {
    try {
      // Obtener todos los usuarios autorizados
      const authorizedUsers = await this.authorizedUsersService.getAuthorizedUsers();
      
      console.log(`Enviando notificación a ${authorizedUsers.length} usuarios autorizados`);

      // Para cada usuario autorizado, obtener sus suscripciones y enviar
      for (const user of authorizedUsers) {
        if (user.notification_preferences?.push) {
          await this.sendPushNotificationToUserByEmail(user.email, data);
        }
      }
    } catch (error) {
      console.error('Error enviando notificación a usuarios autorizados:', error);
    }
  }

  /**
   * Envía notificación push a un usuario específico por email
   */
  async sendPushNotificationToUserByEmail(email: string, data: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: any;
  }) {
    try {
      // Verificar que el usuario esté autorizado
      const authorizedUser = await this.authorizedUsersService.isUserAuthorized(email);
      
      if (!authorizedUser || !authorizedUser.notification_preferences?.push) {
        console.log(`Usuario ${email} no autorizado o no tiene push habilitado`);
        return;
      }

      // Obtener el UUID del usuario autenticado (no el ID numérico de authorized_users)
      const { data: { user } } = await this.supabase.auth.getUser();
      
      if (!user?.id) {
        console.log('Usuario no autenticado');
        return;
      }

      // Obtener suscripciones del usuario usando el UUID correcto
      const { data: subscriptions, error } = await this.supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', user.id); // Usar el UUID de auth.users

      if (error) {
        console.error('Error obteniendo suscripciones:', error);
        return;
      }

      if (!subscriptions || subscriptions.length === 0) {
        console.log(`No hay suscripciones para ${email}`);
        return;
      }

      // Enviar notificación a todas las suscripciones del usuario
      for (const subscription of subscriptions) {
        try {
          const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.keys.p256dh,
              auth: subscription.keys.auth
            }
          } as PushSubscription & { keys: PushSubscriptionKeys };

          await this.sendPushNotification(pushSubscription, data);
        } catch (error) {
          console.error(`Error enviando notificación a suscripción ${subscription.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error enviando notificación por email:', error);
    }
  }
}
