# Reimagining the strip board

A concept for a successor to this app — designed from what the board is
*for*, not from what paper strips looked like. Written 2026-09-13 after
twelve phases of building the faithful version.

## 1. What the strip board is actually for

Strip the paper away and the job is six things:

1. **Externalise the picture** — every aircraft and vehicle the controller
   is responsible for, at a glance, with the facts that matter (who, what,
   where to, what they've been given).
2. **Hold state** — where each one is in its process: inbound, on final,
   cleared to land, landed, vacated; taxiing, holding, lined up, rolling,
   airborne. The strip's *position* in a bay is a manual proxy for this.
3. **Sequence** — the order things will use a runway, and the gaps between.
4. **Record clearances** — the pen scribble on the strip is the legal
   record of what was said.
5. **Guard the runway** — one of the only genuinely safety-critical facts
   on the board is *who is on or about to use the runway right now*.
6. **Manage attention** — who has been waiting, who is due to call, what
   was promised for a time that is now.

Paper does 1–4 by hand and leaves 5 and 6 entirely to the controller's
head. Every digital recreation (ours included) inherits that split,
because it keeps the paper's data model: a strip is a rectangle whose
meaning is its column.

## 2. The shift

**A strip is not a rectangle in a column. It is an object with a state on
a process.** Once the board knows the state — not just "third from the
top in the bay called RWY" — it can do the two things paper never could:
guard the runway and manage attention. And on a touch screen, the act of
*changing* the state can be the gesture that also *records the clearance*,
so the record writes itself.

Everything below follows from that.

## 3. The flow board

### Layout (iPad, landscape)

```
┌──────────────────────────────────────────────────────────────────────┐
│ 14:32:07Z   RWY 01L in use ▾        ⚠ 2 on runway   ⏱ NAX22K due  │  attention bar
├───────────────┬──────────────────────────────────┬───────────────────┤
│  INBOUND      │  RUNWAY 01L  (the flow)           │  OUTBOUND         │
│  (by ETA)     │                                  │  (ground)         │
│               │  final ▸ short final ▸ [RUNWAY] ▸ vacated             │
│  SAS1234 14:41│      ┌───────┐   ┌──────┐   ┌────────────┐          │  NAX22K   push  │
│  NAX987  14:44│      │DLH42  │   │      │   │WIF12 ✓     │          │  KLM77    taxi  │
│  BAW33   14:52│      └───────┘   └──────┘   └────────────┘          │  ▸ holding A1   │
│               │  ◂ departed ◂ airborne ◂ [RUNWAY] ◂ line up ◂ hold  │  SAS55    ready │
│               │                                  │                   │
├───────────────┴──────────────────────────────────┴───────────────────┤
│  VEHICLES  Follow-me 2 [TWY A ● RWY ○]   Sweeper 1 [TWY B ●]  ...    │  vehicle rail
└──────────────────────────────────────────────────────────────────────┘
```

- **The flow** is the runway as a process with segments. The **RUNWAY
  segment is shared** — anything in it, from any direction or from the
  vehicle rail, is *on the runway*.
- **The flow is a ring, not a line** (circuit traffic is a large share of
  the work here). Around the runway: `airborne ▸ crosswind ▸ downwind ▸
  base ▸ final ▸ short final ▸ [RUNWAY]` and back to `airborne`. A
  touch-and-go simply goes round again and its **circuit count** ticks
  up. Straight-in arrivals join the ring at *final*; departures leave it
  at *airborne* to *departed*; a full stop leaves the runway to
  *vacated*. Segments are configurable per runway (add, rename, reorder,
  remove); the template above is only the starting set.
- **Inbound** and **Outbound** lanes hold everything not yet on the ring:
  inbound in sequence order (ETA optional, drives a time view when
  present), outbound by readiness.
- **Lanes are switchable by position.** Some days one iPad is tower +
  ground, some days tower only: a *position profile* chooses which lanes
  are shown (inbound / outbound-ground / vehicles) without touching the
  data.
- **Vehicles** live on a rail with *permission areas* (taxiways, runway).
  A vehicle whose permission includes the runway is counted as on it.
- **Attention bar** replaces "look at the whole board every few seconds":
  it lists what the board has computed needs the controller's eyes, and
  shows whether sound is muted.
- **Runways are a list.** One is built first; the model never assumes it
  is the only one, so a second (parallel or crossing, sharing the
  occupancy rule) is an addition, not a rewrite.

Bays still exist underneath — a segment *is* a bay — but the user never
configures columns. They pick a runway template and the segments come
with it.

### Tokens (which turn out to be strips)

Everything the controller wants without tapping — callsign, type,
cleared level, squawk, wake category, runway, stand — is roughly what a
paper strip shows. So the token keeps the strip's *shape* (a wide,
two-row tile in the Phase 11 frame language) and changes its *nature*:
it carries a state and a log. Tap expands it into a card with the level
picker, remarks, timers and the event history for that flight.

Two kinds of flight, because they need different things:

- **IFR** — the full field set as today, plus wake category, runway and
  stand.
- **VFR** — fewer fields (no route; squawk defaults to 7000), may live in
  the circuit, shows its **circuit count**, and can be created in two
  taps (callsign + type from recall).

Every token bound for the runway shows its **sequence number** — the
landing order across circuit and straight-in traffic together ("number
2, follow the Cessna on downwind"). Dragging a token in the ring or the
inbound lane re-sequences; numbers recompute as aircraft land or go
around. The attention bar shows who is *next*.

### One hand, on a desk

The iPad lies flat and the other hand is on the radio. So:

- Every routine action is **one-handed**: swipe to advance (skipping
  states allowed), tap to expand, thumb-reachable controls along the
  bottom edge. Two-finger gestures exist only for rare things (runway
  change) and always have a menu equivalent.
- Drags are short: the ring is laid out so the next segment is never far
  from the current one, and a token can be advanced without lifting it
  across the screen.
- Nothing important lives in a corner a thumb cannot reach from the
  bottom half.

### Gestures that are the record

| Gesture | Meaning | What gets recorded |
|---|---|---|
| Drag token to the next segment | Clearance / state change | "SAS1234 cleared to land 1432Z" |
| **Swipe right** on a token | Advance one state (one-handed) | Same, without aiming |
| **Swipe left** | Step back (undo a state, or a go-around when on final) | "SAS1234 go-around 1436Z" |
| Long-press | Radial menu: level · hold · remark · highlight · remove | Whatever was chosen |
| Drag token onto another token | Link (follow-me with aircraft, formation) | "linked" |
| Pinch the board | Zoom between overview and runway focus | — |
| Two fingers on the flow | Reverse runway direction (change of runway) | "RWY 19R in use 1450Z" |

The essential idea: the controller never "writes down" a clearance. They
*give* it, on the token, and the log line, timestamp and state change are
the same action. The paper-era "then annotate the strip" step disappears.

### Three lights

Bright daylight, night and normal indoor all happen. Three themes, one
tap apart in the attention bar and remembered: **day** (light, high
contrast), **indoor** (today's charcoal) and **night** (dimmed, alerts
in a red that does not blind). Contrast is audited per theme, as today.

### Entry: almost no typing

The two things that cost the most today are typing to create strips and
writing things down. The second disappears by design (gestures are the
record). For the first:

- **Recall** — start a callsign and the flight fills from history (type,
  wake, usual runway/stand, VFR/IFR); regular traffic is two taps.
- **A callsign keypad**, not the iOS keyboard: large uppercase
  alphanumerics, no autocorrect, digits and letters on one layer. It
  covers 95% of entry (callsigns, types, squawks, levels) and never
  hides half the board.
- Presets for vehicles, info and dividers carry over as they are.
- Structured pickers everywhere a value has a small domain (levels,
  wake, runway, stand list).

### Time as a first-class axis

- Inbound lane sorts by **ETA**, entered once (or estimated from the
  previous ETA when a flight is recurring). Gaps become visible, which is
  what sequencing is.
- Any token can carry a **timer**: "expect at 14:45", "call back in 5".
  The token shows the countdown; the attention bar fires when it's due.
- **Holding time** is shown automatically on anything in a holding
  segment (the age counter, but now it means something specific).

### The attention engine

Entirely local rules over the state, evaluated every second:

- **Runway occupancy** — two tokens in the RUNWAY segment, or one on the
  runway while another is in *short final*: red bar, both tokens pulse,
  tone. Circuit traffic makes this the common case, not the rare one —
  a touch-and-go on the runway while number 2 turns final is exactly
  what the rule is for.
- **Vehicle vs. traffic** — a vehicle with runway permission while an
  aircraft is on final.
- **Stale** — a token unchanged for longer than its segment's norm.
- **Due** — a timer reached.
- **Missed step** — a token that skipped a segment (landed without
  "cleared to land" recorded) is flagged, not blocked: the board never
  refuses a controller, it asks afterwards.

Alerts are visual (bar + token pulse) **and audible** — this is safety
equipment, and a screen you are not looking at must still get your
attention. The tone is generated on the device (Web Audio, no files, no
network). Sound is **on by default** and can be muted in Settings; the
mute state is shown in the attention bar so a silenced board is obvious.
Only the runway-conflict class of alert sounds; "stale" and "timer due"
stay visual.

### Handoffs

Aircraft come from and go to other positions (approach, ground, the next
sector), even though nothing is networked. **Received** and
**Transferred** are states with a time on the token — the first and last
lines of its log — and *transferred* is how a token leaves the board in
the normal case, distinct from *removed*.

### The record

Every state change is an event: `{ token, from, to, at }`. The archive
becomes a per-flight **log** — what was cleared, when, in order, from
*received* to *transferred* — kept for personal review on the device and
exportable as a **clean per-shift record** (CSV, and a printable page)
for the cases where a formal record must be retained. No free text needed
for the common case; remarks stay for the rest.

### Escape hatches (this is where structured systems usually fail)

- A **park** area where any token can be dropped with no state at all —
  the paper board's freedom, kept for the cases the model didn't foresee.
- **Go-around** is a first-class transition: from *final*, *short final*
  or the *runway* back into the ring at *airborne* — the same path a
  touch-and-go takes, logged as a go-around instead.
- **Runway change** flips the flow; tokens keep their state.
- Any segment can be **renamed or added** for a specific airport (a
  displaced-threshold segment, an intersection departure point) — the
  model is a list of segments per direction, nothing more rigid.
- Nothing is ever blocked. The board flags; the human decides.

## 4. Why this is different, not just newer

- Existing electronic strip systems are still strips: rectangles you
  drag between bays, with the meaning in your head. Here the meaning is
  in the model, so the board can help.
- The clearance record is a *by-product of giving the clearance*, not a
  second task.
- Runway occupancy and timing — the two things that actually hurt people
  when they go wrong — are computed, not remembered.
- It is designed for a thumb on glass: one gesture per decision, large
  targets, no keyboard in the loop after setup.

## 5. What it is not

- Not a radar or a surveillance display. It knows only what the
  controller tells it, exactly like paper.
- Not a decision-maker. It never refuses or reorders on its own.
- Not networked. Same local-only constraint as today; the model runs on
  the device.

## 6. How to get there

Keep the current app as it is — it is the faithful version and it works.
Build the successor as a separate track and let the two coexist until
the new one has earned it.

| Phase | What | Why first |
|---|---|---|
| **R0** — Paper prototype | Mock the flow board on the iPad (a design canvas, or printed) and *walk a real session through it* — a shift's worth of movements. No code. | Gestures and segment sets are the whole idea; they must be tested by hand before a line is written. |
| **R1** — Model | Segments, tokens, states, events; a pure reducer with the transition table and the log. Imports today's boards (a bay becomes a segment). | Same discipline that made v1 solid: the model first, tested, before any UI. |
| **R2** — The flow | The runway band with tokens, drag-between-segments, swipe to advance/back, event log on the card. | The core interaction; everything else hangs off it. |
| **R3** — Lanes and time | Inbound by ETA, outbound by readiness, timers, holding time. | Sequencing is the second job of the board. |
| **R4** — Attention | Occupancy rules, vehicle vs. traffic, stale, due. The bar and the pulse. | The payoff — the thing paper could not do. |
| **R5** — Vehicles and layouts | Vehicle rail with permission areas; runway templates (single, parallel, crossing); runway change. | Generalises the single-runway case you'd validate first. |
| **R6** — Record | Per-flight log view, shift export, replay. | Closes the loop with the archive you already rely on. |

Each phase keeps the local-only audit, the touch-target and contrast
audits, and the "verify on the real iPad" rule from this project.

## 7. Answers so far (2026-09-13)

- **Segments are configurable.** The model is a list of segments per
  direction; a template gives a starting set (final · short final ·
  runway · vacated / holding point · line up · roll · airborne) and any
  segment can be added, renamed, reordered or removed per runway.
- **ETA is nice-to-have.** Sequence order is the primary ordering of the
  inbound lane; ETA is an optional field that, when present, drives a
  time-sorted view and gap display.
- **Skipping states is allowed.** A drag may land on any segment and a
  swipe may be repeated; the log records the transition that happened
  (e.g. "final → vacated") and the attention engine may *flag* a skipped
  step afterwards, never block it.
- **Audible alerts: both tone and visual, because this is safety.** Sound
  on by default, mutable in Settings, with the muted state visible on the
  board. Runway-conflict alerts only; the rest stay visual.

Round two (2026-09-13):

- **Positions vary by day** → position profiles switch lanes on and off.
- **Circuit traffic is a large share** → the flow is a ring with a circuit
  count; touch-and-go and go-around are transitions on it.
- **Always visible: callsign, type, cleared level, squawk, wake, runway,
  stand** → tokens keep the strip's two-row shape; they change in nature,
  not in size.
- **Process line, not a map** → no per-airfield drawing.
- **Landing sequence numbered and auto-updated** across circuit and
  straight-in traffic.
- **VFR and IFR are distinct kinds.**
- **One runway now, modelled as a list** so more can follow.
- **Biggest costs today: typing to create strips, writing things down** →
  the entry section (recall, callsign keypad) and gestures-as-record are
  the highest-value parts of the concept, and should be in R2, not later.

Round three (2026-09-13):

- **Flat on the desk, one hand free** → one-handed gestures for every
  routine action; controls along the bottom edge; short drags around the
  ring.
- **Daylight, night and indoor** → three themes, one tap apart, each
  contrast-audited.
- **Log is for personal review and a formal record** → on-device history
  per flight plus a clean per-shift export (CSV + printable).
- **Handoffs both ways** → *received* and *transferred* are states with
  times; *transferred* is the normal way a token leaves the board.

**Built (2026-09-13):** R0–R6 exist in `reimagined/` and deploy to
`/atcfps/reimagined/`. What was verified in Chromium at iPad size: swipe
to advance / back; circuit traffic going round with the sequence
following; go-around into the circuit; a vehicle cleared onto the runway
while traffic is on short final (alarm, pulse, tone); VFR created in two
taps from the keypad; ETA re-sequencing; timers; profiles; runway
editing and a second, crossing runway; the record with CSV export;
themes. What still needs the real iPad: the swipe under a real thumb,
the long-press vs. flick distinction, and the tone through the speaker.
