export interface CalendarActivity {
  id?: number;
  user_id?: string;
  member_id?: string;
  activity_type: 'medico' | 'salida' | 'cumple';
  title: string;
  description?: string;
  address?: string; // Campo opcional para dirección
  date: string; // formato YYYY-MM-DD
  time?: string; // formato HH:MM
  created_at?: string;
}

export interface CalendarActivityWithMember extends CalendarActivity {
  member_name?: string;
  member_color?: string;
} 