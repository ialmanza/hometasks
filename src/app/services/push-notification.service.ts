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
   * Verifica si el dispositivo está online
   */
  private isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * Verifica conectividad con un timeout corto
   */
  private async checkConnectivity(timeout: number = 2000): Promise<boolean> {
    if (!this.isOnline()) {
      return false;
    }

    try {
      // Intentar hacer una petición HEAD rápida a un recurso pequeño
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(`${environment.supabaseUrl}/rest/v1/`, {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache'
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      // Si hay error de red, timeout, o abort, asumir offline
      return false;
    }
  }

  /**
   * Muestra una notificación local usando el Service Worker o la API de Notification
   */
  private async showLocalNotification(data: any): Promise<void> {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      console.log('⚠️ Permisos de notificación no concedidos');
      return;
    }

    try {
      // Intentar usar Service Worker primero (mejor para PWA)
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (registration) {
          // Usar tipo extendido para incluir propiedades del Service Worker
          const notificationOptions: NotificationOptions & { renotify?: boolean; vibrate?: number[] } = {
            body: data.body || 'Nueva notificación',
            icon: data.icon || '/icons/icono angular/icon-192x192.png',
            badge: data.badge || '/icons/icono angular/icon-72x72.png',
            data: data.data || {},
            tag: data.tag || 'default',
            requireInteraction: false,
            renotify: true,
            vibrate: [200, 100, 200]
          };
          
          await registration.showNotification(data.title || 'Hometasks', notificationOptions);
          console.log('✅ Notificación local enviada vía Service Worker');
          return;
        }
      }
    } catch (error) {
      console.warn('Error usando Service Worker para notificación, usando API directa:', error);
    }

    // Fallback: usar API de Notification directamente
    try {
      new Notification(data.title || 'Hometasks', {
        body: data.body || 'Nueva notificación',
        icon: data.icon || '/icons/icono angular/icon-192x192.png',
        badge: data.badge || '/icons/icono angular/icon-72x72.png',
        data: data.data || {},
        tag: data.tag || 'default'
      });
      console.log('✅ Notificación local enviada vía API de Notification');
    } catch (error) {
      console.error('❌ Error mostrando notificación local:', error);
    }
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
        await this.showLocalNotification(data);
        return;
      }

      // Verificar si está offline antes de intentar llamar a la Edge Function
      const isConnected = await this.checkConnectivity();
      if (!isConnected) {
        console.log('📴 Modo offline: usando notificación local');
        await this.showLocalNotification(data);
        return;
      }

      // Para producción, usar Supabase Edge Function
      console.log('🔄 Modo producción: usando Supabase Edge Function');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout
      
      try {
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
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const result = await response.json();
          console.log('✅ Notificación push enviada exitosamente:', result);
        } else {
          console.error('❌ Error enviando notificación push:', response.status, response.statusText);
          
          // Fallback: usar notificación local si falla la Edge Function
          await this.showLocalNotification(data);
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        // Detectar errores de red, timeout, o CORS
        const isNetworkError = 
          fetchError.name === 'AbortError' || // Timeout
          fetchError.name === 'TypeError' || // Network error
          fetchError.message?.includes('Failed to fetch') ||
          fetchError.message?.includes('NetworkError') ||
          fetchError.message?.includes('CORS');
        
        if (isNetworkError) {
          console.log('📴 Error de red detectado, usando notificación local');
          await this.showLocalNotification(data);
        } else {
          throw fetchError; // Re-lanzar otros errores
        }
      }
      
    } catch (error) {
      console.error('❌ Error en envío de notificación push:', error);
      
      // Fallback: usar notificación local en caso de cualquier error
      await this.showLocalNotification(data);
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
