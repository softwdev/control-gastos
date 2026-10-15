import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { offlinePwa } from './pwa-plugin.ts'

// https://vite.dev/config/
export default defineConfig({
  // Rutas relativas: el build funciona en cualquier subcarpeta (por ejemplo dentro de XAMPP/htdocs)
  base: './',
  plugins: [react(), offlinePwa({ cachePrefix: 'control-gastos' })],
})
