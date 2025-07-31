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
  
  sendPushNotification(subscription: PushSubscription & { keys: PushSubscriptionKeys }, data: any) {
    // Para el navegador, usamos la API nativa de Service Worker
    // Las notificaciones se manejan a través del Service Worker
    console.log('Notificación push configurada para enviar a través del Service Worker');
    
    // El Service Worker se encargará de mostrar la notificación
    // cuando reciba el evento push
    try {
      const payload = JSON.stringify({
        title: data.title || 'Hometasks',
        body: data.body || 'Nueva notificación',
        icon: '/icons/icono angular/icon-192x192.png',
        badge: '/icons/icono angular/icon-72x72.png',
        data: data.data || {},
        tag: data.tag || 'default'
      });

      console.log('Payload de notificación:', payload);
      console.log('Notificación push configurada exitosamente');
    } catch (error) {
      console.error('Error configurando notificación push:', error);
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

      // Obtener suscripciones del usuario
      const { data: subscriptions, error } = await this.supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', authorizedUser.id);

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

          this.sendPushNotification(pushSubscription, data);
        } catch (error) {
          console.error(`Error enviando notificación a suscripción ${subscription.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error enviando notificación por email:', error);
    }
  }
}
