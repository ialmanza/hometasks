import { Routes } from '@angular/router';
import { HomeTasksComponent } from './components/home-tasks/home-tasks.component';
import {WeeklyPlannerComponent} from "./components/weekly-planner/weekly-planner.component";
import { MealsComponent } from './components/meals/meals.component';
import { DailyActivitiesListComponent } from './components/daily-activities-list/daily-activities-list.component';
import { ShoppingListComponent } from './components/shopping-list/shopping-list.component';
import { InicioComponent } from './components/inicio/inicio.component';
import { FamilyMembersComponent } from './components/family-members/family-members.component';
import { AddExpenseFormComponent } from './components/add-expense-form/add-expense-form.component';
import { FamilyExpensesComponent } from './components/family-expenses/family-expenses.component';
import { FamilyExpensesDashboardComponent } from './components/family-expenses-dashboard/family-expenses-dashboard.component';
import { MonthlyTransactionsComponent } from './components/monthly-transactions/monthly-transactions.component';

export const routes: Routes = [
  { path: '', redirectTo: '/inicio', pathMatch: 'full' },
  { path: 'tasks', component: HomeTasksComponent},
  { path: 'weekly-planner',component: WeeklyPlannerComponent },
  { path: 'meals', component: MealsComponent },
  { path: 'activities', component: DailyActivitiesListComponent },
  { path: 'shopping-list', component: ShoppingListComponent },
  { path: 'inicio', component: InicioComponent },
  { path: 'members', component: FamilyMembersComponent },
  { path: 'add-expense', component: AddExpenseFormComponent },
  { path: 'edit-expense/:id', component: AddExpenseFormComponent },
  { path: 'expenses', component: FamilyExpensesComponent },
  { path: 'expenses-dashboard', component: FamilyExpensesDashboardComponent },
  { path: 'monthly-transactions', component: MonthlyTransactionsComponent },
  { path: '**', redirectTo: '/inicio' }
];
