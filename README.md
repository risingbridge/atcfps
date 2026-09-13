# atcfps — ATC Flight Strip Board

A configurable flight progress strip board for the browser: user-defined
bays, drag-and-drop strips (flight / info / vehicle), multiple boards, and a
keep-screen-on toggle for iPad use.

**Local-only.** Everything lives in your browser's `localStorage`. The app
makes no network requests after loading — no analytics, no sync, no backend.
A service worker caches the app itself so it opens offline; the production
build ships a Content-Security-Policy that blocks any outbound request, and
`npm run audit:local` fails the build if anything outbound ever appears.
See `docs/local-only-audit.md` for the full audit.

## Features

- Multiple boards; user-defined bays (rename, colour, drag to reorder)
- Dividers inside a bay (e.g. a CLEARED TO LAND line) that strips are moved
  above or below; draggable, labelled, with preset labels from Settings
- Flight strips (full form, marked arrival / departure / other), info and
  vehicle strips (quick-add, Enter); pre-made vehicles and info strips from
  Settings appear as one-tap buttons, with optional pre-filled notes
- Coloured strips like real strip paper: arrivals yellow, departures blue,
  other traffic black, vehicles red, info amber
- iPad-first: three bays across in landscape, 44 px+ touch targets
- Drag strips between and within bays; long-press to lift on touch; drop on
  the gap between two bays to lay a strip across both (e.g. a vehicle cleared
  on TWY and RWY)
- Tap a strip to edit or remove; tap the level cell to set the cleared
  level right on the strip (FL / altitude picker); tap the icon to show or
  hide notes/remarks (all strips are the same height until expanded);
  highlight tint; time-in-bay ageing
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

## Reimagined

A second app, `reimagined/`, is a from-first-principles redesign of the
board for touch (see `docs/reimagined.md`): a strip is an object with a
state on a process, the runway is a ring, and gestures are the record.
It deploys alongside at https://risingbridge.github.io/atcfps/reimagined/
and is built with the same local-only guarantees.
