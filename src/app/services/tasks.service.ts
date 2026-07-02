import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { environment } from '../../environments/environments';
import { GuestNotificationService } from './guest-notification.service';
import { NotificationService } from './notifications.service';
import { AuthService } from './auth.service';

export interface Task {
  id?: number;
  title: string;
  description: string;
  completed: boolean;
  created_at?: Date;
  user_id?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TasksService {
  private supabase: SupabaseClient;
  private _tasks = new BehaviorSubject<Task[]>([]);
  tasks$ = this._tasks.asObservable();

  constructor(
    private guestNotificationService: GuestNotificationService,
    private notificationService: NotificationService,
    private authService: AuthService
  ) {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
    // La carga de tareas se hace bajo demanda cuando el componente lo requiere
  }

  async loadTasks() {
    try {
      console.log('Cargando tareas desde Supabase...');

      const userId = await this.authService.getCurrentUserId();
      if (!userId) {
        console.error('No authenticated user found');
        this._tasks.next([]);
        return;
      }

      const { data, error } = await this.supabase
        .from('task_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error en Supabase al cargar tareas:', error);
        throw error;
      }

      console.log('Tareas cargadas desde Supabase:', data);
      this._tasks.next(data || []);
      console.log('Estado actual de tareas:', this._tasks.value);
    } catch (error) {
      console.error('Error cargando tareas:', error);
    }
  }

  async addTask(task: Omit<Task, 'id' | 'created_at' | 'user_id'>) {
    try {
      console.log('Intentando agregar tarea:', task);

      const userId = await this.authService.getCurrentUserId();
      if (!userId) {
        console.error('No authenticated user found');
        return;
      }

      const newTask: Task = {
        ...task,
        created_at: new Date(),
        completed: false,
        user_id: userId
      };

      console.log('Tarea a insertar:', newTask);

      const { data, error } = await this.supabase
        .from('task_notifications')
        .insert(newTask)
        .select();

      if (error) {
        console.error('Error en Supabase al insertar tarea:', error);
        throw error;
      }

      console.log('Respuesta de Supabase:', data);

      if (data && data.length > 0) {
        const currentTasks = this._tasks.value;
        this._tasks.next([data[0], ...currentTasks]);
        this.playNotificationSound();
        console.log('Tarea agregada exitosamente:', data[0]);
        
        // Enviar notificación local del navegador
        this.notificationService.sendTaskNotification(task);
        
        // Enviar notificación push a usuarios autorizados
        await this.guestNotificationService.sendGuestNotification({
          title: 'Nueva Tarea Creada',
          body: `${task.title} - ${task.description || 'Sin descripción'}`,
          notification_type: 'task',
          data: {
            taskId: data[0].id,
            title: task.title,
            description: task.description,
            completed: false
          }
        });
      } else {
        console.warn('No se recibieron datos de la inserción');
      }
      
      // Recargar tareas para asegurar sincronización
      await this.loadTasks();
    } catch (error) {
      console.error('Error agregando tarea:', error);
    }
  }

  async updateTask(updatedTask: Task) {
    try {
      const userId = await this.authService.getCurrentUserId();
      if (!userId) {
        console.error('No authenticated user found');
        return;
      }

      const { data, error } = await this.supabase
        .from('task_notifications')
        .update({
          title: updatedTask.title,
          description: updatedTask.description,
          completed: updatedTask.completed
        })
        .eq('id', updatedTask.id)
        .eq('user_id', userId)
        .select();

      if (error) throw error;

      const currentTasks = this._tasks.value;
      const updatedTasks = currentTasks.map(task =>
        task.id === updatedTask.id ? data[0] : task
      );
      this._tasks.next(updatedTasks);
      this.loadTasks();
    } catch (error) {
      console.error('Error actualizando tarea:', error);
    }
  }

  async deleteTask(taskId: number) {
    try {
      const userId = await this.authService.getCurrentUserId();
      if (!userId) {
        console.error('No authenticated user found');
        return;
      }

      const { error } = await this.supabase
        .from('task_notifications')
        .delete()
        .eq('id', taskId)
        .eq('user_id', userId);

      if (error) throw error;

      const currentTasks = this._tasks.value;
      const updatedTasks = currentTasks.filter(task => task.id !== taskId);
      this._tasks.next(updatedTasks);
      this.loadTasks();
    } catch (error) {
      console.error('Error eliminando tarea:', error);
    }
  }

  async toggleTaskCompletion(taskId: number) {
    try {
      const userId = await this.authService.getCurrentUserId();
      if (!userId) {
        console.error('No authenticated user found');
        return;
      }

      const currentTasks = this._tasks.value;
      const task = currentTasks.find(t => t.id === taskId);

      if (!task) return;

      const { data, error } = await this.supabase
        .from('task_notifications')
        .update({ completed: !task.completed })
        .eq('id', taskId)
        .eq('user_id', userId)
        .select();

      if (error) throw error;

      const updatedTasks = currentTasks.map(t =>
        t.id === taskId ? data[0] : t
      );
      this._tasks.next(updatedTasks);
    } catch (error) {
      console.error('Error cambiando estado de tarea:', error);
    }
  }

  private playNotificationSound() {
    const audio = new Audio('level-up-191997.mp3');
    audio.play().catch(error => console.warn('Error playing notification sound:', error));
  }
}
