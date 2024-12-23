// inicio.component.ts
import { Component, OnInit } from '@angular/core';
import { Meal } from '../../models/meals';
import { DailyActivity } from '../../models/daily_activity';
import { ShoppingListItem } from '../../models/shoppinglist';
import { ActivitiesService } from '../../services/activities.service';
import { MealsService } from '../../services/meal.service';
import { ShoppingListService } from '../../services/shopping-list.service';
import { CommonModule } from '@angular/common';
import { AppNavigationComponent } from "../app-navigation/app-navigation.component";
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-inicio',
  imports: [CommonModule, AppNavigationComponent, RouterLink],
  templateUrl: './inicio.component.html',
  styleUrls: ['./inicio.component.css']
})
export class InicioComponent implements OnInit {
  logoUrl: string = 'assets/images/sin_fondo.png';
  latestMeals: Meal[] = [];
  latestActivities: DailyActivity[] = [];
  shoppingList: ShoppingListItem[] = [];

  constructor(
    private mealsService: MealsService,
    private activitiesService: ActivitiesService,
    private shoppingListService: ShoppingListService
  ) {}

  async ngOnInit(): Promise<void> {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    // Cargar solo las últimas 3 actividades
    this.latestActivities = (await this.activitiesService.getActivitiesByDay(today)).slice(0, 3);

    // Cargar solo las últimas 3 comidas
    this.latestMeals = (await this.mealsService.getMealsByDay(today)).slice(0, 3);

    // Cargar la lista de compras más reciente
    this.shoppingListService.getItems().subscribe((items) => {
      this.shoppingList = items.slice(0, 3);
    });
  }
}
