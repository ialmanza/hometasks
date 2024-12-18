import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environments';

export interface WeeklySchedule {
  id?: string;
  date: Date;
  day_of_week: string;
  user_id?: string;
  created_at?: Date;
}

export interface Meal {
  id?: string;
  schedule_id: string;
  meal_type: 'Desayuno' | 'Almuerzo' | 'Cena';
  description: string;
  created_at?: Date;
}

export interface DailyActivity {
  id?: string;
  schedule_id: string;
  title: string;
  description?: string;
  time?: string;
  created_at?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class WeeklyScheduleService {
  private supabase: SupabaseClient;
  private _schedules = new BehaviorSubject<WeeklySchedule[]>([]);
  schedules$ = this._schedules.asObservable();

  private _meals = new BehaviorSubject<Meal[]>([]);
  meals$ = this._meals.asObservable();

  private _activities = new BehaviorSubject<DailyActivity[]>([]);
  activities$ = this._activities.asObservable();

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );

    // Inicializar la carga de datos y limpieza al arrancar
    this.initializeWeeklyData();
  }

  private async initializeWeeklyData() {
    // Borrar registros antiguos
    await this.cleanupOldRecords();

    // Cargar o crear schedules para la semana actual
    await this.ensureCurrentWeekSchedules();

    // Cargar todos los datos existentes
    await this.loadAllCurrentData();
  }

  private async cleanupOldRecords() {
    try {
      // Borrar schedules, meals y activities más antiguos de 7 días
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Borrar actividades antiguas
      await this.supabase
        .from('daily_activities')
        .delete()
        .lt('created_at', sevenDaysAgo.toISOString());

      // Borrar comidas antiguas
      await this.supabase
        .from('meals')
        .delete()
        .lt('created_at', sevenDaysAgo.toISOString());

      // Borrar schedules antiguos
      await this.supabase
        .from('weekly_schedules')
        .delete()
        .lt('created_at', sevenDaysAgo.toISOString());

    } catch (error) {
      console.error('Error limpiando registros antiguos:', error);
    }
  }

  // private async ensureCurrentWeekSchedules() {
  //   try {
  //     const today = new Date();
  //     const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 1));

  //     const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  //     for (let i = 0; i < weekDays.length; i++) {
  //       const currentDate = new Date(startOfWeek);
  //       currentDate.setDate(startOfWeek.getDate() + i);
  //       const formattedDate = currentDate.toISOString().split('T')[0];

  //       // Verificar si ya existe un schedule para este día
  //       const { data, error } = await this.supabase
  //         .from('weekly_schedules')
  //         .select('*')
  //         .eq('day_of_week', weekDays[i])
  //         .eq('date', formattedDate)
  //         .limit(1);


  //       // Si no existe, crear uno nuevo
  //       if (error || !data) {
  //         await this.createWeeklySchedule({
  //           date: currentDate,
  //           day_of_week: weekDays[i]
  //         });
  //       }
  //     }
  //   } catch (error) {
  //     console.error('Error asegurando schedules de la semana:', error);
  //   }
  // }

  private async ensureCurrentWeekSchedules() {
    try {
      const today = new Date();
      const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 1));

      const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

      for (let i = 0; i < weekDays.length; i++) {
        const currentDate = new Date(startOfWeek);
        currentDate.setDate(startOfWeek.getDate() + i);
        const formattedDate = currentDate.toISOString().split('T')[0];

        // Remove .single() and handle the results differently
        const { data, error } = await this.supabase
          .from('weekly_schedules')
          .select('*')
          .eq('day_of_week', weekDays[i])
          .eq('date', formattedDate);

        // If no schedules exist, create a new one
        if (error || !data || data.length === 0) {
          await this.createWeeklySchedule({
            date: currentDate,
            day_of_week: weekDays[i]
          });
        }
      }
    } catch (error) {
      console.error('Error asegurando schedules de la semana:', error);
    }
  }

  // private async loadAllCurrentData() {
  //   try {
  //     // Cargar schedules de la semana actual
  //     await this.loadCurrentWeekSchedules();

  //     // Si hay schedules, cargar meals y activities para cada uno
  //     const currentSchedules = this._schedules.value;
  //     for (const schedule of currentSchedules) {
  //       if (schedule.id) {
  //         // Cargar meals y evitar duplicados
  //         const meals = await this.loadMealsForSchedule(schedule.id);
  //         const uniqueMeals = Array.from(new Set([...this._meals.value, ...meals]));
  //         this._meals.next(uniqueMeals);

  //         // Cargar activities y evitar duplicados
  //         const activities = await this.loadActivitiesForSchedule(schedule.id);
  //         const uniqueActivities = Array.from(new Set([...this._activities.value, ...activities]));
  //         this._activities.next(uniqueActivities);
  //       }
  //     }
  //   } catch (error) {
  //     console.error('Error cargando datos actuales:', error);
  //   }
  // }

  private async loadAllCurrentData() {
    try {
      // Load current week's schedules
      const schedules = await this.loadCurrentWeekSchedules();

      // If schedules exist, load associated data
      if (schedules && schedules.length > 0) {
        for (const schedule of schedules) {
          if (schedule.id) {
            // Load meals for each schedule
            const meals = await this.getMealsForDay(schedule.id);
            this._meals.next(meals);

            // Load activities for each schedule
            const activities = await this.loadActivitiesForSchedule(schedule.id);
            this._activities.next(activities);
          }
        }
      }
    } catch (error) {
      console.error('Error loading current data:', error);
    }
  }

  async loadCurrentWeekSchedules() {
    try {
      const today = new Date();
      const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 1));
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      const { data, error } = await this.supabase
        .from('weekly_schedules')
        .select('*')
        .gte('date', startOfWeek.toISOString().split('T')[0])
        .lte('date', endOfWeek.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;

      this._schedules.next(data || []);
      return data;
    } catch (error) {
      console.error('Error cargando schedules de la semana:', error);
      return [];
    }
  }

  async createWeeklySchedule(schedule: Omit<WeeklySchedule, 'id'>) {
    try {
      const { data, error } = await this.supabase
        .from('weekly_schedules')
        .insert({
          ...schedule,
          date: schedule.date.toISOString().split('T')[0]
        })
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        const currentSchedules = this._schedules.value;
        this._schedules.next([...currentSchedules, data[0]]);
        return data[0];
      }
    } catch (error) {
      console.error('Error creando weekly schedule:', error);
    }
  }

  // Métodos para cargar meals y activities (similar a loadCurrentWeekSchedules)
  async loadMealsForSchedule(scheduleId: string) {
    try {
      const { data, error } = await this.supabase
        .from('meals')
        .select('*')
        .eq('schedule_id', scheduleId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      this._meals.next(data || []);
      return data;
    } catch (error) {
      console.error('Error cargando meals:', error);
      return [];
    }
  }

  async loadActivitiesForSchedule(scheduleId: string) {
    try {
      const { data, error } = await this.supabase
        .from('daily_activities')
        .select('*')
        .eq('schedule_id', scheduleId)
        .order('time', { ascending: true });

      if (error) throw error;

      this._activities.next(data || []);
      return data;
    } catch (error) {
      console.error('Error cargando actividades:', error);
      return [];
    }
  }

  // Los demás métodos de addMeal, addActivity, etc. permanecen igual
  async addMeal(meal: Omit<Meal, 'id'>) {
    try {
      const { data, error } = await this.supabase
        .from('meals')
        .insert(meal)
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        const currentMeals = this._meals.value;
        this._meals.next([...currentMeals, data[0]]);
        return data[0];
      }
    } catch (error) {
      console.error('Error agregando meal:', error);
    }
  }

  async addActivity(activity: Omit<DailyActivity, 'id'>) {
    try {
      const { data, error } = await this.supabase
        .from('daily_activities')
        .insert(activity)
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        const currentActivities = this._activities.value;
        this._activities.next([...currentActivities, data[0]]);
        return data[0];
      }
    } catch (error) {
      console.error('Error agregando actividad:', error);
    }
  }

  // Retrieve meals for a specific day
async getMealsForDay(scheduleId: string) {
  try {
    const { data, error } = await this.supabase
      .from('meals')
      .select('*')
      .eq('schedule_id', scheduleId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error retrieving meals:', error);
    return [];
  }
}

// Update a meal
async updateMeal(mealId: string, updates: Partial<Meal>) {
  try {
    const { data, error } = await this.supabase
      .from('meals')
      .update(updates)
      .eq('id', mealId)
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating meal:', error);
    return null;
  }
}

// Delete a meal
async deleteMeal(mealId: string) {
  try {
    const { error } = await this.supabase
      .from('meals')
      .delete()
      .eq('id', mealId);

    if (error) throw error;

    // Update the local meals state
    const currentMeals = this._meals.value;
    const updatedMeals = currentMeals.filter(meal => meal.id !== mealId);
    this._meals.next(updatedMeals);
  } catch (error) {
    console.error('Error deleting meal:', error);
  }
}

// Similar methods can be created for activities
}
