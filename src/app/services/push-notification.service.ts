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
      'mailto:your-email@example.com',
      environment.vapidPublicKey,
      environment.vapidPrivateKey
    );

    try {
      webpush.sendNotification(subscription, JSON.stringify(data));
    } catch (error) {
      console.error('Error enviando notificación:', error);
    }
  }
}
