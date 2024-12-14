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

  constructor() {
    // Inicializar Supabase con tus credenciales
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );

    this.setupTaskNotificationListener();
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
    } catch (err) {
      console.error('Excepción al enviar notificación:', err);
    }
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
