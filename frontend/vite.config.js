import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Loads frontend/.env (if present) plus OS env vars. Not VITE_-prefixed
  // because this only runs in Node during dev/build — it's never sent to
  // the browser.
  const env = loadEnv(mode, process.cwd(), '')
  const backendPort = env.BACKEND_PORT || '4000'

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg'],
        manifest: {
          name: 'MujuzPM — Project Management',
          short_name: 'MujuzPM',
          description: 'Plan, track and deliver every project in one workspace.',
          theme_color: '#1a1025',
          background_color: '#1a1025',
          display: 'standalone',
          start_url: '/dashboard',
          icons: [
            { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        // API calls always go to the network — the service worker only
        // caches the built app shell (JS/CSS/HTML), never task/project data.
        workbox: {
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            { urlPattern: /^\/api\//, handler: 'NetworkOnly' },
          ],
        },
      }),
    ],
    server: {
      proxy: {
        '/api': { target: `http://localhost:${backendPort}`, changeOrigin: true },
      },
    },
  }
})
