# ATC Flight Strip Board — Project Spec

A configurable web app that simulates an air traffic control flight progress
strip board: user-defined bays (columns), drag-and-drop strips between and
within bays, three strip types (flight / info / vehicle), multiple saved
boards, local persistence, and a "keep screen on" toggle for iPad use.

This is a personal hobby project — no backend, no multi-user sync. Single
device, local persistence via `localStorage`.

---

## 1. Tech stack

- **React** (function components + hooks), built with **Vite**
- **@dnd-kit/core** + **@dnd-kit/sortable** for drag-and-drop (cross-bay
  drops + within-bay reordering). Preferred over `react-beautiful-dnd`,
  which is unmaintained.
- **localStorage** for persistence, wrapped in a `useLocalStorage` hook so
  it can be swapped for IndexedDB later if data volume grows
- Plain CSS (no framework) using a small design-token system — see §5
- No backend, no auth, no database

## 2. Data model

```
AppState
  - boards: { [boardId]: Board }
  - boardOrder: [boardId, ...]
  - activeBoardId: string
  - settings: { keepScreenOn: boolean }

Board
  - id
  - name
  - bayOrder: [bayId, ...]
  - bays: { [bayId]: Bay }
  - strips: { [stripId]: Strip }

Bay
  - id
  - name (user-editable)
  - color (optional, for grouping)
  - stripOrder: [stripId, ...]   // order within this bay

Strip (base fields shared by all types)
  - id
  - type: "flight" | "info" | "vehicle"
  - currentBayId
  - createdAt
  - lastMovedAt
  - colorOverride (optional, manual highlight)

FlightStrip extends Strip
  - callsign
  - aircraftType
  - route                  // e.g. "OSL–CPH"
  - requestedAltitude
  - clearedAltitude
  - squawk
  - remarks

InfoStrip extends Strip
  - message                // quick-add text, e.g. "Turbulence reported"
  - notes                  // starts empty, editable later
  // createdAt doubles as the displayed timestamp

VehicleStrip extends Strip
  - vehicleId               // quick-add text, e.g. "Follow-me 2"
  - notes                   // starts empty, editable later
```

Key design decision: bays store an ordered array of strip IDs
(`stripOrder`) rather than relying only on a `currentBayId` field on each
strip. This makes within-bay reordering a simple array splice and plays
well with dnd-kit's multi-container sortable pattern.

Info and vehicle strips share the same shape (`quickAddField` + `notes`),
so they can share one underlying "quick strip" component/behavior,
parametrized by label ("Message" vs "Vehicle ID"). Flight strips are the
one type with a full multi-field creation form.

## 3. Confirmed behavior decisions

- **Boards:** multiple, switchable (e.g. dropdown or tabs). New boards
  start completely empty — no default bays.
- **Bays:** fully user-defined — add, rename, reorder, delete. Deleting a
  bay that still contains strips deletes those strips too, behind a
  confirm dialog. No special built-in "Archive" bay; if the user wants
  one, they create it like any other bay.
- **Strip creation:**
  - **Flight strip** — full form: callsign, aircraft type, route,
    requested/cleared altitude, squawk, remarks.
  - **Info strip** — quick-add: one text box, type message, hit Enter →
    strip created showing the message plus auto-captured creation
    timestamp. Has a `notes` field that starts empty and is editable
    later (click the strip to edit).
  - **Vehicle strip** — quick-add: one text box for vehicle ID/callsign,
    hit Enter → strip created. Also has an editable `notes` field, same
    pattern as info strips.
- **Field customization:** fixed field sets per type for v1 (not
  user-configurable). Each type is its own small module, so this is easy
  to revisit later.
- **Drag-and-drop:** strips can be dragged between bays and reordered
  within a bay.
- **Visual distinction between types:** small icon + accent color per
  type (not just color, not just shape).
- **Persistence:** `localStorage`, single device, survives refresh.
- **Wake lock:** a "Keep Screen On" toggle using the Screen Wake Lock API
  (`navigator.wakeLock.request('screen')`), well-supported on iPadOS
  16.4+ and Chromium browsers. Needs a secure context (HTTPS or
  localhost). The lock is released automatically on tab
  backgrounding, so it must be re-acquired on `visibilitychange` if the
  toggle is still on when the tab becomes visible again. Toggle state
  persists in `localStorage`.

## 4. Suggested file structure

```
atc-strip-board/
  package.json
  vite.config.js
  index.html
  src/
    main.jsx
    App.jsx
    index.css                  // design tokens + global styles
    lib/
      id.js                    // makeId() helper
      storage.js                // localStorage read/write helpers
      stripTypes.js             // registry: per-type label, icon, color,
                                 // whether it's quick-add vs full-form,
                                 // whether it's editable after creation
    hooks/
      useLocalStorage.js
      useWakeLock.js
    state/
      store.js                  // reducer + actions (see §6)
    components/
      BoardBar.jsx               // board switcher, new board, wake-lock toggle
      BayColumn.jsx               // bay header (rename inline), add-strip
                                    // controls, sortable strip list
      Strip.jsx                   // renders per-type card; click to edit
      NewBayForm.jsx
      NewStripMenu.jsx            // type picker → quick-add input or opens
                                    // the flight form modal
      FlightStripModal.jsx        // create/edit form for flight strips
      EditNotesModal.jsx          // edit message/vehicleId + notes for
                                    // info/vehicle strips
      ConfirmDialog.jsx           // generic confirm (e.g. delete bay)
  README.md
```

The `stripTypes.js` registry is the key extensibility point — adding a
4th strip type later should mean adding one entry to this registry plus
a render/form case, not touching drag-and-drop logic or bay logic at all.

## 5. Visual design direction

Grounded in the real object rather than a generic Kanban look:

- **Board background:** dark control-room charcoal (`#1B1F24`)
- **Strip "paper" base:** warm off-white (`#F0ECE2`), ink text near-black
  (`#22201C`) — literal paper-strip reference
- **Per-type accent:**
  - Flight — neutral paper (default), no tint
  - Info — amber (`#E8B93D`), echoes NOTAM/message slips
  - Vehicle — teal (`#4FA8A0`), distinct from runway/flight colors
- **Structure/chrome accent:** slate blue (`#5C7A99`) for bay headers and
  dividers
- **Typography:**
  - Flight data fields (callsign, altitude, squawk) in a **monospace**
    face (e.g. IBM Plex Mono) — historically accurate, since real strips
    were teleprinter output, not a decorative choice
  - UI chrome (buttons, headers, labels) in a clean sans (e.g. IBM Plex
    Sans / Inter), clearly distinct from the data face
- **Layout:** bays are vertical columns; strips are **wide, short,
  horizontal bars** stacked vertically within a bay — matching how real
  flight progress strips are racked, and a deliberate departure from
  tall Kanban-style cards
- Avoid generic AI-design tells: no all-caps eyebrow labels, no
  gradient washes, no identical-rounded-card-with-soft-shadow treatment
  applied to every element without differentiation by type

## 6. Reducer actions (state.js)

- `createBoard(name)` / `deleteBoard(id)` / `renameBoard(id, name)` /
  `setActiveBoard(id)`
- `addBay(boardId, name)` / `renameBay(boardId, bayId, name)` /
  `reorderBays(boardId, newBayOrder)` / `deleteBay(boardId, bayId)`
  (cascades: removes strips in that bay, requires confirm in UI)
- `createFlightStrip(boardId, bayId, fields)`
- `createQuickStrip(boardId, bayId, type, quickValue)` — used for both
  info and vehicle types
- `updateStrip(boardId, stripId, patch)` — used for edits, including
  notes
- `deleteStrip(boardId, stripId)`
- `moveStrip(boardId, stripId, targetBayId, targetIndex)` — used by
  drag-and-drop for both cross-bay moves and within-bay reordering
- `setKeepScreenOn(boolean)`

## 7. Build phases

**Phase 1 — Core mechanics**
- Board switcher (create/rename/delete boards, empty by default)
- Bay CRUD (add/rename/reorder/delete with confirm-if-non-empty)
- Strip creation: type picker → quick-add (info/vehicle) or full modal
  form (flight)
- Strip rendering per type (icon + accent color)
- Drag-and-drop across and within bays
- `localStorage` persistence of full app state

**Phase 2 — Editing & polish**
- Click-to-edit for vehicle/info notes and quick-add field
- Click-to-edit full form for flight strips
- Confirm dialog for destructive actions (delete bay/strip)

**Phase 3 — Wake lock**
- `useWakeLock` hook + toggle in `BoardBar`
- Re-acquire on `visibilitychange` if toggle is on

**Phase 4 — Nice-to-haves (not required for v1)**
- Export/import a board as JSON (manual backup or sharing a layout)
- Time-in-bay indicator / visual aging for old strips
- Per-bay color coding
- Print-friendly view
- Undo for accidental deletes

## 8. Open items intentionally deferred

These were discussed and deliberately left for later rather than
designed now:
- Per-type custom fields (fixed sets are fine for v1)
- Editing flight strips after creation beyond the basic case (assumed
  straightforward reuse of the creation form, but worth confirming UX
  when built)
- Any multi-device sync — out of scope entirely for this project
