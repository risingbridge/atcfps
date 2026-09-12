import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Local-only app: the built page blocks every outbound request except its own
// static files. Applied at build time only, since Vite's dev server needs a
// WebSocket for HMR.
const CSP = [
  "default-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ')

function cspPlugin() {
  return {
    name: 'csp-meta',
    apply: 'build',
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP },
          injectTo: 'head-prepend',
        },
      ]
    },
  }
}

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
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: 'node',
  },
})
