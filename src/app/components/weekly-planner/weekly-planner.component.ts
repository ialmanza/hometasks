// import { Component, OnInit } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
// import { WeeklyScheduleService, WeeklySchedule, Meal, DailyActivity } from '../../services/weekly-schedule.service';
// import { AppNavigationComponent } from "../app-navigation/app-navigation.component";


// @Component({
//   selector: 'app-weekly-planner',
//   imports: [CommonModule, ReactiveFormsModule, AppNavigationComponent],
//   templateUrl: './weekly-planner.component.html',
//   styleUrl: './weekly-planner.component.css'
// })
// export class WeeklyPlannerComponent {
//   weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
//   selectedDay: string | null = null;
//   mealForm: FormGroup;
//   activityForm: FormGroup;
//   schedules: WeeklySchedule[] = [];
//   meals: Meal[] = [];
//   activities: DailyActivity[] = [];

//   constructor(
//     private weeklyScheduleService: WeeklyScheduleService,
//     private fb: FormBuilder
//   ) {
//     this.mealForm = this.fb.group({
//       mealType: ['', Validators.required],
//       description: ['', Validators.maxLength(200)]
//     });

//     this.activityForm = this.fb.group({
//       title: ['', [Validators.required, Validators.minLength(3)]],
//       description: ['', Validators.maxLength(200)],
//       time: ['']
//     });
//   }

//   ngOnInit() {
//     this.weeklyScheduleService.schedules$.subscribe(
//       schedules => this.schedules = schedules
//     );

//     // this.weeklyScheduleService.meals$.subscribe(
//     //   meals => this.meals = meals
//     // );

//     this.weeklyScheduleService.getMealsForDay('');
//     this.weeklyScheduleService.activities$.subscribe(
//       activities => this.activities = activities
//     );

//     this.loadCurrentWeekSchedules();
//   }

//   loadCurrentWeekSchedules() {
//     const today = new Date();
//     const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 1));

//     this.weekDays.forEach((day, index) => {
//       const currentDate = new Date(startOfWeek);
//       currentDate.setDate(startOfWeek.getDate() + index);

//       this.weeklyScheduleService.createWeeklySchedule({
//         date: currentDate,
//         day_of_week: day
//       });
//     });

//     //this.weeklyScheduleService.loadSchedulesForWeek();
//     this.weeklyScheduleService.loadCurrentWeekSchedules();
//   }

//   selectDay(day: string) {
//     this.selectedDay = day;
//     const selectedSchedule = this.schedules.find(s => s.day_of_week === day);

//     if (selectedSchedule) {
//       this.weeklyScheduleService.loadMealsForSchedule(selectedSchedule.id!);
//       this.weeklyScheduleService.loadActivitiesForSchedule(selectedSchedule.id!);
//     }
//   }

//   addMeal() {
//     if (this.mealForm.valid) {
//       const selectedSchedule = this.schedules.find(s => s.day_of_week === this.selectedDay);

//       if (selectedSchedule) {
//         this.weeklyScheduleService.addMeal({
//           schedule_id: selectedSchedule.id!,
//           meal_type: this.mealForm.get('mealType')?.value,
//           description: this.mealForm.get('description')?.value
//         });

//         this.mealForm.reset();
//       }
//     }
//   }

//   addActivity() {
//     if (this.activityForm.valid) {
//       const selectedSchedule = this.schedules.find(s => s.day_of_week === this.selectedDay);

//       if (selectedSchedule) {
//         this.weeklyScheduleService.addActivity({
//           schedule_id: selectedSchedule.id!,
//           title: this.activityForm.get('title')?.value,
//           description: this.activityForm.get('description')?.value,
//           time: this.activityForm.get('time')?.value
//         });

//         this.activityForm.reset();
//       }
//     }
//   }
// }


// weekly-planner.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Meal } from '../../models/meals';
import { DailyActivity } from '../../models/daily_activity';
import { MealsService } from '../../services/meal.service';
import { ActivitiesService } from '../../services/activities.service';
import { AppNavigationComponent } from "../app-navigation/app-navigation.component";
import { from } from 'rxjs';

@Component({
  selector: 'app-weekly-planner',
  imports: [CommonModule, ReactiveFormsModule, AppNavigationComponent],
  templateUrl: './weekly-planner.component.html',
  styleUrl: './weekly-planner.component.css'
})
export class WeeklyPlannerComponent implements OnInit {
  weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  selectedDay: string | null = null;

  mealForm: FormGroup;
  activityForm: FormGroup;

  meals: Meal[] = [];
  activities: DailyActivity[] = [];

  constructor(
    private mealsService: MealsService,
    private activitiesService: ActivitiesService,
    private fb: FormBuilder
  ) {
    this.mealForm = this.fb.group({
      mealType: ['', Validators.required],
      description: ['', Validators.maxLength(200)]
    });

    this.activityForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', Validators.maxLength(200)],
      time: ['']
    });
  }

  ngOnInit() {}

  selectDay(day: string) {
    this.selectedDay = day;
    this.loadMealsForDay(day);
    this.loadActivitiesForDay(day);
  }

  async loadMealsForDay(day: string) {
    this.meals = await this.mealsService.getMealsByDay(day);
  }

  async loadActivitiesForDay(day: string) {
    this.activities = await this.activitiesService.getActivitiesByDay(day);
  }

  async addMeal() {
    if (this.mealForm.valid && this.selectedDay) {
      const newMeal: Meal = {
        day_of_week: this.selectedDay,
        meal_type: this.mealForm.get('mealType')?.value,
        description: this.mealForm.get('description')?.value
      };

      const createdMeal = await this.mealsService.createMeal(newMeal);
      if (createdMeal) {
        this.meals.push(createdMeal);
        this.mealForm.reset();
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
