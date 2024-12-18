export interface Meal {
  id?: number;
  day_of_week: string;
  meal_type: 'Desayuno' | 'Almuerzo' | 'Cena';
  description: string;
}

