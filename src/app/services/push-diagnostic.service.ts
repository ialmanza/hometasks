import { Injectable, inject } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environments';
import { AuthorizedUsersService } from './authorized-users.service';
import { PushNotificationService } from './push-notification.service';

@Injectable({
  providedIn: 'root'
})
export class PushDiagnosticService {
  private supabase: SupabaseClient;
  private pushNotificationService = inject(PushNotificationService);

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
    userEmail?: string;
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
      userEmail?: string;
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
      errors: [],
      userEmail: undefined
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
      diagnostic.userEmail = user?.email;
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
   * Si no se pasa email, usa el usuario autenticado
   */
  async canSendPushNotification(email?: string): Promise<{
    canSend: boolean;
    reasons: string[];
  }> {
    const reasons: string[] = [];
    let canSend = true;

    try {
      // Obtener el UUID del usuario autenticado primero
      const { data: { user } } = await this.supabase.auth.getUser();
      
      if (!user?.id) {
        canSend = false;
        reasons.push('Usuario no autenticado');
        return { canSend, reasons };
      }

      // Si no se pasa email, usar el del usuario autenticado
      const emailToCheck = email || user.email;
      
      if (!emailToCheck) {
        canSend = false;
        reasons.push('No se puede determinar el email del usuario');
        return { canSend, reasons };
      }

      // Verificar si el usuario está autorizado
      const authorizedUser = await this.authorizedUsersService.isUserAuthorized(emailToCheck);
      if (!authorizedUser) {
        canSend = false;
        reasons.push(`Usuario ${emailToCheck} no está autorizado`);
      } else {
        // Verificar preferencias de notificación
        if (!authorizedUser.notification_preferences?.push) {
          canSend = false;
          reasons.push('Notificaciones push deshabilitadas');
        }

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
    } catch (error) {
      canSend = false;
      reasons.push(`Error verificando usuario: ${error}`);
    }

    return { canSend, reasons };
  }

  /**
   * Probar envío de notificación push
   * Si no se pasa email, usa el usuario autenticado
   */
  async testPushNotification(testMessage?: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // Obtener usuario autenticado
      const { data: { user } } = await this.supabase.auth.getUser();
      
      if (!user?.email) {
        return {
          success: false,
          message: 'Usuario no autenticado. Por favor, inicia sesión.'
        };
      }

      // Verificar si puede enviar notificación
      const { canSend, reasons } = await this.canSendPushNotification(user.email);
      
      if (!canSend) {
        return {
          success: false,
          message: `No se puede enviar notificación: ${reasons.join(', ')}`
        };
      }

      // Obtener suscripciones del usuario
      const { data: subscriptions } = await this.supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', user.id);

      if (!subscriptions || subscriptions.length === 0) {
        return {
          success: false,
          message: 'No hay suscripciones push registradas'
        };
      }

      // Enviar notificación de prueba usando el servicio
      const message = testMessage?.trim() || 'Esta es una notificación de prueba';
      
      // Enviar notificación usando el método del servicio que envía al usuario por email
      await this.pushNotificationService.sendPushNotificationToUserByEmail(user.email, {
        title: 'Prueba de Notificación',
        body: message,
        icon: '/icons/icono angular/icon-192x192.png',
        badge: '/icons/icono angular/icon-72x72.png',
        tag: 'test-notification',
        data: {
          type: 'test',
          timestamp: new Date().toISOString()
        }
      });

      return {
        success: true,
        message: `Notificación de prueba enviada a ${user.email}. Deberías verla en tu dispositivo.`
      };
    } catch (error) {
      return {
        success: false,
        message: `Error en prueba: ${error}`
      };
    }
  }
} 