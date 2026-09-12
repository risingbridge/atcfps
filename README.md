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
- Flight strips (full form, marked arrival / departure / other), info and
  vehicle strips (quick-add, Enter)
- Coloured strips like real strip paper: arrivals yellow, departures blue,
  other traffic black, vehicles red, info amber
- iPad-first: three bays across in landscape, 44 px+ touch targets
- Drag strips between and within bays; long-press to lift on touch; drop on
  the gap between two bays to lay a strip across both (e.g. a vehicle cleared
  on TWY and RWY)
- Tap a strip to edit or remove; tap the level cell to set the cleared
  level right on the strip (FL / altitude picker); highlight stripe;
  time-in-bay ageing
- Removed strips go to a per-board archive (created / removed times, full
  details, restore to any bay); undo for removes; confirm on bay/board delete
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
