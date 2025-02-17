import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environments';
import { Task, TasksService } from './tasks.service';
import { DailyActivity } from '../models/daily_activity';

interface NotificationOptions {
  body: string;
  icon: string;
  badge: string;
  tag: string;
  renotify?: boolean;
}
@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private supabase: SupabaseClient;
  private tasksChannel: any;
  private swRegistration: ServiceWorkerRegistration | null = null;
  private scheduledNotifications: Map<number, NodeJS.Timeout> = new Map();
  private serviceWorkerReady: boolean = false;

  constructor(private todoService: TasksService) {
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
        await navigator.serviceWorker.ready;
        this.serviceWorkerReady = true;

        // Solicitar permisos inmediatamente después de que el SW esté listo
        await this.requestNotificationPermission();
        console.log('Service Worker y permisos inicializados correctamente');
      } catch (error) {
        console.error('Error registrando Service Worker:', error);
      }
    }
  }

  async scheduleActivityNotification(activity: DailyActivity) {
    if (!this.serviceWorkerReady) {
      console.log('Esperando a que el Service Worker esté listo...');
      await this.waitForServiceWorker();
    }

    if (!activity.id || !activity.time || !activity.day_of_week) {
      console.warn('Actividad inválida para programar notificación:', activity);
      return;
    }

    // Cancelar notificación existente si hay una
    this.cancelScheduledNotification(activity.id);

    const notificationTime = this.calculateNextNotificationTime(activity.day_of_week, activity.time);
    if (!notificationTime) {
      console.warn('No se pudo calcular el tiempo de notificación para:', activity);
      return;
    }

    const timeUntilNotification = notificationTime.getTime() - new Date().getTime();
    if (timeUntilNotification <= 0) {
      console.warn('Tiempo de notificación ya pasó para:', activity);
      return;
    }

    console.log(`Programando notificación para ${activity.title}:`);
    console.log(`Fecha programada: ${notificationTime.toLocaleString()}`);
    console.log(`Tiempo de espera: ${timeUntilNotification}ms`);

    const timerId = setTimeout(() => {
      this.sendActivityNotification(activity);
    }, timeUntilNotification);

    this.scheduledNotifications.set(activity.id, timerId);
  }

  private async waitForServiceWorker(timeout = 5000): Promise<void> {
    const startTime = Date.now();
    while (!this.serviceWorkerReady && Date.now() - startTime < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (!this.serviceWorkerReady) {
      throw new Error('Service Worker no se inicializó a tiempo');
    }
  }

  private calculateNextNotificationTime(dayOfWeek: string, time: string): Date | null {
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);

    if (isNaN(hours) || isNaN(minutes)) return null;

    const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetDayIndex = weekDays.indexOf(dayOfWeek);

    if (targetDayIndex === -1) return null;

    const targetDate = new Date();
    targetDate.setHours(hours, minutes, 0, 0);

    // Ajustar al día de la semana correcto
    const currentDayIndex = now.getDay();
    let daysToAdd = targetDayIndex - currentDayIndex;

    // Si es el mismo día, verificar si la hora ya pasó
    if (daysToAdd === 0) {
      if (now > targetDate) {
        daysToAdd = 7; // Programar para la próxima semana
      }
    } else if (daysToAdd < 0) {
      daysToAdd += 7;
    }

    targetDate.setDate(targetDate.getDate() + daysToAdd);
    return targetDate;
  }

  private async sendActivityNotification(activity: DailyActivity) {
    if (!this.serviceWorkerReady || !activity.id) {
      console.warn('No se puede enviar notificación, Service Worker no está listo');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Permiso de notificaciones no otorgado');
        return;
      }

      await this.showNotification(activity);
      console.log('Notificación enviada exitosamente para:', activity.title);

      // Registrar la notificación enviada
      await this.supabase.from('activity_notifications').insert({
        activity_id: activity.id,
        title: activity.title,
        sent_at: new Date().toISOString()
      });

      // Reprogramar para la próxima semana
      this.scheduleActivityNotification(activity);
    } catch (error) {
      console.error('Error al enviar notificación:', error);
    }
  }


  private async showNotification(activity: DailyActivity) {
    if (!this.swRegistration) return;

    const options: NotificationOptions = {
      body: activity.description || 'Es hora de tu actividad programada',
      icon: '/assets/icons/notification-icon.png',
      badge: '/assets/icons/badge-icon.png',
      tag: `activity-${activity.id}`,
      renotify: true
    };

    try {
      await this.swRegistration.showNotification(activity.title, options);
    } catch (error) {
      console.error('Error mostrando notificación:', error);
    }
  }

  cancelScheduledNotification(activityId: number) {
    const timerId = this.scheduledNotifications.get(activityId);
    if (timerId) {
      clearTimeout(timerId);
      this.scheduledNotifications.delete(activityId);
    }
  }

  async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Este navegador no soporta notificaciones');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      console.log('Permiso de notificaciones:', granted ? 'concedido' : 'denegado');
      return granted;
    } catch (error) {
      console.error('Error solicitando permisos de notificación:', error);
      return false;
    }
  }

  // Método para enviar notificación de nueva tarea
  async sendTaskNotification(task: Task) {
    try {
      // Insertar la tarea en Supabase
      const { data, error } = await this.supabase
        .from('task_notifications')
        .insert({
          title: task.title,
          description: task.description,
          created_at: new Date().toISOString()
        })
        .select();

      if (error) {
        console.error('Error enviando notificación:', error);
        return;
      }

      // Enviar notificación push a todas las suscripciones guardadas
      await this.sendPushNotificationToAllSubscriptions(task);
      this.todoService.loadTasks();
    } catch (err) {
      console.error('Excepción al enviar notificación:', err);
    }
  }

  private async sendPushNotificationToAllSubscriptions(task: Task) {
    try {
      // Recuperar todas las suscripciones guardadas
      const { data: subscriptions, error } = await this.supabase
        .from('push_subscriptions')
        .select('*');

      if (error) {
        console.error('Error recuperando suscripciones:', error);
        return;
      }

      // Enviar notificación a cada suscripción
      for (const subscription of subscriptions) {
        try {
          await fetch('/api/send-push-notification', {
            method: 'POST',
            body: JSON.stringify({
              subscription: {
                endpoint: subscription.endpoint,
                keys: subscription.keys
              },
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
        } catch (subscriptionError) {
          console.error('Error enviando notificación a suscripción:', subscriptionError);
        }
      }
    } catch (error) {
      console.error('Error enviando notificaciones push:', error);
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

  cleanup() {
    // Limpiar todos los timeouts pendientes
    this.scheduledNotifications.forEach((timerId, activityId) => {
      clearTimeout(timerId);
      console.log(`Limpiando notificación programada para actividad ${activityId}`);
    });
    this.scheduledNotifications.clear();
    this.serviceWorkerReady = false;
  }
}
