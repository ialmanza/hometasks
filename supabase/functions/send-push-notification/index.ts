import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse the request body
    const { subscription, payload } = await req.json()

    if (!subscription || !payload) {
      return new Response(
        JSON.stringify({ error: 'Missing subscription or payload' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Send push notification using Web Push API
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'TTL': '86400',
        'Urgency': 'normal',
        'Authorization': `vapid t=${generateVAPIDToken(subscription)}, k=${Deno.env.get('VAPID_PUBLIC_KEY')}`
      },
      body: payload
    })

    if (response.ok) {
      return new Response(
        JSON.stringify({ success: true, message: 'Notification sent successfully' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    } else {
      console.error('Push notification failed:', response.status, response.statusText)
      return new Response(
        JSON.stringify({ error: 'Failed to send notification', status: response.status }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('Error in send-push-notification:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

// Generate VAPID token for push notification
function generateVAPIDToken(subscription: any): string {
  // This is a simplified version. In production, you'd need to implement proper VAPID token generation
  const header = {
    typ: 'JWT',
    alg: 'ES256'
  }
  
  const payload = {
    aud: new URL(subscription.endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, // 12 hours
    sub: `mailto:${Deno.env.get('VAPID_EMAIL')}`
  }
  
  // For now, return a placeholder token
  // In production, you'd need to sign this with your VAPID private key
  return btoa(JSON.stringify(header)) + '.' + btoa(JSON.stringify(payload)) + '.signature'
} 