import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['eventflow-icon.svg'],
      manifest: {
        name: 'EventFlow Pro',
        short_name: 'EventFlow',
        description: 'Gestão profissional de eventos',
        lang: 'pt-BR',
        theme_color: '#0b1220',
        background_color: '#f5f7fb',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/eventflow-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,ico,png,woff2}'],
      },
    }),
  ],
})
