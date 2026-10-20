import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/manrope'
import './index.css'
import App from './App.tsx'
import { migrateFromV1, sync } from './data/gastos'

// Convierte los datos de la versión anterior y empieza a sincronizar con Supabase.
migrateFromV1()
sync.start()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Service worker: guarda la app en caché para que funcione sin conexión (solo en el build de producción).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((error) => {
      console.error('No se pudo registrar el service worker', error)
    })
  })
}
