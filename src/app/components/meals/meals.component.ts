import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faEdit, faTrash, faPlus } from '@fortawesome/free-solid-svg-icons';
import { Meal } from '../../models/meals';
import { MealsService } from '../../services/meal.service';
import { AppNavigationComponent } from "../app-navigation/app-navigation.component";

@Component({
  selector: 'app-meals',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, FontAwesomeModule, AppNavigationComponent],
  templateUrl: './meals.component.html',
  styleUrl: './meals.component.css'
})
export class MealsComponent {
  weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  selectedDay: string | null = null;
  meals: Meal[] = [];

  editingMeal: Meal | null = null;
  mealForm: FormGroup;

  // Icons
  faEdit = faEdit;
  faTrash = faTrash;
  faPlus = faPlus;

  constructor(
    private mealsService: MealsService,
    private fb: FormBuilder
  ) {
    this.mealForm = this.fb.group({
      mealType: ['', Validators.required],
      description: ['', [Validators.required, Validators.maxLength(200)]]
    });
  }

  ngOnInit() {
    this.loadMealsForDay(this.selectedDay!);
  }

  selectDay(day: string) {
    this.selectedDay = day;
    this.loadMealsForDay(day);
  }

  async loadMealsForDay(day: string) {
    this.meals = await this.mealsService.getMealsByDay(day);
  }

  startEditing(meal: Meal) {
    this.editingMeal = { ...meal };
    this.mealForm.patchValue({
      mealType: meal.meal_type,
      description: meal.description
    });
  }

  cancelEditing() {
    this.editingMeal = null;
    this.mealForm.reset();
  }

  async updateMeal() {
    if (this.mealForm.valid && this.editingMeal) {
      const updatedMeal: Meal = {
        ...this.editingMeal,
        meal_type: this.mealForm.get('mealType')?.value,
        description: this.mealForm.get('description')?.value
      };

      const result = await this.mealsService.updateMeal(updatedMeal.id!, updatedMeal);
      if (result) {
        const index = this.meals.findIndex(m => m.id === updatedMeal.id);
        if (index !== -1) {
          this.meals[index] = result;
        }
        this.cancelEditing();
      }
    }
  }

  async deleteMeal(mealId: number) {
    const confirmed = window.confirm('¿Estás seguro de eliminar esta comida?');
    if (confirmed) {
      const success = await this.mealsService.deleteMeal(mealId);
      if (success) {
        this.meals = this.meals.filter(m => m.id !== mealId);
      }
    }
  }
}
