import { Injectable } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { BehaviorSubject, Observable } from 'rxjs';

export interface UpdateAvailableEvent {
  type: 'UPDATE_AVAILABLE';
  current: { hash: string };
  available: { hash: string };
}

@Injectable({
  providedIn: 'root'
})
export class AppUpdateService {
  private updateAvailableSubject = new BehaviorSubject<UpdateAvailableEvent | null>(null);
  public updateAvailable$: Observable<UpdateAvailableEvent | null> = this.updateAvailableSubject.asObservable();

  constructor(private swUpdate: SwUpdate) {
    this.initializeUpdateChecks();
  }

  private initializeUpdateChecks() {
    // Verificar actualizaciones cada 6 horas
    setInterval(() => {
      this.checkForUpdates();
    }, 6 * 60 * 60 * 1000);

    // Verificar actualizaciones al iniciar la app
    this.checkForUpdates();

    // Escuchar eventos de actualización
    this.swUpdate.versionUpdates.subscribe(event => {
      console.log('Evento de actualización:', event);
      
      if (event.type === 'VERSION_READY') {
        console.log('Nueva versión disponible:', event.latestVersion);
        this.updateAvailableSubject.next({
          type: 'UPDATE_AVAILABLE',
          current: event.currentVersion,
          available: event.latestVersion
        });
      } else if (event.type === 'VERSION_INSTALLATION_FAILED') {
        console.error('Error instalando nueva versión:', event);
      }
    });

    // Escuchar eventos de activación
    this.swUpdate.activated.subscribe(event => {
      console.log('Nueva versión activada:', event);
      // Recargar la página para aplicar la nueva versión
      window.location.reload();
    });
  }

  async checkForUpdates(): Promise<void> {
    try {
      if (this.swUpdate.isEnabled) {
        const updateFound = await this.swUpdate.checkForUpdate();
        console.log('Verificación de actualizaciones:', updateFound);
      }
    } catch (error) {
      console.error('Error verificando actualizaciones:', error);
    }
  }

  async activateUpdate(): Promise<void> {
    try {
      await this.swUpdate.activateUpdate();
      console.log('Actualización activada');
      // La página se recargará automáticamente
    } catch (error) {
      console.error('Error activando actualización:', error);
    }
  }

  // Método para forzar la actualización
  async forceUpdate(): Promise<void> {
    try {
      await this.activateUpdate();
      window.location.reload();
    } catch (error) {
      console.error('Error forzando actualización:', error);
    }
  }

  // Método para mostrar notificación de actualización
  showUpdateNotification(): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('Actualización Disponible', {
        body: 'Hay una nueva versión de Hometasks disponible. ¿Deseas actualizar ahora?',
        icon: '/icons/icono angular/icon-192x192.png',
        tag: 'app-update',
        requireInteraction: true,
        actions: [
          {
            action: 'update',
            title: 'Actualizar'
          },
          {
            action: 'later',
            title: 'Más tarde'
          }
        ]
      });

      notification.onclick = () => {
        this.activateUpdate();
      };

      // Auto-cerrar después de 30 segundos
      setTimeout(() => {
        notification.close();
      }, 30000);
    }
  }

  // Método para verificar si hay actualizaciones pendientes
  hasUpdateAvailable(): boolean {
    return this.updateAvailableSubject.value !== null;
  }

  // Método para limpiar el estado de actualización
  clearUpdateState(): void {
    this.updateAvailableSubject.next(null);
  }
} 