import { Injectable } from '@angular/core';
import { SecuritySettingsService, UserSecuritySettings } from './security-settings.service';
import { PinService } from './pin.service';
import { AuthService } from './auth.service';

export interface VerifyPinResult {
  ok: boolean;
  message?: string;
  attemptsLeft?: number;
  lockedUntil?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class PinLockService {
  private readonly UNLOCK_CACHE_KEY = 'lock_session_until';
  private readonly DEFAULT_UNLOCK_TTL_MS = 15 * 60 * 1000; // 15 minutos
  private readonly FIRST_LOCKOUT_ATTEMPTS = 3; // Después de 3 intentos → 30s
  private readonly SECOND_LOCKOUT_ATTEMPTS = 5; // Después de 5 intentos → 1min
  private readonly FIRST_LOCKOUT_SECONDS = 30; // 30 segundos
  private readonly SECOND_LOCKOUT_MINUTES = 1; // 1 minuto

  constructor(
    private settingsService: SecuritySettingsService,
    private pinService: PinService,
    private authService: AuthService
  ) {}

  private isUnlockCacheValid(): boolean {
    const until = localStorage.getItem(this.UNLOCK_CACHE_KEY);
    return !!until && Date.now() < Number(until);
  }

  markUnlocked(ttlMs = this.DEFAULT_UNLOCK_TTL_MS): void {
    const until = Date.now() + ttlMs;
    localStorage.setItem(this.UNLOCK_CACHE_KEY, String(until));
  }

  clearUnlockCache(): void {
    localStorage.removeItem(this.UNLOCK_CACHE_KEY);
  }

  private async ensureSettings(): Promise<UserSecuritySettings | null> {
    const settings = await this.settingsService.getSettings();
    return settings;
  }

  async isLockRequired(): Promise<boolean> {
    const session = await this.authService.hasLocalSession();
    if (!session) return false;
    if (this.isUnlockCacheValid()) return false;

    const settings = await this.ensureSettings();
    if (!settings) return false;
    if (!settings.lock_enabled || !settings.pin_hash || !settings.pin_salt) return false;

    if (settings.locked_until) {
      const lockedUntil = new Date(settings.locked_until).getTime();
      if (lockedUntil > Date.now()) return true;
    }
    return true;
  }

  async verifyPin(pin: string): Promise<VerifyPinResult> {
    const settings = await this.ensureSettings();
    if (!settings) return { ok: false, message: 'Sin configuración' };
    if (!settings.pin_hash || !settings.pin_salt) {
      return { ok: false, message: 'PIN no configurado' };
    }

    const now = Date.now();
    if (settings.locked_until && new Date(settings.locked_until).getTime() > now) {
      return {
        ok: false,
        message: 'Bloqueado temporalmente',
        lockedUntil: settings.locked_until
      };
    }

    const match = await this.pinService.verifyPin(pin, settings.pin_salt, settings.pin_hash);
    if (!match) {
      const attempts = (settings.failed_attempts || 0) + 1;
      let locked_until: string | null = null;
      let resetAttempts = false;

      // Después de 3 intentos → bloqueo 30s
      if (attempts >= this.FIRST_LOCKOUT_ATTEMPTS && attempts < this.SECOND_LOCKOUT_ATTEMPTS) {
        locked_until = new Date(now + this.FIRST_LOCKOUT_SECONDS * 1000).toISOString();
      }
      // Después de 5 intentos → bloqueo 1min
      else if (attempts >= this.SECOND_LOCKOUT_ATTEMPTS) {
        locked_until = new Date(now + this.SECOND_LOCKOUT_MINUTES * 60 * 1000).toISOString();
        resetAttempts = true;
      }

      await this.settingsService.updateSettings({
        failed_attempts: resetAttempts ? 0 : attempts,
        locked_until
      });

      const attemptsLeft = Math.max(0, this.SECOND_LOCKOUT_ATTEMPTS - attempts);
      return {
        ok: false,
        attemptsLeft,
        lockedUntil: locked_until,
        message: locked_until 
          ? 'Demasiados intentos. Bloqueado temporalmente.' 
          : `PIN incorrecto. Te quedan ${attemptsLeft} ${attemptsLeft === 1 ? 'intento' : 'intentos'}.`
      };
    }

    await this.settingsService.updateSettings({
      failed_attempts: 0,
      locked_until: null
    });
    this.markUnlocked();
    return { ok: true };
  }
}

