import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environments';
import { AuthorizedUsersService } from './authorized-users.service';

@Injectable({
  providedIn: 'root'
})
export class PushDiagnosticService {
  private supabase: SupabaseClient;

  constructor(private authorizedUsersService: AuthorizedUsersService) {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
  }

  /**
   * Diagnóstico completo del sistema de notificaciones push
   */
  async runDiagnostic(): Promise<{
    browserSupport: boolean;
    serviceWorker: boolean;
    permissions: string;
    vapidConfig: boolean;
    userAuth: boolean;
    userAuthorized: boolean;
    pushPreferences: boolean;
    subscriptions: any[];
    authorizedUsers: any[];
    errors: string[];
  }> {
    const diagnostic: {
      browserSupport: boolean;
      serviceWorker: boolean;
      permissions: string;
      vapidConfig: boolean;
      userAuth: boolean;
      userAuthorized: boolean;
      pushPreferences: boolean;
      subscriptions: any[];
      authorizedUsers: any[];
      errors: string[];
    } = {
      browserSupport: false,
      serviceWorker: false,
      permissions: 'denied',
      vapidConfig: false,
      userAuth: false,
      userAuthorized: false,
      pushPreferences: false,
      subscriptions: [],
      authorizedUsers: [],
      errors: []
    };

    try {
      // 1. Verificar soporte del navegador
      diagnostic.browserSupport = 'PushManager' in window && 'serviceWorker' in navigator;
      console.log('✅ Soporte del navegador:', diagnostic.browserSupport);

      // 2. Verificar Service Worker
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        diagnostic.serviceWorker = !!registration;
        console.log('✅ Service Worker registrado:', diagnostic.serviceWorker);
      }

      // 3. Verificar permisos
      if ('Notification' in window) {
        diagnostic.permissions = Notification.permission;
        console.log('✅ Permisos de notificación:', diagnostic.permissions);
      }

      // 4. Verificar configuración VAPID
      diagnostic.vapidConfig = !!(environment.vapidPublicKey && environment.vapidPrivateKey);
      console.log('✅ Configuración VAPID:', diagnostic.vapidConfig);

      // 5. Verificar usuario autenticado
      const { data: { user } } = await this.supabase.auth.getUser();
      diagnostic.userAuth = !!user;
      console.log('✅ Usuario autenticado:', diagnostic.userAuth, user?.email);

      // 6. Verificar usuario autorizado
      if (user?.email) {
        const authorizedUser = await this.authorizedUsersService.isUserAuthorized(user.email);
        diagnostic.userAuthorized = !!authorizedUser;
        console.log('✅ Usuario autorizado:', diagnostic.userAuthorized, authorizedUser?.name);

        if (authorizedUser) {
          diagnostic.pushPreferences = authorizedUser.notification_preferences?.push || false;
          console.log('✅ Preferencias push habilitadas:', diagnostic.pushPreferences);
        }
      }

      // 7. Obtener suscripciones
      if (user) {
        const { data: subscriptions, error } = await this.supabase
          .from('push_subscriptions')
          .select('*')
          .eq('user_id', user.id); // Usar el UUID de auth.users

        if (error) {
          diagnostic.errors.push(`Error obteniendo suscripciones: ${error.message}`);
        } else {
          diagnostic.subscriptions = subscriptions || [];
          console.log('✅ Suscripciones encontradas:', diagnostic.subscriptions.length);
        }
      }

      // 8. Obtener usuarios autorizados
      try {
        diagnostic.authorizedUsers = await this.authorizedUsersService.getAuthorizedUsers();
        console.log('✅ Usuarios autorizados:', diagnostic.authorizedUsers.length);
      } catch (error) {
        diagnostic.errors.push(`Error obteniendo usuarios autorizados: ${error}`);
      }

    } catch (error) {
      diagnostic.errors.push(`Error en diagnóstico: ${error}`);
    }

    return diagnostic;
  }

  /**
   * Verificar si una notificación push puede ser enviada
   */
  async canSendPushNotification(email: string): Promise<{
    canSend: boolean;
    reasons: string[];
  }> {
    const reasons: string[] = [];
    let canSend = true;

    try {
      // Verificar si el usuario está autorizado
      const authorizedUser = await this.authorizedUsersService.isUserAuthorized(email);
      if (!authorizedUser) {
        canSend = false;
        reasons.push('Usuario no autorizado');
      } else {
        // Verificar preferencias de notificación
        if (!authorizedUser.notification_preferences?.push) {
          canSend = false;
          reasons.push('Notificaciones push deshabilitadas');
        }

        // Obtener el UUID del usuario autenticado
        const { data: { user } } = await this.supabase.auth.getUser();
        
        if (!user?.id) {
          canSend = false;
          reasons.push('Usuario no autenticado');
        } else {
          // Verificar si tiene suscripciones usando el UUID correcto
          const { data: subscriptions, error } = await this.supabase
            .from('push_subscriptions')
            .select('*')
            .eq('user_id', user.id); // Usar el UUID de auth.users

          if (error) {
            canSend = false;
            reasons.push(`Error obteniendo suscripciones: ${error.message}`);
          } else if (!subscriptions || subscriptions.length === 0) {
            canSend = false;
            reasons.push('No hay suscripciones push registradas');
          }
        }
      }
    } catch (error) {
      canSend = false;
      reasons.push(`Error verificando usuario: ${error}`);
    }

    return { canSend, reasons };
  }

  /**
   * Probar envío de notificación push
   */
  async testPushNotification(email: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const { canSend, reasons } = await this.canSendPushNotification(email);
      
      if (!canSend) {
        return {
          success: false,
          message: `No se puede enviar notificación: ${reasons.join(', ')}`
        };
      }

      // Aquí podrías implementar un envío de prueba real
      // Por ahora solo verificamos que todo esté configurado correctamente
      return {
        success: true,
        message: 'Sistema de notificaciones push configurado correctamente'
      };
    } catch (error) {
      return {
        success: false,
        message: `Error en prueba: ${error}`
      };
    }
  }
} 