import { createClient } from '@supabase/supabase-js'
import { environment } from '../../../environments/environments'

// Configuración del cliente Supabase
const supabaseUrl = environment.supabaseUrl
const supabaseAnonKey = environment.supabaseKey

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan las variables de entorno de Supabase')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
