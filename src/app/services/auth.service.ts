import { Injectable } from '@angular/core';
import { User } from '@supabase/supabase-js';
import { supabase } from './Supabase-Client/supabase-client';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor() {}

  // Obtener el usuario actual
  async getCurrentUser(): Promise<User | null> {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Error getting current user:', error);
      return null;
    }
    return user;
  }

  // Obtener el ID del usuario actual
  async getCurrentUserId(): Promise<string | null> {
    const user = await this.getCurrentUser();
    return user?.id || null;
  }

  // Cerrar sesión
  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error during logout:', error);
    }
  }

  // Verificar si el usuario está autenticado
  async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user !== null;
  }
} 