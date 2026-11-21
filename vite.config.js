import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Native Android/iOS builds bundle the same React app without a web service worker.
// Normal GitHub Pages / browser builds retain the existing installable PWA.
const base = '/'
const nativeBuild = process.env.NATIVE_BUILD === 'true'

export default defineConfig({
  base,
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        // Long-lived vendor chunks: app deploys don't invalidate cached libraries.
        manualChunks: {
          react: ['react', 'react-dom', 'react-dom/client'],
          supabase: ['@supabase/supabase-js'],
          query: ['@tanstack/react-query'],
          router: ['react-router-dom'],
        },
      },
    },
  },
  plugins: [
    react(),
    ...(!nativeBuild ? [VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        id: base,
        name: 'ManaLife',
        short_name: 'ManaLife',
        description: 'Your life. Your people. Your space.',
        theme_color: '#6e56f8',
        background_color: '#f7f6f3',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: `${base}icons/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: `${base}icons/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          { src: `${base}icons/icon.svg`, sizes: 'any', type: 'image/svg+xml', purpose: 'any' }
        ]
      },
      workbox: {
        navigateFallback: 'index.html',
        // Precache the app shell + latin fonts; other font subsets load on demand.
        globPatterns: ['**/*.{js,css,html,svg,png,ico}', 'assets/*latin-[0-9a-z]*.woff2', 'assets/*latin-wght*.woff2'],
        globIgnores: ['**/*-ext-*.woff2'],
        cleanupOutdatedCaches: true
        // Supabase (another origin) is never cached by the service worker: data always comes live.
      }
    })] : [])
  ]
})
