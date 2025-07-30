import { Injectable } from '@angular/core';
import * as webpush from 'web-push';
import { environment } from '../../environments/environments';

export type PushSubscriptionKeys = {
  p256dh: string;
  auth: string;
};

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {
  
  sendPushNotification(subscription: PushSubscription & { keys: PushSubscriptionKeys }, data: any) {
    // Configurar claves VAPID
    webpush.setVapidDetails(
      'mailto:hometasks@example.com',
      environment.vapidPublicKey,
      environment.vapidPrivateKey
    );

    try {
      const payload = JSON.stringify({
        title: data.title || 'Hometasks',
        body: data.body || 'Nueva notificación',
        icon: '/icons/icono angular/icon-192x192.png',
        badge: '/icons/icono angular/icon-72x72.png',
        data: data.data || {},
        tag: data.tag || 'default'
      });

      webpush.sendNotification(subscription, payload);
      console.log('Notificación push enviada exitosamente');
    } catch (error) {
      console.error('Error enviando notificación push:', error);
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
}
