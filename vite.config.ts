import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({ plugins: [react(), VitePWA({ registerType: 'autoUpdate', manifest: { name: 'EventFlow Pro', short_name: 'EventFlow', description: 'Gestão profissional de eventos', theme_color: '#0b1220', background_color: '#f5f7fb', display: 'standalone', scope: '/', start_url: '/', icons: [] } })] })
