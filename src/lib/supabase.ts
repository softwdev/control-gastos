import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/** false si faltan las variables de entorno: la app sigue funcionando solo con datos locales. */
export const supabaseConfigured = Boolean(url && key)

/**
 * Cliente de Supabase. La app no usa inicio de sesión, por eso se desactiva la sesión:
 * todas las peticiones usan la clave pública (rol anon) y las políticas RLS de las tablas.
 */
export const supabase = supabaseConfigured
  ? createClient<Database>(url!, key!, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
  : null
