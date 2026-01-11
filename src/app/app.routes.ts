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
import { VacationExpensesListComponent } from './components/vacation-expenses-list/vacation-expenses-list.component';
import { CalendarActivitiesComponent } from './components/calendar-activities/calendar-activities.component';
import { Login } from './components/Login/login/login';
import { AuthGuard } from './guards/auth.guard';
import { AuthorizedUsersComponent } from './components/authorized-users/authorized-users.component';
import { PushDiagnosticComponent } from './components/push-diagnostic/push-diagnostic.component';

export const routes: Routes = [
  { path: '', redirectTo: '/expenses-dashboard', pathMatch: 'full' },
  { path: 'tasks', component: HomeTasksComponent, canActivate: [AuthGuard]},
  { path: 'weekly-planner',component: WeeklyPlannerComponent, canActivate: [AuthGuard] },
  { path: 'meals', component: MealsComponent, canActivate: [AuthGuard] },
  { path: 'activities', component: DailyActivitiesListComponent, canActivate: [AuthGuard] },
  { path: 'calendar', component: CalendarActivitiesComponent, canActivate: [AuthGuard] },
  { path: 'shopping-list', component: ShoppingListComponent, canActivate: [AuthGuard] },
  { path: 'inicio', component: InicioComponent, canActivate: [AuthGuard] },
  { path: 'members', component: FamilyMembersComponent, canActivate: [AuthGuard] },
  { path: 'add-expense', component: AddExpenseFormComponent, canActivate: [AuthGuard] },
  { path: 'edit-expense/:id', component: AddExpenseFormComponent, canActivate: [AuthGuard] },
  { path: 'vacation-expenses', component: VacationExpensesListComponent, canActivate: [AuthGuard] },
  { path: 'add-vacation-expense', component: AddExpenseFormComponent, canActivate: [AuthGuard] },
  { path: 'edit-vacation-expense/:id', component: AddExpenseFormComponent, canActivate: [AuthGuard] },
  { path: 'expenses', component: MonthlyTransactionsComponent, canActivate: [AuthGuard]},
  { path: 'expenses-dashboard', component: FamilyExpensesDashboardComponent, canActivate: [AuthGuard] },
  { path: 'monthly-transactions', component:  FamilyExpensesComponent, canActivate: [AuthGuard]},
  { path: 'authorized-users', component: AuthorizedUsersComponent, canActivate: [AuthGuard] },
  { path: 'push-diagnostic', component: PushDiagnosticComponent, canActivate: [AuthGuard] },
  { path: 'login', component: Login},
  { path: '**', redirectTo: '/login' }
];
