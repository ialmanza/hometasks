import { Component, OnInit } from '@angular/core';
import { Meal } from '../../models/meals';
import { DailyActivity } from '../../models/daily_activity';
import { ShoppingListItem } from '../../models/shoppinglist';
import { ActivitiesService } from '../../services/activities.service';
import { MealsService } from '../../services/meal.service';
import { ShoppingListService } from '../../services/shopping-list.service';
import { CommonModule } from '@angular/common';
import { AppNavigationComponent } from "../app-navigation/app-navigation.component";

@Component({
  selector: 'app-inicio',
  imports: [CommonModule, AppNavigationComponent],
  templateUrl: './inicio.component.html',
  styleUrls: ['./inicio.component.css'],
})
export class InicioComponent implements OnInit {
  logoUrl: string = 'assets/logo.png'; // Reemplaza con la ruta de tu logo.
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

    // Cargar las últimas comidas.
    this.latestMeals = await this.mealsService.getMealsByDay(today);

    // Cargar las últimas actividades.
    this.latestActivities = await this.activitiesService.getActivitiesByDay(today);

    // Cargar la lista de compras más reciente.
    this.shoppingListService.getItems().subscribe((items) => {
      this.shoppingList = items.slice(0, 5); // Mostrar los 5 más recientes.
    });
  }
}
