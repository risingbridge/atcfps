#!/usr/bin/env node
/**
 * Local-only audit of the production build (run after `vite build`).
 * Fails (exit 1) if dist/ could make the app talk to anything but itself:
 *  - a URL to any host that isn't a known-inert string (XML namespaces, doc links in messages)
 *  - index.html missing the CSP, or referencing an external script/style/link
 *  - the service worker precaching or importing anything absolute/off-origin
 *  - CSS url() pointing anywhere but the app's own assets
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, extname, basename } from 'node:path'

// usage: node scripts/audit-local-only.mjs [distDir] [basePath] [--no-sw]
const args = process.argv.slice(2)
const DIST = args.find((a) => !a.startsWith('--')) ?? 'dist'
const BASE = args.filter((a) => !a.startsWith('--'))[1] ?? '/atcfps/'
const EXPECT_SW = !args.includes('--no-sw')
// a nested app with its own base is audited by its own invocation
const NESTED = ['reimagined']

// Strings that look like URLs but are never requested. Keep this list short and specific.
const INERT_URLS = [
  /^https?:\/\/www\.w3\.org\//, // XML namespace identifiers in React DOM / SVG
  /^https:\/\/react\.dev\/errors\/?$/, // prefix React uses to compose minified error messages
  /^https:\/\/bit\.ly\/wb-precache$/, // doc link inside a Workbox warning string
]

const files = []
;(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) {
      if (dir === DIST && NESTED.includes(name)) continue
      walk(p)
    } else files.push(p)
  }
})(DIST)

const problems = []
const text = (f) => readFileSync(f, 'utf8')
const isText = (f) => ['.js', '.css', '.html', '.webmanifest', '.json', '.svg'].includes(extname(f))

// 1) URLs in any text asset
const urlRe = /(?:https?:)?\/\/[A-Za-z0-9._-]+\.[A-Za-z]{2,}[^\s"'`)<>]*/g
for (const f of files.filter(isText)) {
  for (const m of text(f).matchAll(urlRe)) {
    const u = m[0]
    if (!INERT_URLS.some((re) => re.test(u))) problems.push(`${basename(f)}: outbound URL "${u}"`)
  }
}

// 2) index.html: CSP present and strict; no external src/href
const html = text(join(DIST, 'index.html'))
const csp = /Content-Security-Policy" content="([^"]*)"/.exec(html)?.[1]?.replace(/&#39;/g, "'")
if (!csp) problems.push('index.html: CSP meta tag missing')
else {
  for (const need of ["default-src 'self'", "connect-src 'none'", "object-src 'none'", "form-action 'none'"]) {
    if (!csp.includes(need)) problems.push(`index.html: CSP lacks "${need}"`)
  }
}
for (const m of html.matchAll(/<(?:script|link|img|iframe)[^>]*?(?:src|href)="([^"]+)"/g)) {
  if (!m[1].startsWith(BASE)) problems.push(`index.html: external reference "${m[1]}"`)
}

// 3) service worker: relative imports and same-origin precache only
const sw = files.find((f) => basename(f) === 'sw.js')
if (!sw && EXPECT_SW) problems.push('sw.js missing (offline build expected)')
else if (sw) {
  const s = text(sw)
  for (const m of s.matchAll(/define\(\[([^\]]*)\]/g)) {
    if (!/^\s*"\.\//.test(m[1])) problems.push(`sw.js: non-relative module import ${m[1]}`)
  }
  for (const m of s.matchAll(/url:"([^"]+)"/g)) {
    if (/^(https?:)?\/\//.test(m[1])) problems.push(`sw.js: absolute precache URL "${m[1]}"`)
  }
  if (/registerRoute\((?!new [a-z]\.NavigationRoute)/.test(s)) problems.push('sw.js: unexpected runtime route registered')
}

// 4) CSS url() targets
for (const f of files.filter((f) => extname(f) === '.css')) {
  for (const m of text(f).matchAll(/url\(([^)]+)\)/g)) {
    const u = m[1].replace(/^['"]|['"]$/g, '')
    if (!u.startsWith(BASE) && !u.startsWith('data:')) problems.push(`${basename(f)}: css url("${u}")`)
  }
}

// 5) manifest icons (if the app ships a manifest)
const manifestFile = files.find((f) => basename(f) === 'manifest.webmanifest')
if (manifestFile) {
  const manifest = JSON.parse(text(manifestFile))
  for (const icon of manifest.icons ?? []) {
    if (!icon.src.startsWith(BASE)) problems.push(`manifest: external icon "${icon.src}"`)
  }
}

if (problems.length) {
  console.error(`Local-only audit FAILED (${problems.length}):`)
  for (const p of problems) console.error('  - ' + p)
  process.exit(1)
}
console.log(`Local-only audit passed (${DIST}, base ${BASE}): ${files.length} files, CSP strict, no outbound references.`)
