import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { Observable, from, map } from 'rxjs';
import { environment } from '../../../environments/environments';
import { AuthService } from '../auth.service';
import { supabase } from '../Supabase-Client/supabase-client';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {

  constructor(private authService: AuthService) {}

  // Obtener el cliente de Supabase
  getClient(): typeof supabase {
    return supabase;
  }

  // Verificar si el usuario está autenticado
  async isAuthenticated(): Promise<boolean> {
    return await this.authService.isAuthenticated();
  }

  // Obtener el usuario actual
  async getCurrentUser(): Promise<User | null> {
    return await this.authService.getCurrentUser();
  }

  // Método para iniciar sesión
  signIn(email: string, password: string): Observable<any> {
    return from(supabase.auth.signInWithPassword({
      email,
      password
    }));
  }

  // Método para restablecer contraseña
  resetPassword(email: string): Observable<any> {
    return from(supabase.auth.resetPasswordForEmail(email));
  }
}

