export interface VacationExpense {
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

