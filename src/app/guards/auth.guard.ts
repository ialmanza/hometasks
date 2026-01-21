import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { PinLockService } from '../services/pin-lock.service';
import { SecuritySettingsService } from '../services/security-settings.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  private authCache: { isAuthenticated: boolean; timestamp: number } | null = null;
  private readonly CACHE_DURATION = 30000; // 30 segundos
  private readonly NETWORK_TIMEOUT = 10000; // 10 segundos para timeout de red

  constructor(
    private authService: AuthService,
    private router: Router,
    private pinLockService: PinLockService,
    private securitySettingsService: SecuritySettingsService
  ) {}

  async canActivate(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> {
    // Verificar caché
    if (this.authCache && (Date.now() - this.authCache.timestamp) < this.CACHE_DURATION) {
      if (!this.authCache.isAuthenticated) {
        this.router.navigate(['/login']);
        return false;
      }
      return true;
    }

    try {
      // Verificar primero la sesión local (más rápido y no requiere red)
      const hasLocalSession = await this.authService.hasLocalSession();
      
      // Si no hay sesión local, redirigir inmediatamente al login
      if (!hasLocalSession) {
        this.authCache = {
          isAuthenticated: false,
          timestamp: Date.now()
        };
        this.router.navigate(['/login']);
        return false;
      }

      // Si hay sesión local, verificar con el servidor (con timeout)
      const isAuthenticated = await Promise.race([
        this.authService.isAuthenticated(),
        this.createTimeoutPromise(this.NETWORK_TIMEOUT)
      ]);
      
      // Actualizar caché
      this.authCache = {
        isAuthenticated: isAuthenticated as boolean,
        timestamp: Date.now()
      };
      
      if (!isAuthenticated) {
        // Redirigir al login si no está autenticado
        this.router.navigate(['/login']);
        return false;
      }

      // Verificación de bloqueo por PIN (solo si el usuario lo tiene configurado)
      const needsLock = await this.pinLockService.isLockRequired();
      if (needsLock) {
        this.router.navigate(['/lock'], { queryParams: { returnUrl: state.url } });
        return false;
      }

      // Verificar si el usuario tiene PIN configurado
      // Si NO tiene PIN configurado y NO está en settings, redirigir a settings para configurarlo
      if (state.url !== '/settings' && !state.url.startsWith('/settings')) {
        const settings = await this.securitySettingsService.getSettings();
        const hasPinConfigured = settings && settings.pin_hash && settings.pin_salt;
        
        if (!hasPinConfigured) {
          // Redirigir a settings con query params para abrir modal y guardar returnUrl
          this.router.navigate(['/settings'], { 
            queryParams: { setupPin: 'true', returnUrl: state.url } 
          });
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error en AuthGuard:', error);
      
      // En caso de error de red, verificar sesión local como fallback
      const hasLocalSession = await this.authService.hasLocalSession();
      
      if (hasLocalSession) {
        // Si hay sesión local, permitir acceso (modo offline)
        console.warn('Error de red, pero hay sesión local. Permitiendo acceso.');
        this.authCache = {
          isAuthenticated: true,
          timestamp: Date.now()
        };
        return true;
      }
      
      // Si no hay sesión local, redirigir al login
      this.authCache = {
        isAuthenticated: false,
        timestamp: Date.now()
      };
      this.router.navigate(['/login']);
      return false;
    }
  }

  /**
   * Crea una promesa que se rechaza después del timeout
   */
  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout de red')), timeout);
    });
  }

  /**
   * Limpia el caché de autenticación. Útil cuando el usuario hace logout.
   */
  clearCache(): void {
    this.authCache = null;
  }
} 