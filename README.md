# atcfps — ATC Flight Strip Board

A configurable flight progress strip board for the browser: user-defined
bays, drag-and-drop strips (flight / info / vehicle), multiple boards, and a
keep-screen-on toggle for iPad use.

**Local-only.** Everything lives in your browser's `localStorage`. The app
makes no network requests after loading — no analytics, no sync, no backend.
A service worker caches the app itself so it opens offline; the production
build ships a Content-Security-Policy that blocks any outbound request.

## Features

- Multiple boards; user-defined bays (rename, colour, drag to reorder)
- Flight strips (full form), info and vehicle strips (quick-add, Enter)
- Drag strips between and within bays; long-press to lift on touch
- Click a strip to edit; highlight colours; time-in-bay ageing
- Undo for deletes; confirm on bay/board delete
- Export/import boards as JSON (⋯ menu) — your backup, since browsers can
  evict site data
- Keep-screen-on toggle (Screen Wake Lock, needs HTTPS)
- Print stylesheet; installable (Add to Home Screen on iPad)

See `project.md` for the spec and `PLAN.md` for the build plan.

## Development

```
npm install
npm run dev      # local dev server
npm test         # reducer tests (vitest)
npm run build    # production build → dist/
npm run preview  # serve the production build locally
```

Hosted on GitHub Pages at https://risingbridge.github.io/atcfps/
