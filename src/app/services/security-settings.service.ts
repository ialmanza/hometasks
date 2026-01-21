import { Injectable } from '@angular/core';
import { supabase } from './Supabase-Client/supabase-client';
import { AuthService } from './auth.service';

export interface UserSecuritySettings {
  user_id: string;
  pin_hash: string | null;
  pin_salt: string | null;
  biometric_key_id: string | null;
  biometric_enabled: boolean;
  lock_enabled: boolean;
  failed_attempts: number;
  locked_until: string | null;
  require_biometric: boolean;
  updated_at?: string | null;
}

const DEFAULT_SETTINGS: Omit<UserSecuritySettings, 'user_id'> = {
  pin_hash: null,
  pin_salt: null,
  biometric_key_id: null,
  biometric_enabled: false,
  lock_enabled: false,
  failed_attempts: 0,
  locked_until: null,
  require_biometric: false,
  updated_at: null
};

@Injectable({
  providedIn: 'root'
})
export class SecuritySettingsService {
  constructor(private authService: AuthService) {}

  private async getUserId(): Promise<string | null> {
    return await this.authService.getCurrentUserId();
  }

  async getSettings(): Promise<UserSecuritySettings | null> {
    const userId = await this.getUserId();
    if (!userId) return null;

    const { data, error } = await supabase
      .from('user_security_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching security settings', error);
      return null;
    }

    if (!data) {
      await this.createDefaults(userId);
      return {
        user_id: userId,
        ...DEFAULT_SETTINGS
      };
    }

    return data as UserSecuritySettings;
  }

  async createDefaults(userId?: string): Promise<void> {
    const uid = userId || (await this.getUserId());
    if (!uid) return;
    
    // Verificar si ya existe el registro antes de insertar
    const existing = await supabase
      .from('user_security_settings')
      .select('user_id')
      .eq('user_id', uid)
      .maybeSingle();
    
    if (existing.data) {
      // El registro ya existe, no hacer nada
      return;
    }
    
    // Insertar solo con user_id primero (columna obligatoria)
    // Las demás columnas se pueden agregar después con update
    const { error } = await supabase
      .from('user_security_settings')
      .insert([{ user_id: uid }]);
    
    if (error) {
      // Si el error es de duplicado, ignorarlo (puede ocurrir en condiciones de carrera)
      if (error.code === '23505') { // PostgreSQL unique violation
        console.warn('El registro ya existe (condición de carrera)', error);
        return;
      }
      console.error('Error inserting default settings', error);
      throw new Error(`Error al crear configuración por defecto: ${error.message}`);
    }
  }

  async updateSettings(partial: Partial<UserSecuritySettings>): Promise<void> {
    const userId = await this.getUserId();
    if (!userId) {
      throw new Error('Usuario no autenticado');
    }
    
    // Verificar si el registro existe, si no existe, crearlo primero
    const existing = await this.getSettings();
    if (!existing) {
      await this.createDefaults(userId);
    }
    
    // Filtrar solo las columnas que realmente se están actualizando (evitar columnas que no existen)
    // No incluir columnas opcionales que pueden no existir en el schema
    const updateData: any = { ...partial };
    
    // Intentar actualizar (incluir updated_at si existe)
    let updatePayload = { ...updateData };
    
    // Solo incluir updated_at si no causa problemas (lo intentamos primero sin él si falla)
    const { error, data } = await supabase
      .from('user_security_settings')
      .update(updatePayload)
      .eq('user_id', userId)
      .select();
    
    if (error) {
      // Si el error es por columna no encontrada, intentar sin updated_at
      if (error.message?.includes('column') && error.message?.includes('not found')) {
        // Remover updated_at si estaba incluido y reintentar
        delete updatePayload.updated_at;
        const { error: retryError, data: retryData } = await supabase
          .from('user_security_settings')
          .update(updatePayload)
          .eq('user_id', userId)
          .select();
        
        if (retryError) {
          console.error('Error updating security settings', retryError);
          throw new Error(`Error al actualizar configuración de seguridad: ${retryError.message}`);
        }
        
        // Verificar que se actualizó al menos una fila
        if (!retryData || retryData.length === 0) {
          throw new Error('No se pudo actualizar la configuración de seguridad');
        }
        return;
      }
      
      console.error('Error updating security settings', error);
      throw new Error(`Error al actualizar configuración de seguridad: ${error.message}`);
    }
    
    // Verificar que se actualizó al menos una fila
    if (!data || data.length === 0) {
      console.warn('No se actualizó ninguna fila en user_security_settings');
      // Intentar crear el registro si no existe
      await this.createDefaults(userId);
      // Intentar actualizar nuevamente (sin updated_at esta vez)
      delete updatePayload.updated_at;
      const { error: retryError } = await supabase
        .from('user_security_settings')
        .update(updatePayload)
        .eq('user_id', userId);
      
      if (retryError) {
        console.error('Error en segundo intento de actualización', retryError);
        throw new Error(`Error al guardar configuración de seguridad: ${retryError.message}`);
      }
    }
  }

  // Alias para compatibilidad
  async saveSettings(partial: Partial<UserSecuritySettings>): Promise<void> {
    // Asegurar que el registro existe antes de actualizar
    const userId = await this.getUserId();
    if (!userId) {
      throw new Error('Usuario no autenticado');
    }
    
    // Verificar si el registro existe
    const existing = await this.getSettings();
    if (!existing) {
      // Crear registro con valores por defecto y luego actualizar con los valores proporcionados
      await this.createDefaults(userId);
    }
    
    // Actualizar el registro
    return this.updateSettings(partial);
  }

  async getLockState(): Promise<{
    isLocked: boolean;
    failedAttempts: number;
    lockedUntil: Date | null;
    canAttempt: boolean;
  }> {
    const settings = await this.getSettings();
    if (!settings) {
      return {
        isLocked: false,
        failedAttempts: 0,
        lockedUntil: null,
        canAttempt: true
      };
    }

    const now = new Date();
    const lockedUntil = settings.locked_until ? new Date(settings.locked_until) : null;
    const canAttempt = !lockedUntil || lockedUntil <= now;

    return {
      isLocked: !canAttempt,
      failedAttempts: settings.failed_attempts || 0,
      lockedUntil,
      canAttempt
    };
  }

  async incrementFailedAttempts(): Promise<void> {
    const settings = await this.getSettings();
    if (!settings) return;

    const attempts = (settings.failed_attempts || 0) + 1;
    const FIRST_LOCKOUT_ATTEMPTS = 3; // Después de 3 intentos → 30s
    const SECOND_LOCKOUT_ATTEMPTS = 5; // Después de 5 intentos → 1min
    const FIRST_LOCKOUT_SECONDS = 30; // 30 segundos
    const SECOND_LOCKOUT_MINUTES = 1; // 1 minuto

    const now = Date.now();
    let locked_until: string | null = null;
    let resetAttempts = false;

    // Después de 3 intentos → bloqueo 30s
    if (attempts >= FIRST_LOCKOUT_ATTEMPTS && attempts < SECOND_LOCKOUT_ATTEMPTS) {
      locked_until = new Date(now + FIRST_LOCKOUT_SECONDS * 1000).toISOString();
    }
    // Después de 5 intentos → bloqueo 1min
    else if (attempts >= SECOND_LOCKOUT_ATTEMPTS) {
      locked_until = new Date(now + SECOND_LOCKOUT_MINUTES * 60 * 1000).toISOString();
      resetAttempts = true;
    }

    await this.updateSettings({
      failed_attempts: resetAttempts ? 0 : attempts,
      locked_until
    });
  }

  async resetFailedAttempts(): Promise<void> {
    await this.updateSettings({
      failed_attempts: 0,
      locked_until: null
    });
  }

  async initializeDefaultSettings(): Promise<UserSecuritySettings | null> {
    const userId = await this.getUserId();
    if (!userId) return null;

    const existing = await this.getSettings();
    if (existing) return existing;

    await this.createDefaults(userId);
    return await this.getSettings();
  }
}

