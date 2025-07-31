import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environments';

export interface AuthorizedUser {
  id: number;
  email: string;
  name: string;
  is_active: boolean;
  created_at: string;
  notification_preferences: {
    push: boolean;
    email: boolean;
    urgent_only?: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthorizedUsersService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
  }

  /**
   * Verifica si un usuario está autorizado para recibir notificaciones
   */
  async isUserAuthorized(email: string): Promise<AuthorizedUser | null> {
    try {
      const { data, error } = await this.supabase
        .from('authorized_notification_users')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error verificando autorización:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Excepción al verificar autorización:', error);
      return null;
    }
  }

  /**
   * Obtiene todos los usuarios autorizados
   */
  async getAuthorizedUsers(): Promise<AuthorizedUser[]> {
    try {
      const { data, error } = await this.supabase
        .from('authorized_notification_users')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error obteniendo usuarios autorizados:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Excepción al obtener usuarios autorizados:', error);
      return [];
    }
  }

  /**
   * Agrega un nuevo usuario autorizado
   */
  async addAuthorizedUser(userData: {
    email: string;
    name: string;
    notification_preferences?: {
      push: boolean;
      email: boolean;
      urgent_only?: boolean;
    };
  }): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('authorized_notification_users')
        .insert({
          email: userData.email.toLowerCase(),
          name: userData.name,
          notification_preferences: userData.notification_preferences || {
            push: true,
            email: false,
            urgent_only: false
          }
        });

      if (error) {
        console.error('Error agregando usuario autorizado:', error);
        return false;
      }

      console.log('Usuario autorizado agregado exitosamente');
      return true;
    } catch (error) {
      console.error('Excepción al agregar usuario autorizado:', error);
      return false;
    }
  }

  /**
   * Actualiza las preferencias de notificación de un usuario
   */
  async updateNotificationPreferences(
    email: string, 
    preferences: {
      push: boolean;
      email: boolean;
      urgent_only?: boolean;
    }
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('authorized_notification_users')
        .update({
          notification_preferences: preferences
        })
        .eq('email', email.toLowerCase());

      if (error) {
        console.error('Error actualizando preferencias:', error);
        return false;
      }

      console.log('Preferencias actualizadas exitosamente');
      return true;
    } catch (error) {
      console.error('Excepción al actualizar preferencias:', error);
      return false;
    }
  }

  /**
   * Desactiva un usuario autorizado
   */
  async deactivateUser(email: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('authorized_notification_users')
        .update({ is_active: false })
        .eq('email', email.toLowerCase());

      if (error) {
        console.error('Error desactivando usuario:', error);
        return false;
      }

      console.log('Usuario desactivado exitosamente');
      return true;
    } catch (error) {
      console.error('Excepción al desactivar usuario:', error);
      return false;
    }
  }
} 