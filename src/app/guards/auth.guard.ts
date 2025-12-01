import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  private authCache: { isAuthenticated: boolean; timestamp: number } | null = null;
  private readonly CACHE_DURATION = 30000; // 30 segundos

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  async canActivate(): Promise<boolean> {
    // Verificar caché
    if (this.authCache && (Date.now() - this.authCache.timestamp) < this.CACHE_DURATION) {
      if (!this.authCache.isAuthenticated) {
        this.router.navigate(['/login']);
        return false;
      }
      return true;
    }

    // Si no hay caché o expiró, verificar autenticación
    const isAuthenticated = await this.authService.isAuthenticated();
    
    // Actualizar caché
    this.authCache = {
      isAuthenticated,
      timestamp: Date.now()
    };
    
    if (!isAuthenticated) {
      // Redirigir al login si no está autenticado
      this.router.navigate(['/login']);
      return false;
    }
    
    return true;
  }

  /**
   * Limpia el caché de autenticación. Útil cuando el usuario hace logout.
   */
  clearCache(): void {
    this.authCache = null;
  }
} 