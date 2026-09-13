import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { cspPlugin } from './shared/vite-csp-plugin.mjs'

// https://vite.dev/config/
export default defineConfig({
  // Served from https://risingbridge.github.io/atcfps/
  base: '/atcfps/',
  plugins: [
    react(),
    cspPlugin(),
    // Offline support: precache the app's own build output only. Same-origin
    // cache, no runtime caching of anything else — nothing leaves the browser.
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false, // public/manifest.webmanifest is hand-written
      injectRegister: false, // registered explicitly in main.jsx
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,webmanifest}'],
        navigateFallback: '/atcfps/index.html',
        // the reimagined app lives under this scope with its own build; never answer for it
        navigateFallbackDenylist: [/^\/atcfps\/reimagined(\/|$)/],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: 'node',
    exclude: ['**/node_modules/**', 'reimagined/**'], // the second app runs its own suite
  },
})
