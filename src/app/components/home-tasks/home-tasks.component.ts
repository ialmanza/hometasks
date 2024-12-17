import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { Task, TasksService } from '../../services/tasks.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { NotificationService } from '../../services/notifications.service';
import { PushSubscriptionService } from '../../services/push-subscription.service';


@Component({
    selector: 'app-home-tasks',
    imports: [CommonModule, ReactiveFormsModule],
    providers: [TasksService, NotificationService],
    templateUrl: './home-tasks.component.html',
    styleUrl: './home-tasks.component.css',
    animations: [
        trigger('taskAnimation', [
            transition(':enter', [
                style({ opacity: 0, transform: 'translateY(-20px)' }),
                animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
            ]),
            transition(':leave', [
                animate('300ms ease-in', style({ opacity: 0, transform: 'translateX(100%)' }))
            ])
        ])
    ]
})
export class HomeTasksComponent implements OnInit {
  taskForm: FormGroup;
  tasks$: Observable<Task[]>;
  editingTask: Task | null = null;

  constructor(
    private todoService: TasksService,
    private notificationService: NotificationService,
    private fb: FormBuilder,
    private pushSubscriptionService: PushSubscriptionService
  ) {
    this.tasks$ = this.todoService.tasks$;
    this.taskForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', Validators.maxLength(200)]
    });
  }

  ngOnInit() {
    this.notificationService.requestNotificationPermission();

    this.notificationService.getSubscription().then(subscription => {
      if (subscription) {
        this.notificationService.saveSubscription(subscription);
      }
    });
  }

  ngOnDestroy() {
    this.notificationService.cleanup();
  }

  onSubmit() {
    if (this.taskForm.valid) {
      const taskData = {
        title: this.taskForm.get('title')?.value,
        description: this.taskForm.get('description')?.value,
        completed: false
      };

      if (this.editingTask) {
        // Actualizar tarea existente
        this.todoService.updateTask({
          ...this.editingTask,
          ...taskData
        });
        this.cancelEditing();
      } else {
        // Crear nueva tarea
        //this.todoService.addTask(taskData);
        this.notificationService.sendTaskNotification({
          title: taskData.title,
          description: taskData.description,
          completed: false,
          created_at: new Date()
        });
      }

      this.taskForm.reset();
    }
  }

  startEditing(task: Task) {
    this.editingTask = task;
    this.taskForm.patchValue({
      title: task.title,
      description: task.description
    });
  }

  cancelEditing() {
    this.editingTask = null;
    this.taskForm.reset();
  }

  deleteTask(taskId: string) {
    this.todoService.deleteTask(taskId);

    // Si la tarea eliminada es la que se está editando, cancelar edición
    if (this.editingTask && this.editingTask.id === taskId) {
      this.cancelEditing();
    }
  }

  toggleTaskCompletion(taskId: string) {
    this.todoService.toggleTaskCompletion(taskId);
  }
}
