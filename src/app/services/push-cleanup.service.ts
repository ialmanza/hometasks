import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environments';

@Injectable({
  providedIn: 'root'
})
export class PushCleanupService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
  }

  /**
   * Limpia suscripciones con user_id incorrectos (no UUID)
   */
  async cleanupInvalidSubscriptions(): Promise<{
    deleted: number;
    errors: string[];
  }> {
    const result = {
      deleted: 0,
      errors: [] as string[]
    };

    try {
      // Obtener todas las suscripciones
      const { data: subscriptions, error: fetchError } = await this.supabase
        .from('push_subscriptions')
        .select('*');

      if (fetchError) {
        result.errors.push(`Error obteniendo suscripciones: ${fetchError.message}`);
        return result;
      }

      if (!subscriptions) {
        return result;
      }

      // Filtrar suscripciones con user_id que no son UUID válidos
      const invalidSubscriptions = subscriptions.filter(sub => {
        // Verificar si el user_id es un UUID válido
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return !uuidRegex.test(sub.user_id);
      });

      console.log(`Encontradas ${invalidSubscriptions.length} suscripciones con user_id inválido`);

      // Eliminar suscripciones inválidas
      for (const sub of invalidSubscriptions) {
        try {
          const { error } = await this.supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id);

          if (error) {
            result.errors.push(`Error eliminando suscripción ${sub.id}: ${error.message}`);
          } else {
            result.deleted++;
          }
        } catch (error) {
          result.errors.push(`Excepción eliminando suscripción ${sub.id}: ${error}`);
        }
      }

      console.log(`Eliminadas ${result.deleted} suscripciones inválidas`);
    } catch (error) {
      result.errors.push(`Error en limpieza: ${error}`);
    }

    return result;
  }

  /**
   * Verifica la integridad de las suscripciones
   */
  async verifySubscriptionsIntegrity(): Promise<{
    total: number;
    valid: number;
    invalid: number;
    orphaned: number;
    details: any[];
  }> {
    const result = {
      total: 0,
      valid: 0,
      invalid: 0,
      orphaned: 0,
      details: [] as any[]
    };

    try {
      // Obtener todas las suscripciones
      const { data: subscriptions, error } = await this.supabase
        .from('push_subscriptions')
        .select('*');

      if (error) {
        console.error('Error obteniendo suscripciones:', error);
        return result;
      }

      if (!subscriptions) {
        return result;
      }

      result.total = subscriptions.length;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      for (const sub of subscriptions) {
        const isValidUuid = uuidRegex.test(sub.user_id);
        
        if (isValidUuid) {
          result.valid++;
        } else {
          result.invalid++;
          result.details.push({
            id: sub.id,
            user_id: sub.user_id,
            type: 'invalid_uuid',
            endpoint: sub.endpoint
          });
        }
      }

      console.log(`Verificación completada: ${result.valid} válidas, ${result.invalid} inválidas`);
    } catch (error) {
      console.error('Error en verificación:', error);
    }

    return result;
  }

  /**
   * Regenera suscripciones para usuarios autorizados
   */
  async regenerateSubscriptionsForAuthorizedUsers(): Promise<{
    processed: number;
    errors: string[];
  }> {
    const result = {
      processed: 0,
      errors: [] as string[]
    };

    try {
      // Obtener usuarios autorizados
      const { data: authorizedUsers, error: authError } = await this.supabase
        .from('authorized_notification_users')
        .select('*')
        .eq('is_active', true);

      if (authError) {
        result.errors.push(`Error obteniendo usuarios autorizados: ${authError.message}`);
        return result;
      }

      if (!authorizedUsers) {
        return result;
      }

      console.log(`Procesando ${authorizedUsers.length} usuarios autorizados`);

      for (const authorizedUser of authorizedUsers) {
        try {
          // Verificar si ya tiene suscripciones válidas
          // Nota: En una implementación real, necesitarías mapear el email del usuario autorizado
          // con el UUID del usuario autenticado. Por ahora, solo contamos los procesados.
          
          console.log(`Usuario ${authorizedUser.email} marcado para regeneración de suscripciones`);
          result.processed++;

        } catch (error) {
          result.errors.push(`Error procesando usuario ${authorizedUser.email}: ${error}`);
        }
      }
    } catch (error) {
      result.errors.push(`Error en regeneración: ${error}`);
    }

    return result;
  }
} 