import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environments';

@Injectable({
  providedIn: 'root'
})
export class PushSubscriptionService {
  private supabase: SupabaseClient;
  private swRegistration: ServiceWorkerRegistration | null = null;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
    this.initServiceWorker();
  }

  private async initServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        this.swRegistration = await navigator.serviceWorker.register('/ngsw-worker.js');
        await this.checkAndSubscribe();
      } catch (error) {
        console.error('Error registrando Service Worker:', error);
      }
    }
  }

//  async checkAndSubscribe() {
//     // Verifica si las notificaciones están soportadas
//     if (!('PushManager' in window)) {
//       console.warn('Push no soportado');
//       return;
//     }

//     // Solicitar permiso
//     const permission = await Notification.requestPermission();
//     if (permission !== 'granted') {
//       console.warn('Permiso de notificación denegado');
//       return;
//     }

//     // Obtener o crear suscripción
//     await this.subscribeUser();
//   }

  private async subscribeUser() {
    if (!this.swRegistration) return;

    try {
      // Verificar si ya existe una suscripción
      const existingSubscription = await this.swRegistration.pushManager.getSubscription();

      if (existingSubscription) {
        // Guardar suscripción existente
        await this.savePushSubscriptionToSupabase(existingSubscription);
        return;
      }

      // Crear nueva suscripción
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(environment.vapidPublicKey)
      });

      // Guardar suscripción en Supabase
      await this.savePushSubscriptionToSupabase(subscription);
    } catch (error) {
      console.error('Error en suscripción push:', error);
    }
  }

  private async savePushSubscriptionToSupabase(subscription: PushSubscription) {
    try {
      // Extraer información de la suscripción
      //const { endpoint, keys, expirationTime } = subscription; ESTABA ASÍ ANTES
      const { endpoint, expirationTime } = subscription;
      const keys = subscription.getKey('p256dh') && subscription.getKey('auth');
      //const { p256dh, auth } = subscription.getKey('p256dh') && subscription.getKey('auth'); PROBAR DESPUÉS

      // Obtener el usuario actual de Supabase (si está autenticado)
      const { data: { user } } = await this.supabase.auth.getUser();

      // Insertar suscripción
      const { data, error } = await this.supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user?.id, // Opcional, depende de si el usuario está autenticado
          endpoint: endpoint,
          keys: {
            //p256dh: keys.p256dh,
            //auth: keys.auth
            p256dh: subscription.getKey('p256dh'),
            auth: subscription.getKey('auth')
          },
          expiration_time: expirationTime
            ? new Date(expirationTime).toISOString()
            : null
        }, {
          // Upsert basado en el endpoint para evitar duplicados
          onConflict: 'endpoint'
        });

      if (error) {
        console.error('Error guardando suscripción:', error);
      }
    } catch (error) {
      console.error('Excepción al guardar suscripción:', error);
    }
  }

  // Método para convertir clave VAPID
  private urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Método para recuperar suscripciones (opcional)
  async getPushSubscriptions() {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();

      if (!user) return [];

      const { data, error } = await this.supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error recuperando suscripciones:', error);
        return [];
      }

      return data;
    } catch (error) {
      console.error('Excepción al recuperar suscripciones:', error);
      return [];
    }
  }

  async checkAndSubscribe() {
    // Verifica si las notificaciones están soportadas
    if (!('PushManager' in window)) {
      console.warn('Push no soportado');
      return;
    }

    // Solicitar permiso
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Permiso de notificación denegado');
      return;
    }

    // Obtener o crear suscripción
    await this.subscribeUser();
  }
}
