/**
 * Local-only app: the built page blocks every outbound request except its
 * own static files. Applied at build time only, since Vite's dev server
 * needs a WebSocket for HMR. Shared by both apps in this repo.
 */
const CSP = [
  "default-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ')

export function cspPlugin() {
  return {
    name: 'csp-meta',
    apply: 'build',
    transformIndexHtml() {
      return [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' }]
    },
  }
}
