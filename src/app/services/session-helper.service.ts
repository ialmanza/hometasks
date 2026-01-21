import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { SecuritySettingsService, UserSecuritySettings } from './security-settings.service';
import { supabase } from './Supabase-Client/supabase-client';

export interface SessionCheckResult {
  hasSession: boolean;
  hasLocalSession: boolean;
  hasSupabaseSession: boolean;
  userId: string | null;
  error?: string;
}

export interface PinCheckResult {
  hasPinConfigured: boolean;
  settings: UserSecuritySettings | null;
  error?: string;
}

export interface SessionAndPinResult {
  session: SessionCheckResult;
  pin: PinCheckResult;
  shouldShowLock: boolean;
  shouldShowLogin: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SessionHelperService {
  private readonly NETWORK_TIMEOUT = 5000; // 5 segundos
  private readonly CACHE_DURATION = 30000; // 30 segundos
  
  // Cache para evitar llamadas redundantes
  private sessionCache: { result: SessionCheckResult; timestamp: number } | null = null;
  private pinCache: { result: PinCheckResult; timestamp: number; userId: string } | null = null;

  constructor(
    private authService: AuthService,
    private securitySettingsService: SecuritySettingsService
  ) {}

  /**
   * Verifica si hay una sesión válida (local o de Supabase)
   * Con cache para evitar llamadas redundantes
   */
  async checkSession(useCache: boolean = true): Promise<SessionCheckResult> {
    // Verificar cache si está habilitado
    if (useCache && this.sessionCache) {
      const age = Date.now() - this.sessionCache.timestamp;
      if (age < this.CACHE_DURATION) {
        this.log('Session check: usando cache', this.sessionCache.result);
        return this.sessionCache.result;
      }
    }

    try {
      // Verificar sesión local primero (más rápido)
      const hasLocalSession = await this.authService.hasLocalSession();
      
      let hasSupabaseSession = false;
      let userId: string | null = null;
      let error: string | undefined;

      // Si no hay sesión local, verificar sesión de Supabase
      if (!hasLocalSession) {
        try {
          const sessionResult = await Promise.race([
            supabase.auth.getSession(),
            this.createTimeoutPromise(this.NETWORK_TIMEOUT)
          ]) as any;

          if (sessionResult?.data?.session?.user) {
            hasSupabaseSession = true;
            userId = sessionResult.data.session.user.id;
            this.log('Session check: sesión de Supabase encontrada', { userId });
          } else {
            this.log('Session check: no hay sesión de Supabase');
          }
        } catch (sessionError: any) {
          error = sessionError?.message || 'Error verificando sesión de Supabase';
          this.log('Session check: error verificando Supabase', error);
        }
      } else {
        // Si hay sesión local, obtener userId
        userId = await this.authService.getCurrentUserId();
        this.log('Session check: sesión local encontrada', { userId });
      }

      const result: SessionCheckResult = {
        hasSession: hasLocalSession || hasSupabaseSession,
        hasLocalSession,
        hasSupabaseSession,
        userId,
        error
      };

      // Guardar en cache
      if (useCache) {
        this.sessionCache = {
          result,
          timestamp: Date.now()
        };
      }

      return result;
    } catch (error: any) {
      const errorMessage = error?.message || 'Error desconocido verificando sesión';
      this.log('Session check: error general', errorMessage);
      
      const result: SessionCheckResult = {
        hasSession: false,
        hasLocalSession: false,
        hasSupabaseSession: false,
        userId: null,
        error: errorMessage
      };

      return result;
    }
  }

  /**
   * Verifica si el usuario tiene PIN configurado
   * Con cache para evitar llamadas redundantes
   */
  async checkPinConfigured(userId?: string | null, useCache: boolean = true): Promise<PinCheckResult> {
    // Si no se proporciona userId, obtenerlo de la sesión
    if (!userId) {
      const sessionResult = await this.checkSession(useCache);
      if (!sessionResult.hasSession) {
        return {
          hasPinConfigured: false,
          settings: null,
          error: 'No hay sesión válida'
        };
      }
      userId = sessionResult.userId;
    }

    if (!userId) {
      return {
        hasPinConfigured: false,
        settings: null,
        error: 'No se pudo obtener userId'
      };
    }

    // Verificar cache si está habilitado y es para el mismo usuario
    if (useCache && this.pinCache && this.pinCache.userId === userId) {
      const age = Date.now() - this.pinCache.timestamp;
      if (age < this.CACHE_DURATION) {
        this.log('PIN check: usando cache', { userId, hasPin: this.pinCache.result.hasPinConfigured });
        return this.pinCache.result;
      }
    }

    try {
      const settings = await Promise.race([
        this.securitySettingsService.getSettings(),
        this.createTimeoutPromise(this.NETWORK_TIMEOUT)
      ]) as UserSecuritySettings | null;

      const hasPinConfigured = !!(settings && settings.pin_hash && settings.pin_salt);

      const result: PinCheckResult = {
        hasPinConfigured,
        settings,
        error: settings ? undefined : 'No se pudieron obtener settings'
      };

      this.log('PIN check: resultado', { userId, hasPinConfigured });

      // Guardar en cache
      if (useCache) {
        this.pinCache = {
          result,
          timestamp: Date.now(),
          userId
        };
      }

      return result;
    } catch (error: any) {
      const errorMessage = error?.message || 'Error desconocido verificando PIN';
      this.log('PIN check: error', errorMessage);
      
      return {
        hasPinConfigured: false,
        settings: null,
        error: errorMessage
      };
    }
  }

  /**
   * Verifica sesión y PIN en una sola llamada
   * Determina si debe mostrar lock screen o login
   */
  async checkSessionAndPin(useCache: boolean = true): Promise<SessionAndPinResult> {
    const session = await this.checkSession(useCache);
    
    let pin: PinCheckResult = {
      hasPinConfigured: false,
      settings: null
    };

    if (session.hasSession && session.userId) {
      pin = await this.checkPinConfigured(session.userId, useCache);
    }

    // Determinar qué pantalla mostrar
    const shouldShowLock = session.hasSession && pin.hasPinConfigured;
    const shouldShowLogin = !session.hasSession || (!pin.hasPinConfigured && session.hasSession);

    this.log('SessionAndPin check: resultado', {
      hasSession: session.hasSession,
      hasPin: pin.hasPinConfigured,
      shouldShowLock,
      shouldShowLogin
    });

    return {
      session,
      pin,
      shouldShowLock,
      shouldShowLogin
    };
  }

  /**
   * Limpia el cache de sesión y PIN
   * Útil cuando cambia el estado de autenticación
   */
  clearCache(): void {
    this.sessionCache = null;
    this.pinCache = null;
    this.log('Cache limpiado');
  }

  /**
   * Limpia solo el cache de PIN
   * Útil cuando se configura o cambia el PIN
   */
  clearPinCache(): void {
    this.pinCache = null;
    this.log('Cache de PIN limpiado');
  }

  /**
   * Crea una promesa que se rechaza después del timeout
   */
  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout después de ${timeout}ms`)), timeout);
    });
  }

  /**
   * Log para debugging (solo en desarrollo)
   */
  private log(message: string, data?: any): void {
    if (typeof window !== 'undefined' && (window as any).__DEV__) {
      console.log(`[SessionHelper] ${message}`, data || '');
    }
  }
}

