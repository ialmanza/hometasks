import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { DailyActivity } from '../../models/daily_activity';
import { ActivitiesService } from '../../services/activities.service';
import { AppNavigationComponent } from "../app-navigation/app-navigation.component";
import { faEdit, faTrash, faCalendar, faTimes, faPlus } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-daily-activities-list',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, FontAwesomeModule, AppNavigationComponent],
  templateUrl: './daily-activities-list.component.html',
  styleUrl: './daily-activities-list.component.css'
})
export class DailyActivitiesListComponent {
  weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  selectedDay: string | null = null;
  activities: DailyActivity[] = [];

  editingActivity: DailyActivity | null = null;
  activityForm: FormGroup;

  // Icons
  faEdit = faEdit;
  faTrash = faTrash;
  faPlus = faPlus;

  constructor(
    private activitiesService: ActivitiesService,
    private fb: FormBuilder
  ) {
    this.activityForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      time: ['', Validators.required],
      description: ['', Validators.maxLength(200)]
    });
  }

  ngOnInit() {
    this.loadActivitiesForDay(this.selectedDay!);
  }

  selectDay(day: string) {
    this.selectedDay = day;
    this.loadActivitiesForDay(day);
  }

  async loadActivitiesForDay(day: string) {
    this.activities = await this.activitiesService.getActivitiesByDay(day);
  }

  startEditing(activity: DailyActivity) {
    this.editingActivity = { ...activity };
    this.activityForm.patchValue({
      title: activity.title,
      time: activity.time,
      description: activity.description
    });
  }

  cancelEditing() {
    this.editingActivity = null;
    this.activityForm.reset();
  }

  async updateActivity() {
    if (this.activityForm.valid && this.editingActivity) {
      const updatedActivity: DailyActivity = {
        ...this.editingActivity,
        title: this.activityForm.get('title')?.value,
        time: this.activityForm.get('time')?.value,
        description: this.activityForm.get('description')?.value
      };

      const result = await this.activitiesService.updateActivity(updatedActivity.id!, updatedActivity);
      if (result) {
        const index = this.activities.findIndex(a => a.id === updatedActivity.id);
        if (index !== -1) {
          this.activities[index] = result;
        }
        this.cancelEditing();
      }
    }
  }

  async deleteActivity(activityId: number) {
    const confirmed = window.confirm('¿Estás seguro de eliminar esta actividad?');
    if (confirmed) {
      const success = await this.activitiesService.deleteActivity(activityId);
      if (success) {
        this.activities = this.activities.filter(a => a.id !== activityId);
      }
    }
  }

  async addActivity() {
    if (this.activityForm.valid && this.selectedDay) {
      const newActivity: DailyActivity = {
        day_of_week: this.selectedDay,
        title: this.activityForm.get('title')?.value,
        description: this.activityForm.get('description')?.value,
        time: this.activityForm.get('time')?.value
      };

      const createdActivity = await this.activitiesService.createActivity(newActivity);
      if (createdActivity) {
        this.activities.push(createdActivity);
        this.activityForm.reset();
      }
    }
  }
}
