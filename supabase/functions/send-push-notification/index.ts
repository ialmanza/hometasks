import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as webPush from 'https://esm.sh/web-push@3.6.6'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

// Initialize Supabase client with service role key (required for admin operations)
const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('SUPABASE_PROJECT_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    })
  }

  try {
    // Verificar que las variables de entorno estén configuradas
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error: Missing environment variables' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const body = await req.json()

    // Modo 1: Webhook desde base de datos (nueva tarea creada)
    if (body.type === 'INSERT' && body.table === 'task_notifications' && body.record) {
      console.log('📨 Webhook recibido: Nueva tarea creada', body.record)
      await sendNotificationForNewTask(body.record)
      return new Response(
        JSON.stringify({ success: true, message: 'Notifications sent for new task' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Modo 2: Envío directo de notificación (desde cliente)
    const { subscription, payload } = body

    if (!subscription || !payload) {
      return new Response(
        JSON.stringify({ error: 'Missing subscription or payload' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Enviar notificación push
    const result = await sendPushNotification(subscription, payload)
    
    if (result.success) {
      return new Response(
        JSON.stringify({ success: true, message: 'Notification sent successfully' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } else {
      return new Response(
        JSON.stringify({ error: result.error, status: result.status }),
        { 
          status: result.status || 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('❌ Error in send-push-notification:', error)
    const errorMsg = error instanceof Error ? error.message : String(error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMsg }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

/**
 * Envía notificaciones push cuando se crea una nueva tarea
 */
async function sendNotificationForNewTask(task: any) {
  try {
    console.log('🔔 Enviando notificaciones para nueva tarea:', task.title)

    // Obtener todos los usuarios autorizados con notificaciones push habilitadas
    const { data: authorizedUsers, error: usersError } = await supabase
      .from('authorized_notification_users')
      .select('*')
      .eq('is_active', true)

    if (usersError) {
      console.error('Error obteniendo usuarios autorizados:', usersError)
      return
    }

    if (!authorizedUsers || authorizedUsers.length === 0) {
      console.log('No hay usuarios autorizados')
      return
    }

    // Para cada usuario autorizado, obtener sus suscripciones y enviar notificación
    for (const user of authorizedUsers) {
      // Verificar preferencias de notificación
      if (!user.notification_preferences?.push) {
        console.log(`Usuario ${user.email} no tiene push habilitado`)
        continue
      }

      // Obtener el user_id de auth.users usando el email
      // Nota: admin.getUserByEmail requiere service role key
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserByEmail(user.email)
      
      if (authError) {
        console.error(`Error obteniendo usuario autenticado para ${user.email}:`, authError)
        continue
      }
      
      if (!authUser?.user?.id) {
        console.log(`No se encontró usuario autenticado para ${user.email}`)
        continue
      }

      // Obtener suscripciones push del usuario
      const { data: subscriptions, error: subError } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', authUser.user.id)

      if (subError) {
        console.error(`Error obteniendo suscripciones para ${user.email}:`, subError)
        continue
      }

      if (!subscriptions || subscriptions.length === 0) {
        console.log(`No hay suscripciones para ${user.email}`)
        continue
      }

      // Crear payload de notificación
      const notificationPayload = JSON.stringify({
        title: 'Nueva Tarea Creada',
        body: `${task.title}${task.description ? ' - ' + task.description : ''}`,
        icon: '/icons/icono angular/icon-192x192.png',
        badge: '/icons/icono angular/icon-72x72.png',
        tag: `task-${task.id}`,
        data: {
          type: 'task',
          taskId: task.id,
          title: task.title,
          description: task.description
        }
      })

      // Enviar notificación a cada suscripción
      for (const sub of subscriptions) {
        try {
          const subscription = {
            endpoint: sub.endpoint,
            keys: sub.keys
          }

          const result = await sendPushNotification(subscription, notificationPayload)
          if (result.success) {
            console.log(`✅ Notificación enviada a ${user.email}`)
          } else {
            console.error(`Error enviando notificación a ${user.email}:`, result.error)
            // Si la suscripción es inválida (410), eliminarla
            if (result.status === 410) {
              const { error: deleteError } = await supabase
                .from('push_subscriptions')
                .delete()
                .eq('id', sub.id)
              
              if (deleteError) {
                console.error(`Error eliminando suscripción inválida:`, deleteError)
              } else {
                console.log(`🗑️ Suscripción inválida eliminada para ${user.email}`)
              }
            }
          }
        } catch (error) {
          console.error(`Error inesperado enviando notificación a ${user.email}:`, error)
        }
      }
    }
  } catch (error) {
    console.error('Error en sendNotificationForNewTask:', error)
  }
}

/**
 * Envía una notificación push usando Web Push Protocol
 */
async function sendPushNotification(subscription: any, payload: string): Promise<{ success: boolean; error?: string; status?: number }> {
  try {
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
    const vapidEmail = Deno.env.get('VAPID_EMAIL') || 'mailto:notifications@hometasks.app'

    if (!vapidPublicKey || !vapidPrivateKey) {
      return {
        success: false,
        error: 'VAPID keys not configured. Please set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in Supabase Edge Functions settings.',
        status: 500
      }
    }

    // Configurar VAPID details
    webPush.setVapidDetails(
      vapidEmail,
      vapidPublicKey,
      vapidPrivateKey
    )

    // Validar estructura de suscripción
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return {
        success: false,
        error: 'Invalid subscription format',
        status: 400
      }
    }

    // Convertir subscription a formato web-push
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth
      }
    }

    // Enviar notificación usando web-push
    try {
      await webPush.sendNotification(pushSubscription, payload, {
        TTL: 86400,
        urgency: 'normal'
      })
      return { success: true }
    } catch (error: any) {
      // Manejar errores específicos
      if (error?.statusCode === 410) {
        // Suscripción expirada o inválida
        return { 
          success: false, 
          error: 'Subscription expired',
          status: 410
        }
      }
      throw error
    }
  } catch (error: any) {
    console.error('Error sending push notification:', error)
    const errorMsg = error instanceof Error ? error.message : (error?.message || 'Unknown error')
    return { 
      success: false, 
      error: errorMsg,
      status: error?.statusCode || 500
    }
  }
}
