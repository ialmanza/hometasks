export interface FamilyExpense {
  id?: string;
  title: string;
  description?: string;
  amount: number;
  due_date?: string;
  is_paid: boolean;
  responsible_member_id?: string;
  icon?: string;
  created_at?: string;
}

export interface SupabaseResponse<T> {
  data: T | null;
  error: any | null;
} 