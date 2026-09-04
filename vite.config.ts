import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// https://vite.dev/config/
export default defineConfig({
  // Rutas relativas: el build resultante se abre con doble clic (file://),
  // no servido desde la raíz de un dominio.
  base: './',
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    // El catálogo (~19k discos) va embebido en el bundle; permite un chunk grande.
    chunkSizeWarningLimit: 20000,
    assetsInlineLimit: 100_000_000,
  },
})
