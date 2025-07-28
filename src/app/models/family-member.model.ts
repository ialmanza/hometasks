export interface FamilyMember {
  id?: string;
  name: string;
  created_at?: string;
}

export interface SupabaseResponse<T> {
  data: T | null;
  error: any | null;
} 