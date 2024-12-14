import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { environment } from '../../environments/environments';

export interface Task {
  id?: string;
  title: string;
  description: string;
  completed: boolean;
  created_at?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class TasksService {
  private supabase: SupabaseClient;
  private _tasks = new BehaviorSubject<Task[]>([]);
  tasks$ = this._tasks.asObservable();

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
    this.loadTasks();
  }

  async loadTasks() {
    try {
      const { data, error } = await this.supabase
        .from('task_notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      this._tasks.next(data || []);
    } catch (error) {
      console.error('Error cargando tareas:', error);
    }
  }

  async addTask(task: Omit<Task, 'id' | 'created_at'>) {
    try {
      const newTask: Task = {
        ...task,
        created_at: new Date(),
        completed: false
      };

      const { data, error } = await this.supabase
        .from('task_notifications')
        .insert(newTask)
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        const currentTasks = this._tasks.value;
        this._tasks.next([data[0], ...currentTasks]);
        this.playNotificationSound();
      }
    } catch (error) {
      console.error('Error agregando tarea:', error);
    }
  }

  async updateTask(updatedTask: Task) {
    try {
      const { data, error } = await this.supabase
        .from('task_notifications')
        .update({
          title: updatedTask.title,
          description: updatedTask.description,
          completed: updatedTask.completed
        })
        .eq('id', updatedTask.id)
        .select();

      if (error) throw error;

      const currentTasks = this._tasks.value;
      const updatedTasks = currentTasks.map(task =>
        task.id === updatedTask.id ? data[0] : task
      );
      this._tasks.next(updatedTasks);
    } catch (error) {
      console.error('Error actualizando tarea:', error);
    }
  }

  async deleteTask(taskId: string) {
    try {
      const { error } = await this.supabase
        .from('task_notifications')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      const currentTasks = this._tasks.value;
      const updatedTasks = currentTasks.filter(task => task.id !== taskId);
      this._tasks.next(updatedTasks);
    } catch (error) {
      console.error('Error eliminando tarea:', error);
    }
  }

  async toggleTaskCompletion(taskId: string) {
    try {
      const currentTasks = this._tasks.value;
      const task = currentTasks.find(t => t.id === taskId);

      if (!task) return;

      const { data, error } = await this.supabase
        .from('task_notifications')
        .update({ completed: !task.completed })
        .eq('id', taskId)
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
