# Build Plan — ATC Flight Strip Board

Companion to `project.md`. That file says *what*; this one says *in what
order* and pins down the decisions the spec leaves open. Each phase ends in
a working, committable state.

---

## Hard constraint: local-only, nothing leaves the browser

All data lives in the browser and stays there. The app makes **no network
requests at runtime** — no analytics, no error reporting, no CDN fonts or
scripts, no remote APIs. The only network traffic is the browser fetching
the static build itself (from GitHub Pages or `localhost`).

How the plan enforces it:

- Fonts and every dependency are bundled by Vite — nothing loaded from a
  CDN at runtime.
- `index.html` carries a Content-Security-Policy meta tag with
  `default-src 'self'; connect-src 'none'`, so an accidental outbound
  request (a stray `fetch`, a font `@import`, a future dependency phoning
  home) is blocked by the browser and shows up in the console instead of
  silently leaking.
- Export/import (Phase 4) is a local file download / file picker only —
  no share links, no paste services.
- A service worker for full offline use is an optional Phase 4 item; it
  only ever caches the app's own static files.
- Review checklist per phase: `npm run build` then open the network tab —
  after initial load it should stay empty.

---

## Decisions not settled by the spec

Defaults I'll use unless told otherwise:

| Question | Decision |
|---|---|
| Repo layout | Scaffold at the repo root (`src/`, `index.html` here), not in a nested `atc-strip-board/` dir. |
| Language | Plain JS + JSX as the spec shows. No TypeScript; JSDoc typedefs on the data model in `store.js` instead. |
| Zero boards? | Always ≥ 1 board. First launch creates an empty board named "Board 1". Deleting the last board replaces it with a fresh empty one, so `activeBoardId` is always valid. |
| Bay reordering | Phase 1: ◀ ▶ buttons in the bay header. Drag-to-reorder bays (nested horizontal sortable) is deferred — it's the one dnd-kit pattern that gets fiddly, and it isn't worth blocking Phase 1 on. |
| Modals | Native `<dialog>` (`showModal()`), no library. Works on iPadOS ≥ 15.4, gives focus trapping and Esc for free. |
| Timestamps | Stored as ISO strings (JSON-safe). Info strips display **UTC as `HHmmZ`** (e.g. `1432Z`), as ATC does. |
| IDs | `crypto.randomUUID()` (secure context — same requirement as wake lock). |
| Fonts | `@fontsource/ibm-plex-mono` + `@fontsource/ibm-plex-sans`, self-hosted so the board works on an iPad with flaky Wi-Fi. |
| Storage schema | `{ version: 1, boards, boardOrder, activeBoardId, settings }` under key `atc-strip-board`. Unparseable/mismatched data is moved to `atc-strip-board.backup` and a fresh state is created — never silently discarded. |
| Tests | Vitest for the reducer only (pure function, highest value per test). No component tests in v1. |
| Hosting | **GitHub Pages** (confirmed) at `https://risingbridge.github.io/atcfps/`. Deployed by a GitHub Actions workflow on push to `main` (`actions/deploy-pages`), so no `gh-pages` branch to maintain. `base: '/atcfps/'` in `vite.config.js`. Needed because the wake lock (and `randomUUID`) require a secure context, and `vite --host` over LAN is plain HTTP. |

---

## Phase 0 — Scaffold

1. `npm create vite@latest . -- --template react` (JS template), keep the
   template's ESLint config.
2. Add deps: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`,
   `@fontsource/ibm-plex-mono`, `@fontsource/ibm-plex-sans`. Dev:
   `vitest`.
3. Replace template CSS with `src/index.css` holding the design tokens
   from spec §5 as CSS custom properties (`--bg-board`, `--paper`, `--ink`,
   `--accent-info`, `--accent-vehicle`, `--chrome`, `--font-data`,
   `--font-ui`, spacing scale) plus a minimal reset.
4. `index.html`: viewport meta with `viewport-fit=cover`, `<title>`,
   `theme-color` = board charcoal.
5. Create empty files for the structure in spec §4 so the shape is visible
   from the first commit.

**Done when:** `npm run dev` shows a dark page with the fonts loaded.

## Phase 1a — State layer (no UI)

Build the data model and reducer first, test it, then hang UI off it.
This isolates the trickiest pure logic (`moveStrip`) from DnD debugging.

1. `src/lib/id.js` — `makeId()`.
2. `src/lib/stripTypes.js` — registry:
   ```js
   {
     flight:  { label, icon, accentVar, quickAdd: false },
     info:    { label, icon, accentVar, quickAdd: true, quickField: 'message',   quickLabel: 'Message' },
     vehicle: { label, icon, accentVar, quickAdd: true, quickField: 'vehicleId', quickLabel: 'Vehicle ID' },
   }
   ```
3. `src/state/store.js` — `initialState()`, `reducer`, action creators
   for every action in spec §6. Key invariants the reducer must uphold:
   - A strip ID appears in exactly one bay's `stripOrder`, and that bay
     is the strip's `currentBayId`.
   - `moveStrip` within the same bay: remove first, then insert at
     `targetIndex` (so indices are relative to the list *without* the
     dragged strip — matches dnd-kit's `arrayMove` semantics).
   - `deleteBay` cascades to strips; `deleteBoard` fixes `activeBoardId`
     and enforces the ≥ 1 board rule.
   - `moveStrip` sets `lastMovedAt` only when the bay actually changes.
4. `src/state/store.test.js` — cover each action, plus: move within bay
   up/down, move to empty bay, delete last board, delete bay with strips.
5. `src/lib/storage.js` — `load()` / `save()` with the version + backup
   behaviour above.
6. `src/hooks/useLocalStorage.js` — actually a `usePersistedReducer`:
   lazy-init from `storage.load()`, `useEffect` → `storage.save()` on every
   state change. Exposed through a `StoreContext` (`useStore()` returns
   `{ state, dispatch }`; `useActiveBoard()` convenience selector).

**Done when:** `npx vitest run` is green; `App.jsx` can render
`JSON.stringify(state)` and it survives refresh.

## Phase 1b — Static UI (render + create, no drag yet)

1. `BoardBar.jsx` — board `<select>`, "+ New board", rename (inline on
   double-click or a small ✎ button), delete, wake-lock toggle slot
   (wired in Phase 3).
2. `App.jsx` — `BoardBar` on top, horizontal scroll row of `BayColumn`s,
   trailing `NewBayForm`. Empty board shows a single hint: "Add a bay to
   get started."
3. `BayColumn.jsx` — header (inline-rename name, ◀ ▶ reorder, 🗑 delete),
   strip list, `NewStripMenu` at the bottom.
4. `NewStripMenu.jsx` — three buttons (Flight / Info / Vehicle). Info and
   Vehicle expand into an inline `<input>`; Enter creates via
   `createQuickStrip`, Esc cancels. Flight opens `FlightStripModal`.
5. `FlightStripModal.jsx` — `<dialog>` form for the seven flight fields;
   callsign required, everything else optional. Used for create now,
   edit in Phase 2.
6. `Strip.jsx` — one component, switches on `type` via the registry:
   - Layout: wide short bar, left type-icon + accent stripe, then a
     horizontal row of fields.
   - Flight: `CALLSIGN  TYPE  ROUTE  RFL/CFL  SQUAWK` in mono, remarks in
     sans below only if non-empty.
   - Info: `HHmmZ` + message. Vehicle: vehicle ID. Notes shown small if
     non-empty.
   - `colorOverride` applies as a left-stripe colour if set.
7. Delete strip via a small × on hover/long-press (confirm added in
   Phase 2).

**Done when:** you can build a full board by hand, refresh, and it's all
still there. Visually check against spec §5 — this is the moment to get
the strip proportions right, before DnD makes layout changes costlier.

## Phase 1c — Drag-and-drop

The multi-container sortable pattern from dnd-kit:

1. `App.jsx` wraps the bay row in `<DndContext>` with sensors:
   - `PointerSensor` with `activationConstraint: { distance: 6 }` so a
     plain click still opens the editor.
   - `TouchSensor` with `{ delay: 200, tolerance: 6 }` for iPad
     (long-press to lift, like a real strip). Strips get
     `touch-action: none`.
   - `KeyboardSensor` with `sortableKeyboardCoordinates` (cheap, and
     good for accessibility).
   - Collision detection: `closestCorners`.
2. Each `BayColumn` is a `<SortableContext items={bay.stripOrder}
   strategy={verticalListSortingStrategy}>` **and** a `useDroppable`
   target with `id = bayId`, so empty bays accept drops.
3. `Strip.jsx` uses `useSortable({ id: stripId, data: { bayId } })`.
4. Handlers:
   - `onDragOver` — if the strip is over a *different* bay than
     `currentBayId`, dispatch `moveStrip` to that bay immediately (index =
     position of the hovered strip, or end of list if over the bay
     itself). This is what makes the gap open up in the target bay.
   - `onDragEnd` — dispatch a final `moveStrip` with the resolved index
     (same-bay reorder case).
   - `onDragCancel` — no-op; state already reflects the last `dragOver`,
     which is acceptable for a hobby board. (Snapshot-and-restore can be
     added if it ever annoys.)
5. `<DragOverlay>` renders a copy of the dragged `Strip` so it floats
   above adjacent columns instead of being clipped by `overflow`.
6. Tag reducer moves originating from `dragOver` so `lastMovedAt` isn't
   spammed — simplest: only `onDragEnd` passes `{ commit: true }`.

**Done when:** reorder within a bay, move to another bay, move into an
empty bay, and cancel with Esc all behave, on both mouse and iPad.

## Phase 2 — Editing & confirmation

1. `ConfirmDialog.jsx` — `<dialog>` with message + Cancel/Confirm; expose
   as `useConfirm()` returning a promise so callers read
   `if (await confirm('Delete bay "X" and its 4 strips?'))`.
2. Wire confirm into: delete bay (only when non-empty), delete strip,
   delete board.
3. `EditNotesModal.jsx` — edit `message`/`vehicleId` (label from the
   registry) + `notes` textarea. Opened by clicking an info/vehicle strip.
4. Flight edit: clicking a flight strip opens `FlightStripModal` in edit
   mode (prefilled, "Save" instead of "Create", plus a Delete button).
5. `colorOverride` picker inside both edit modals — a small row of 5–6
   swatches + "none". Cheap, and it's the manual-highlight the spec asks
   for.
6. Make sure the click-to-edit doesn't fight the drag sensors (the
   6px activation distance handles mouse; on touch, tap = edit,
   long-press = drag).

**Done when:** every field of every strip type can be changed after
creation, and nothing destructive happens without a confirm.

## Phase 3 — Wake lock & iPad deployment

1. `src/hooks/useWakeLock.js`:
   ```
   useWakeLock(enabled) → { supported, active, error }
   ```
   - `supported = 'wakeLock' in navigator && window.isSecureContext`
   - On `enabled` → `navigator.wakeLock.request('screen')`; keep the
     sentinel in a ref; listen for its `release` event to set
     `active=false`.
   - `visibilitychange` listener: if `enabled` and document is visible
     and no live sentinel → re-request.
   - On `enabled=false` or unmount → `sentinel.release()`.
2. `BoardBar` toggle: bound to `settings.keepScreenOn` (persisted).
   Disabled with a tooltip when `!supported`; shows a small dot when
   `active` so you can tell it actually took.
3. iPad polish, all small:
   - `overscroll-behavior: none` on body (kills pull-to-refresh mid-drag).
   - `env(safe-area-inset-*)` padding on `BoardBar`.
   - `manifest.webmanifest` with `display: standalone` so "Add to Home
     Screen" gives a chrome-free board.
4. Deploy: set `base: '/atcfps/'` in `vite.config.js`, add
   `.github/workflows/deploy.yml` (checkout → `npm ci` → `npm run build`
   → `actions/upload-pages-artifact` → `actions/deploy-pages`), and set
   the repo's Pages source to "GitHub Actions". Test the wake lock on the
   real iPad from the HTTPS URL — that's the only place it can be
   verified.

**Done when:** the board runs from GitHub Pages on the iPad, stays awake
with the toggle on, and re-acquires after switching apps and back.

## Phase 4 — Nice-to-haves, in the order I'd do them

1. **Export/import board as JSON** — first because it's a backup for
   localStorage, which Safari can evict. Add `importBoard(board)` action;
   export is `JSON.stringify` + download link, import is `<input
   type=file>`.
2. **Time-in-bay aging** — `lastMovedAt` is already tracked; a 1-minute
   `setInterval` tick and two CSS classes (`aging`, `stale`) at
   configurable thresholds.
3. **Undo delete** — keep the last deleted strip/bay in component state
   with a 10-second toast "Undo". Cheaper than a real undo stack and
   covers the actual accident.
4. **Per-bay colour** — `Bay.color` already exists in the model; add a
   swatch picker to the bay header.
5. **Drag-to-reorder bays** — replace the ◀ ▶ buttons with a horizontal
   `SortableContext` over bay headers.
6. **Print view** — `@media print` stylesheet, bays as page sections.
7. **Offline / service worker** — `vite-plugin-pwa` precaching the app's
   own assets so the board opens on the iPad with no connectivity at
   all. Same-origin cache only; still no outbound requests.

---

## Working conventions

- One commit per numbered step above, roughly; each phase gets a short
  README update.
- Reducer stays pure and fully tested; components stay thin. If logic
  appears in a component that could be a reducer action, move it.
- Anything type-specific goes through `stripTypes.js`. The test for
  "is this extensible" is: could a 4th strip type be added without
  touching `BayColumn`, `App`, or the DnD handlers?
