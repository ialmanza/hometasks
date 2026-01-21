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
    const { error } = await supabase
      .from('user_security_settings')
      .insert([{ user_id: uid, ...DEFAULT_SETTINGS }]);
    if (error) console.error('Error inserting default settings', error);
  }

  async updateSettings(partial: Partial<UserSecuritySettings>): Promise<void> {
    const userId = await this.getUserId();
    if (!userId) return;
    const { error } = await supabase
      .from('user_security_settings')
      .update({
        ...partial,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);
    if (error) console.error('Error updating security settings', error);
  }

  // Alias para compatibilidad
  async saveSettings(partial: Partial<UserSecuritySettings>): Promise<void> {
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

