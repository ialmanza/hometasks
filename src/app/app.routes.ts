import { Routes } from '@angular/router';
import { HomeTasksComponent } from './components/home-tasks/home-tasks.component';
import {WeeklyPlannerComponent} from "./components/weekly-planner/weekly-planner.component";
import { MealsComponent } from './components/meals/meals.component';
import { DailyActivitiesListComponent } from './components/daily-activities-list/daily-activities-list.component';
import { ShoppingListComponent } from './components/shopping-list/shopping-list.component';
import { InicioComponent } from './components/inicio/inicio.component';

export const routes: Routes = [
  { path: '', redirectTo: '/tasks', pathMatch: 'full' },
  { path: 'tasks', component: HomeTasksComponent},
  { path: 'weekly-planner',component: WeeklyPlannerComponent },
  { path: 'meals', component: MealsComponent },
  { path: 'activities', component: DailyActivitiesListComponent },
  { path: 'shopping-list', component: ShoppingListComponent },
  { path: 'inicio', component: InicioComponent },
  { path: '**', redirectTo: '/tasks' }
];
