export interface ShoppingListItem {
  id?: number;
  name: string;
  category: 'fruits' | 'vegetables' | 'other';
  quantity: number;
  unit: string;
  is_purchased: boolean;
  created_at?: string;
}

export interface SupabaseResponse<T> {
  data: T | null;
  error: any | null;
}
