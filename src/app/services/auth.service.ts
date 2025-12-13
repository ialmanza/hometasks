import { Injectable } from '@angular/core';
import { User } from '@supabase/supabase-js';
import { supabase } from './Supabase-Client/supabase-client';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor() {}

  /**
   * Verifica si hay una sesión local almacenada (sin hacer llamada a red)
   * Útil para verificación rápida antes de intentar verificar con el servidor
   */
  async hasLocalSession(): Promise<boolean> {
    try {
      // Verificar si hay un token de sesión en localStorage
      const session = await supabase.auth.getSession();
      return session.data?.session !== null && session.data?.session !== undefined;
    } catch (error) {
      console.error('Error verificando sesión local:', error);
      return false;
    }
  }

  // Obtener el usuario actual
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Error getting current user:', error);
        return null;
      }
      return user;
    } catch (error) {
      console.error('Excepción al obtener usuario:', error);
      // En caso de error, intentar obtener de la sesión local
      try {
        const session = await supabase.auth.getSession();
        return session.data?.session?.user || null;
      } catch (localError) {
        console.error('Error obteniendo sesión local:', localError);
        return null;
      }
    }
  }

  // Obtener el ID del usuario actual
  async getCurrentUserId(): Promise<string | null> {
    const user = await this.getCurrentUser();
    return user?.id || null;
  }

  // Cerrar sesión
  async logout(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error during logout:', error);
      }
    } catch (error) {
      console.error('Excepción durante logout:', error);
    }
  }

  // Verificar si el usuario está autenticado
  async isAuthenticated(): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      return user !== null;
    } catch (error) {
      console.error('Error verificando autenticación:', error);
      // En caso de error, verificar sesión local como fallback
      return await this.hasLocalSession();
    }
  }
} 