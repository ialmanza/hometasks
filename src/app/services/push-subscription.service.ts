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
        // Intentar registrar nuestro Service Worker personalizado primero
        this.swRegistration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker personalizado registrado exitosamente');
        
        // Esperar a que el service worker esté listo
        await navigator.serviceWorker.ready;
        console.log('Service Worker listo');
        
        await this.checkAndSubscribe();
      } catch (error) {
        console.error('Error registrando Service Worker personalizado:', error);
        
        // Fallback: intentar con el Service Worker de Angular
        try {
          this.swRegistration = await navigator.serviceWorker.register('/ngsw-worker.js');
          console.log('Service Worker de Angular registrado exitosamente');
          
          await navigator.serviceWorker.ready;
          console.log('Service Worker de Angular listo');
          
          await this.checkAndSubscribe();
        } catch (angularError) {
          console.error('Error registrando Service Worker de Angular:', angularError);
        }
      }
    } else {
      console.warn('Service Worker no soportado en este navegador');
    }
  }

  private async subscribeUser() {
    if (!this.swRegistration) {
      console.error('Service Worker no registrado');
      return;
    }

    try {
      // Verificar si ya existe una suscripción
      const existingSubscription = await this.swRegistration.pushManager.getSubscription();

      if (existingSubscription) {
        console.log('Suscripción existente encontrada');
        await this.savePushSubscriptionToSupabase(existingSubscription);
        return;
      }

      console.log('Creando nueva suscripción push...');
      
      // Crear nueva suscripción
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(environment.vapidPublicKey)
      });

      console.log('Nueva suscripción creada:', subscription);
      
      // Guardar suscripción en Supabase
      await this.savePushSubscriptionToSupabase(subscription);
    } catch (error) {
      console.error('Error en suscripción push:', error);
      
      // Si el error es por permisos, mostrar mensaje más claro
      if (error instanceof Error && error.name === 'NotAllowedError') {
        console.warn('Permisos de notificación denegados por el usuario');
      }
    }
  }

  private async savePushSubscriptionToSupabase(subscription: PushSubscription) {
    try {
      const { endpoint, expirationTime } = subscription;
      
      // Obtener las claves de la suscripción
      const p256dh = subscription.getKey('p256dh');
      const auth = subscription.getKey('auth');
      
      if (!p256dh || !auth) {
        console.error('Claves de suscripción no disponibles');
        return;
      }

      // Obtener el usuario actual de Supabase
      const { data: { user } } = await this.supabase.auth.getUser();

      // Convertir las claves a base64
      const p256dhBase64 = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(p256dh))));
      const authBase64 = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(auth))));

      // Insertar suscripción
      const { data, error } = await this.supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user?.id,
          endpoint: endpoint,
          keys: {
            p256dh: p256dhBase64,
            auth: authBase64
          },
          expiration_time: expirationTime
            ? new Date(expirationTime).toISOString()
            : null
        }, {
          onConflict: 'endpoint'
        });

      if (error) {
        console.error('Error guardando suscripción:', error);
      } else {
        console.log('Suscripción push guardada exitosamente');
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
