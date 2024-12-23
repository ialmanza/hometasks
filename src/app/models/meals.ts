export interface Meal {
  id?: number;
  day_of_week: string;
  meal_type: 'breakfast' | 'lunch '| 'dinner';
  description: string;
}

