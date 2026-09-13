# Local-only audit

The app must never send anything to the internet. This records how that is
verified, what was found, and what keeps it true.

Last full audit: **2026-09-13**, build `d71d4d0`, live at
https://risingbridge.github.io/atcfps/.

## What "local-only" means here

- The only network traffic is the browser fetching the app's own static
  files from `risingbridge.github.io/atcfps/` (and the service worker
  re-fetching them to check for updates).
- No analytics, no error reporting, no remote APIs, no CDN fonts or
  scripts, no third-party anything.
- All data lives in `localStorage` under one key (`atc-strip-board`).
  Export is a client-side file download; import is a client-side file read.

## Layer 1 — what ships (static)

`npm run audit:local` (`scripts/audit-local-only.mjs`) scans `dist/` after
every build and fails CI if it finds:

- any URL to any host, other than three known-inert strings: W3C XML
  namespace identifiers used by React DOM/SVG, the `https://react.dev/errors/`
  prefix React uses to *compose* minified error messages, and a doc link
  inside a Workbox warning string. None is ever requested.
- `index.html` without the CSP, or with any external `src`/`href`.
- a service worker that imports a non-relative module, precaches an
  absolute URL, or registers a runtime route other than the navigation
  fallback.
- CSS `url()` outside the app's own assets, or a manifest icon elsewhere.

Findings on 2026-09-13: 56 files, no outbound references. The only `fetch`
calls in shipped JS are Workbox precaching its own 32 same-origin files and
Vite's modulepreload polyfill for same-origin chunks. A negative test
(injecting an external `<script>` and a `fetch()`) makes the audit fail.

## Layer 2 — what the browser is told (CSP)

The production build injects, via a build-only Vite plugin:

```
default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;
connect-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'
```

Confirmed present in the HTML served by GitHub Pages. `connect-src 'none'`
covers fetch, XHR, WebSocket, EventSource and `sendBeacon`; `default-src
'self'` covers scripts, styles, images, fonts, frames, workers and media;
`form-action 'none'` stops form posts.

Not covered by CSP, and therefore verified separately: top-level
navigations (a link click). The static audit guarantees the app contains
no external links.

## Layer 3 — what actually happens (runtime, on the live site)

Driven in Chromium against the deployed app:

1. Exercised every feature — bays, settings, vehicle chip, flight form,
   level picker, remove → archive, import, wake lock, cross-tab sync —
   while recording all network requests. Result: 9–11 requests, all to
   `risingbridge.github.io`.
2. Attempted exfiltration through 18 channels from the page's own
   context (fetch, XHR, `sendBeacon`, `Image`, WebSocket, EventSource,
   classic and module `<script>`, stylesheet `<link>`, preload/prefetch,
   `@import`, `@font-face`, CSS `url()`, iframe, form POST, Worker,
   dynamic `import()`, a second service-worker registration), carrying
   a slice of the stored board data, against **a local server that logs
   every hit**. Every attempt raised a `securitypolicyviolation`; the
   server logged **zero** requests.
3. Service worker: same-origin script, one cache
   (`workbox-precache-v2-…/atcfps/`) holding 32 same-origin URLs, nothing
   foreign. Storage: one `localStorage` key, no IndexedDB, no cookies.

## Residual risks, stated plainly

- **The service worker runs outside the page CSP.** GitHub Pages sends no
  CSP header, so the worker is constrained only by its own code. That
  code is Workbox's precache of a fixed same-origin list plus a
  navigation fallback — reviewed, and guarded by the static audit
  (relative import, no absolute precache URLs, no extra routes). A
  dependency update that changed the worker would be caught there.
- **Hosting.** Loading the app contacts GitHub's CDN; GitHub sees the
  request for the static files (as any web host would). No board data is
  ever in a request.
- **The user's own actions.** Exporting a JSON file and then uploading it
  somewhere is outside the app's control.

## How to re-run

```
npm run build && npm run audit:local     # layer 1 (also runs in CI)
```

For layers 2–3, open the live site with DevTools → Network, use the app,
and confirm every row is `risingbridge.github.io`. The exfiltration probe
is a one-off script kept in the session history; the important part is
`document.addEventListener('securitypolicyviolation', …)` plus a local
request sink such as `python3 -m http.server`.
