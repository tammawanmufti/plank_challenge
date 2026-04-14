import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icon-192.svg', 'icon-512.svg', 'icon-192.png', 'icon-512.png', 'icon-512-maskable.png'],
      manifest: {
        name: 'Plank Challenge',
        short_name: 'Plank',
        description: 'PWA plank challenge mobile-first dengan mode practice, challenge, dan manual.',
        theme_color: '#1750a8',
        background_color: '#f5f2e8',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json,wasm,tflite}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/npm\/\@mediapipe\/tasks-vision.*$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mediapipe-wasm-cache',
              expiration: {
                maxEntries: 8,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/storage\.googleapis\.com\/mediapipe-models\/.*$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mediapipe-model-cache',
              expiration: {
                maxEntries: 6,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
})
