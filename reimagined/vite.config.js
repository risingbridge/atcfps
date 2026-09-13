import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { cspPlugin } from '../shared/vite-csp-plugin.mjs'

// Served from https://risingbridge.github.io/atcfps/reimagined/
// Built into the main app's dist/ so one Pages artifact carries both.
export default defineConfig({
  base: '/atcfps/reimagined/',
  plugins: [react(), cspPlugin()],
  build: { outDir: '../dist/reimagined', emptyOutDir: true },
  test: { environment: 'node' },
})
