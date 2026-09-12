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
- The production build carries a Content-Security-Policy meta tag with
  `default-src 'self'; connect-src 'none'` (injected by a build-only Vite
  plugin, since the dev server needs a WebSocket for HMR), so an accidental
  outbound request (a stray `fetch`, a font `@import`, a future dependency
  phoning home) is blocked by the browser and shows up in the console
  instead of silently leaking.
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

> **Status (2026-09-12):** Phases 0–6 built. 0–5 deployed; 6 verified in
> Chromium, pending push.

## Phase 0 — Scaffold ✅

1. `npm create vite@latest . -- --template react` (JS template), keep the
   template's lint config (the current template ships oxlint).
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

## Phase 1a — State layer (no UI) ✅

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

## Phase 1b — Static UI (render + create, no drag yet) ✅

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

## Phase 1c — Drag-and-drop ✅

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

## Phase 2 — Editing & confirmation ✅

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

## Phase 3 — Wake lock & iPad deployment ✅

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

## Phase 4 — Nice-to-haves, in the order I'd do them ✅

1. **Export/import board as JSON** — first because it's a backup for
   localStorage, which Safari can evict. Add `importBoard(board)` action;
   export is `JSON.stringify` + download link, import is `<input
   type=file>`.
2. **Time-in-bay aging** — `lastMovedAt` is already tracked; a 1-minute
   `setInterval` tick and two CSS classes (`aging`, `stale`) at
   configurable thresholds.
3. **Undo delete** — keep the last deleted strip/bay/board in a toast with
   an "Undo" action (8 s). Cheaper than a real undo stack and covers the
   actual accident. Strip deletes no longer ask for confirmation (undo
   replaces it); bay and board deletes keep the confirm *and* get undo.
4. **Per-bay colour** — `Bay.color` already exists in the model; add a
   swatch picker to the bay header.
5. **Drag-to-reorder bays** — horizontal `SortableContext` over bay
   headers (header is the handle). The ◀ ▶ buttons moved into a per-bay
   ⋯ menu as "Move left/right", alongside rename, colour and delete.
6. **Print view** — `@media print` stylesheet, bays as page sections.
7. **Offline / service worker** — `vite-plugin-pwa` precaching the app's
   own assets so the board opens on the iPad with no connectivity at
   all. Same-origin cache only; still no outbound requests.

---

## Phase 5 — iPad-first layout & strip colour scheme ✅

Decided with the user:

| Question | Decision |
|---|---|
| Arrival / departure / other | Explicit `flightKind` field on flight strips (`'arrival' \| 'departure' \| 'other'`), set in the flight form, default `other`. |
| Colour style | Full-colour strips like real coloured strip paper: vehicle **red**, arrival **yellow**, departure **blue**, other traffic **black**. Text colour flips per background. |
| Info strips | Stay amber (current light amber-tinted paper). Distinct from arrival-yellow by saturation and the ⓘ icon. |
| Manual highlight | Kept, but only as a left-edge stripe (never recolours the strip body). |
| Target device | iPad, landscape, **3 bays visible** across the width; horizontal scroll for more. |

Calls I'll make unless told otherwise:

- Touch targets ≥ 44 × 44 px everywhere (Apple HIG). Inputs get 16 px text
  so iPad Safari doesn't auto-zoom on focus.
- The hover-only × on strips goes away. Deleting a strip = tap it → Delete
  (undo toast already exists). One extra tap for a rarer action, in exchange
  for no accidental deletes from a fat-finger on the corner.
- "+ New board" moves into the ⋯ board menu; the board bar becomes
  `[brand] [board ▾] [⋯] …… [keep screen on]`. Renaming the board is in
  the menu; click-to-rename stays for bay names.
- Existing flight strips (no `flightKind` yet) render as **other/black**
  until edited. No storage-version bump: a missing field just defaults.
- Bay width is derived from the viewport so three fit on any landscape
  iPad (11" ≈ 380 px, 12.9" ≈ 430 px), capped at 480 px on desktop.

### 5a — Data model + form

1. `stripTypes.js`: add `flightKind` to `FLIGHT_FIELDS`-adjacent metadata
   (`FLIGHT_KINDS = ['arrival', 'departure', 'other']`, labels, short
   codes `ARR`/`DEP`). Keep `FLIGHT_FIELDS` for the text fields.
2. `store.js`: `createFlightStrip` and `sanitizeBoard` normalise
   `flightKind` (unknown/missing → `other`); `updateStrip` accepts it.
3. `FlightStripModal`: a 44 px-tall segmented control (Arrival /
   Departure / Other) above the text fields, colour-coded.
4. Tests for defaulting and round-trip through import.
5. `project.md` §2 and §5 updated to record the new field and colours.

### 5b — Colour system

Strip variants become CSS classes driven by `data-type` and
`data-kind`; each variant sets four tokens the rest of the strip CSS
reads (`--strip-bg`, `--strip-fg`, `--strip-fg-muted`, `--strip-divider`):

| Variant | Background | Text |
|---|---|---|
| vehicle | red `#B8322A` | white |
| flight · arrival | yellow `#F2C230` | ink `#22201C` |
| flight · departure | blue `#2F5FA8` | white |
| flight · other | black `#141618` + 1 px `#3E444C` border (so it separates from the charcoal board) | paper `#F0ECE2` |
| info | amber-tinted paper (unchanged) | ink |

- Cell dividers and the icon cell use `--strip-divider` (currentColor at
  low alpha) so they work on light and dark strips.
- Ageing text gets per-variant colours (dark amber on yellow, light
  amber/red on dark backgrounds).
- Highlight = 8 px left stripe in the chosen colour; body colour untouched.
- Type-picker buttons and the icon cell use the same colours, so the
  legend is learned from the buttons themselves.
- Flight icon cell shows ✈ plus a small `ARR`/`DEP` code under it (nothing
  for other) — colour carries the meaning, the code confirms it.
- Drag overlay and placeholder styles re-checked against dark strips.

### 5c — Finger-friendly layout

- **Strips**: 56 px min height (from 44), callsign 18 px, other cells
  15 px, cell padding 12 px. Message/notes wrap to two lines max.
  Flight strips became **two rows of boxes** (callsign · type · squawk /
  route · levels · age) — one row no longer fits at 380 px with the
  larger type, and it's truer to real strips anyway.
- **Bays**: header 52 px; ⋯ button 44 px; footer type buttons 48 px tall
  with icon + label; quick-add input 48 px / 16 px text.
- **Bay width**: `--bay-width: clamp(340px, (100vw − gutters) / 3, 480px)`;
  board row gets `scroll-snap-type: x proximity` with bays as snap points.
- **Board bar**: 60 px tall; board select rendered as a 44 px button-like
  control; menu items 48 px.
- **Modals**: `min(640px, 94vw)`, inputs 48 px / 16 px text, buttons 48 px,
  field grid 3 → 2 columns under 700 px.
- **Toast**: 52 px, Undo button 44 px.
- Global: `-webkit-tap-highlight-color: transparent`, `touch-action:
  manipulation` on buttons, `100dvh` app height, keep safe-area insets.
- Remove hover-only affordances (`.strip-delete`, dotted-underline hover
  on inline edit) or make them always visible.

### 5d — Verification

- Chromium resized to 1194 × 834 (iPad Pro 11"), 1366 × 1024 (12.9") and
  1180 × 820 (iPad 10th gen): three bays fit, no horizontal overflow
  inside a bay, all targets ≥ 44 px (script the check via
  `getBoundingClientRect` over buttons/inputs).
- Contrast check of each variant's text against its background (WCAG AA
  4.5:1 for cell text; the 15 px cells on yellow and red are the tight
  ones).
- Reducer/storage tests green; lint clean; production build under CSP.
- Final pass on the real iPad: colours at arm's length, tap vs. long-press
  on the larger strips.

**Done when:** a flight strip can be created as arrival/departure/other and
shows yellow/blue/black; vehicles are red; nothing on screen is smaller
than 44 px to tap; three bays fit on the iPad in landscape.

---

## Phase 6 — Strip archive ✅

Decided with the user:

| Question | Decision |
|---|---|
| Scope | **Per board.** Each board carries its own archive; a board export includes it. |
| What is archived | **Every removal, all types.** "Delete" on a strip becomes **Remove** and always archives. Deleting a bay archives its strips. Info/vehicle strips are archived with their message / vehicle ID as the label. |
| Retention | **Capped count**: the newest 500 entries per board; older ones fall off. |
| Archive view | Read the list (label, created, archived); **tap for full details**; **restore** an entry back to a bay of your choice. |

Calls I'll make unless told otherwise:

- Deleting a **board** deletes it whole, archive included (undo brings the
  board back intact). There is no cross-board archive to move it to.
- **Undo** after a removal restores the strip *and* drops its archive
  entry, so undo leaves no ghost record. Restore-from-archive does the same.
- Archive entries are full strip snapshots plus `archivedAt`, `fromBayId`
  and `fromBayName` (the name is stored because the bay may be gone by
  the time you look). Entry id = `stripId:archivedAt`, so a strip removed
  twice makes two entries with no id generation in the reducer.
- Restore puts the strip at the **bottom** of the chosen bay with
  `lastMovedAt = now` (its time-in-bay starts over); the original id is
  kept unless it would collide, in which case a fresh one is used.
- Times display ATC-style: `1432Z`, with the date prefixed (`11 Sep 1432Z`)
  when it isn't today.
- A **Clear archive** action (confirm) lives in the archive view.
- The archive is not printed.

### 6a — Data model + reducer

1. `project.md` §2: `Board.archive: ArchivedStrip[]` (newest first);
   `ArchivedStrip = Strip snapshot + { archivedAt, fromBayId, fromBayName }`.
2. `store.js`
   - `ARCHIVE_LIMIT = 500`; helper `archiveStrips(board, strips, at)` that
     prepends entries and trims.
   - `deleteStrip(boardId, stripId, at = now())` → archives.
   - `deleteBay(boardId, bayId, at = now())` → archives the bay's strips in
     order.
   - `restoreStrip` / `restoreBay` (undo) → also remove the matching
     entries (`stripId` + `archivedAt`).
   - `restoreFromArchive(boardId, entryId, targetBayId, newId?, at = now())`
     → strip back at the end of the bay, entry removed.
   - `clearArchive(boardId)`.
   - `newBoard()` gets `archive: []`; `sanitizeBoard` validates and carries
     entries (drops malformed ones, re-applies the cap); missing → `[]`, so
     existing stored boards need no migration.
3. Tests: archive on remove; cascade on bay delete (bay name captured);
   cap trims oldest; undo removes the entry; restore-from-archive into a
   bay (and into a missing bay → no-op); id collision on restore; sanitize
   round-trip through import.

### 6b — Wording

- Strip edit modals and toasts say **Remove** / "Removed SAS1234 · Undo".
- Bay delete confirm: `Delete bay "X"? Its 3 strips will be archived.`
- Board ⋯ menu gets **Archive… (N)**.

### 6c — Archive view

`ArchiveView.jsx`, a full-screen `<dialog>` (`min(960px, 96vw)` ×
`90dvh`), opened from the board menu:

- Header: board name, entry count, **Clear archive** (danger, confirm),
  Close.
- List, newest first, rows ≥ 52 px: type/kind colour chip · **label**
  (callsign / vehicle ID / message) · created · archived · from bay.
  Same colour language as the board (yellow/blue/black/red/amber chip).
- Tap a row → it expands in place to show every field (route, levels,
  squawk, remarks / notes) plus a **Restore to [bay ▾] → Restore** control.
  Only one row expanded at a time. Restore closes the row, shows a toast
  "Restored SAS1234 to Arrivals".
- Empty state: "Nothing archived yet. Removed strips end up here."
- Mono for callsigns/times, sans for the rest; no hover-only affordances.
- `lib/time.js`: `formatZuluDate(iso, now)` → `1432Z` or `11 Sep 1432Z`.

### 6d — Verification

- Reducer tests green; lint; production build under CSP.
- In Chromium at 1194 × 834: remove a strip → appears in archive with
  correct times and bay; undo → gone from archive; delete a bay with
  strips → all archived with the bay's name; restore one to another bay;
  clear archive; export the board and confirm the archive is in the JSON,
  import it back and confirm it's still there.
- 500-cap check via a scripted loop.

**Done when:** every removed strip can be found in its board's archive with
label, created and archived times; a tap shows the full strip; restore puts
it back on the board; the archive survives reload and export/import.

---

## Working conventions

- One commit per numbered step above, roughly; each phase gets a short
  README update.
- Reducer stays pure and fully tested; components stay thin. If logic
  appears in a component that could be a reducer action, move it.
- Anything type-specific goes through `stripTypes.js`. The test for
  "is this extensible" is: could a 4th strip type be added without
  touching `BayColumn`, `App`, or the DnD handlers?
