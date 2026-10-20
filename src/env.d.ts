/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL del proyecto de Supabase, por ejemplo https://xxxx.supabase.co */
  readonly VITE_SUPABASE_URL?: string
  /** Clave pública (publishable) del proyecto */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
