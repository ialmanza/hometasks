import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environments';
import { Task } from './tasks.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private supabase: SupabaseClient;
  private tasksChannel: any;
  private swRegistration: ServiceWorkerRegistration | null = null;

  constructor() {
    // Inicializar Supabase con tus credenciales
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );

    this.initServiceWorker();
    this.setupTaskNotificationListener();
  }

  private async initServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        this.swRegistration = await navigator.serviceWorker.register('/ngsw-worker.js');
        console.log('Service Worker registrado exitosamente');
      } catch (error) {
        console.error('Error registrando Service Worker:', error);
      }
    }
  }

  // Método para enviar notificación de nueva tarea
  async sendTaskNotification(task: Task) {
    try {
      const { error } = await this.supabase
        .from('task_notifications')
        .insert({
          title: task.title,
          description: task.description,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error enviando notificación:', error);
      }
      // Enviar notificación push
      await this.sendPushNotification(task);
    } catch (err) {
      console.error('Excepción al enviar notificación:', err);
    }
  }

  private async sendPushNotification(task: Task) {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const subscription = await this.getSubscription();
        if (subscription) {
          await fetch('/api/send-push-notification', {
            method: 'POST',
            body: JSON.stringify({
              subscription,
              data: {
                title: 'Nueva Tarea',
                body: `Se ha creado la tarea: ${task.title}`,
                icon: '/sin_fondo.png'
              }
            }),
            headers: {
              'Content-Type': 'application/json'
            }
          });
        }
      } catch (error) {
        console.error('Error enviando notificación push:', error);
      }
    }
  }

  async getSubscription(): Promise<PushSubscription | null> {
    if (this.swRegistration) {
      const subscription = await this.swRegistration.pushManager.getSubscription();

      if (subscription) return subscription;

      // Si no hay suscripción, solicitar una nueva
      return await this.subscribeUser();
    }
    return null;
  }

  private async subscribeUser(): Promise<PushSubscription | null> {
    if (this.swRegistration) {
      try {
        const subscription = await this.swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(environment.vapidPublicKey)
        });

        // Aquí podrías guardar la suscripción en tu backend
        await this.saveSubscription(subscription);

        return subscription;
      } catch (error) {
        console.error('Error suscribiendo usuario:', error);
        return null;
      }
    }
    return null;
  }

  async saveSubscription(subscription: PushSubscription) {
    // Implementa el guardado de la suscripción en tu backend
    // Podrías usar Supabase o tu propio endpoint
    try {
      const response = await fetch('/api/save-subscription', {
        method: 'POST',
        body: JSON.stringify(subscription),
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Error guardando suscripción:', error);
    }
  }

  // Método para convertir la clave VAPID
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

  // Configurar listener de tiempo real para nuevas tareas
  private setupTaskNotificationListener() {
    try {
      // Configurar canal de tiempo real para notificaciones
      this.tasksChannel = this.supabase
        .channel('task_notifications')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'task_notifications' },
          (payload) => {
            // Reproducir sonido de notificación
            this.playNotificationSound();

            // Mostrar notificación del sistema
            this.showSystemNotification(payload.new);
          }
        )
        .subscribe();
    } catch (error) {
      console.error('Error configurando listener:', error);
    }
  }

  // Reproducir sonido de notificación
  private playNotificationSound() {
    try {
      const audio = new Audio('level-up-191997.mp3');
      audio.play().catch(error => console.warn('Error reproduciendo sonido:', error));
    } catch (err) {
      console.error('Error con sonido de notificación:', err);
    }
  }

  // Mostrar notificación del sistema
  private showSystemNotification(task: any) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Nueva Tarea', {
        body: `Se ha creado la tarea: ${task.title}`,
        icon: 'sin_fondo.png'
      });
    }
  }

  // Solicitar permiso de notificaciones del sistema
  requestNotificationPermission() {
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          console.log('Notificaciones del sistema habilitadas');
        }
      });
    }
  }

  // Método para limpiar suscripciones
  cleanup() {
    if (this.tasksChannel) {
      this.supabase.removeChannel(this.tasksChannel);
    }
  }
}
