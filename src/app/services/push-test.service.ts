import { Injectable } from '@angular/core';
import { PushSubscriptionService } from './push-subscription.service';
import { PushNotificationService } from './push-notification.service';

@Injectable({
  providedIn: 'root'
})
export class PushTestService {

  constructor(
    private pushSubscriptionService: PushSubscriptionService,
    private pushNotificationService: PushNotificationService
  ) {}

  // Método para probar notificación local
  testLocalNotification() {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('Prueba de Notificación', {
        body: 'Esta es una notificación de prueba local',
        icon: '/icons/icono angular/icon-192x192.png',
        badge: '/icons/icono angular/icon-72x72.png',
        tag: 'test-notification',
        requireInteraction: false
      });

      // Auto-cerrar después de 5 segundos
      setTimeout(() => {
        notification.close();
      }, 5000);

      console.log('Notificación local enviada');
    } else {
      console.warn('Permisos de notificación no concedidos');
    }
  }

  // Método para probar notificación push
  async testPushNotification() {
    try {
      // Obtener suscripciones del usuario
      const subscriptions = await this.pushSubscriptionService.getPushSubscriptions();
      
      if (subscriptions && subscriptions.length > 0) {
        const subscription = subscriptions[0];
        
        // Enviar notificación de prueba
        this.pushNotificationService.sendPushNotification(subscription, {
          title: 'Prueba de Notificación Push',
          body: 'Esta es una notificación push de prueba',
          tag: 'test-push',
          data: {
            url: '/',
            timestamp: new Date().toISOString()
          }
        });

        console.log('Notificación push enviada');
      } else {
        console.warn('No hay suscripciones push disponibles');
      }
    } catch (error) {
      console.error('Error enviando notificación push de prueba:', error);
    }
  }

  // Método para solicitar permisos de notificación
  async requestNotificationPermission(): Promise<boolean> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      console.log('Permiso de notificación:', permission);
      return permission === 'granted';
    }
    return false;
  }

  // Método para verificar el estado de las notificaciones
  checkNotificationStatus() {
    if ('Notification' in window) {
      console.log('Estado de notificaciones:', {
        permission: Notification.permission,
        supported: 'Notification' in window,
        serviceWorker: 'serviceWorker' in navigator,
        pushManager: 'PushManager' in window
      });
    } else {
      console.warn('Notificaciones no soportadas en este navegador');
    }
  }
} 