# CLAUDE.md

ATC flight-progress strip board — a single-page React app for an iPad in
landscape. No backend. Read `project.md` (spec) and `PLAN.md` (build log,
decisions, per-phase status) before changing behaviour.

## Hard constraint: local-only

Nothing leaves the browser. No analytics, no remote APIs, no CDN loads at
runtime. All state is in `localStorage`; the production build ships a CSP
with `connect-src 'none'` (injected by `cspPlugin` in `vite.config.js`,
build only — the dev server needs its HMR WebSocket). Any new dependency or
feature must keep `npm run build` + the network tab silent after load.
`npm run audit:local` (run in CI after the build) scans `dist/` for any
outbound reference; `docs/local-only-audit.md` records the full method.

## Two apps in one repo

- The **strip board** (root) — the faithful version, phases 0–12, live at
  `/atcfps/`.
- The **reimagined flow board** (`reimagined/`) — a from-first-principles
  successor (`docs/reimagined.md`), live at `/atcfps/reimagined/`. Own
  `package.json`, own tests, built into `dist/reimagined/` by
  `npm run build:all`. Both share `shared/vite-csp-plugin.mjs` and both
  are audited. v1's service worker denylists the `/reimagined/` path.

## Commands

```
npm run dev       # Vite dev server (base path is /atcfps/)
npm test          # vitest — reducer, storage, import parsing, time helpers
npm run lint      # oxlint (must be clean; fix warnings, don't suppress)
npm run build     # production build → dist/ (with CSP + service worker)
npm run build:all # both apps → dist/ and dist/reimagined/
npm run audit:local  # fail if dist/ could reach any host but its own
npm run preview   # serve dist/ locally
```

Deploy: push to `main` → GitHub Actions (lint, test, build) → GitHub Pages
at https://risingbridge.github.io/atcfps/. The service worker means the
new build shows on the *second* open after a deploy.

## Architecture

- `src/state/store.js` — the whole data model and a **pure reducer**.
  Action creators (`actions.*`) generate ids and timestamps so the reducer
  is deterministic and tests pass fixed values. `sanitizeBoard()` rebuilds
  untrusted board data (imports, undo buffers) and is the single place the
  board invariants are enforced.
- `src/lib/stripTypes.js` — registry of strip types (flight / info /
  vehicle / divider) and flight kinds (arrival / departure / other).
  Adding a type means an entry here plus a render case in `Strip.jsx`;
  bay and drag-and-drop code must not need to know. A divider is
  furniture in `stripOrder` (`isDivider`): never archived, not counted,
  no age/expand/highlight/span.
- `src/lib/storage.js` — versioned `localStorage` load/save; unreadable
  data is moved to a backup key, never discarded. Missing fields default
  rather than bumping the schema version.
- `src/components/StripDndContext.jsx` — dnd-kit: strips (multi-container
  sortable) and bays (horizontal sortable) in one context; collision
  detection partitions droppables by the active item's type.
- Providers in `main.jsx`: `StoreProvider` → `DialogProvider` (promise
  `confirm`/`prompt`) → `ToastProvider` (toasts with an Undo action;
  rendered as a popover so they sit above open `<dialog>`s).
- Styling: plain CSS. Tokens in `src/index.css`, components in
  `src/app.css`. Strips are grey with ink text; the type colour is the
  frame, set as `--strip-frame` by `[data-type]`/`[data-kind]`; a
  highlight tints the background via `--strip-accent`. Read the tokens
  (`--strip-bg`, `--strip-ink`, `--strip-<type>`), don't hard-code colours.

## Invariants worth knowing

- A strip id appears in exactly one bay's `stripOrder`, and that bay is
  the strip's `currentBayId`.
- `moveStrip` index semantics follow dnd-kit `arrayMove`: relative to the
  list *without* the moved strip. `lastMovedAt` changes only on a real
  cross-bay drop, never during drag-over or same-bay reorder.
- Removing a strip archives it (`Board.archive`, newest first, capped at
  500). Undo and restore-from-archive both drop the entry.
- A strip may span into the bay immediately to its right (`spanBayId`);
  `normalizeSpans()` clears any span that stops being adjacent. The
  right bay renders a placeholder; `useSpanAlignment` measures the DOM
  to line the two up and is frozen while a drag is in progress (dnd-kit
  caches rects — never shift layout under it).
- Always ≥ 1 board; deleting the last one creates a fresh empty board.
- The board is the single scroll container (both axes); bay headers and
  footers are sticky. Bays must not scroll individually — a spanning
  strip has to overflow its bay.
- Tabs on one origin sync through the `storage` event (`replaceState`).
- App-level settings live in `state.settings` (`keepScreenOn`,
  `presets: { vehicle, info }` of `{ label, notes }`); `SettingsDialog`
  is reached from the ⋯ board menu. `storage.load` migrates the older
  `settings.vehicles` string list.

## UI conventions (iPad-first)

- Touch targets ≥ 44 × 44 px; inputs use 16 px text (Safari won't zoom).
- No hover-only affordances. Tap a strip to edit/remove; tap its icon
  cell to expand/collapse notes (`strip.expanded`); tap the level cell
  for the picker; long-press to drag (`TouchSensor` 200 ms); mouse drags
  need 6 px movement so clicks still work. Collapsed strips are all
  `--strip-height` (two rows) tall.
- Modals are native `<dialog>`; mount to open, listen for `close`.
- Times are UTC, ATC-style: `1432Z`, with a date prefix only when not
  today (`formatZuluDate`).
- Avoid generic-dashboard tells: no all-caps eyebrow labels, no gradients,
  no uniform card-with-shadow treatment.

## How to verify a change

1. `npm run lint && npm test && npm run build`.
2. Drive it in Chromium via the browser tools at an iPad viewport
   (1194 × 834 for the 11"; also 1366 × 1024 and 1180 × 820): three bays
   must fit, nothing inside a strip may overflow, console clean.
3. For layout work, script a tap-target audit (every visible button/input
   ≥ 44 px) and a contrast check per strip variant (≥ 4.5:1 for text).
4. Anything touching the wake lock or touch drag needs the real iPad from
   the Pages URL — it can't be verified anywhere else.

## Working with the user

- One commit per plan step, written in the imperative with a short body.
  Commit locally as you go; **push only when asked** ("commit and push").
- Plan a phase in `PLAN.md` first, ask the clarifying questions up front,
  then build. Record decisions and deviations there, and tick phases off.
- Keep `project.md` in sync when the data model or colours change.
