import './app.css'

const RING = ['airborne', 'crosswind', 'downwind', 'base', 'final', 'short final', 'RUNWAY']

/**
 * R0 shell: the URL exists, the pipeline works, and the ring is on screen
 * as a static sketch. Nothing here is interactive yet — see
 * docs/reimagined.md for what comes in R1–R6.
 */
export default function App() {
  return (
    <div className="app">
      <header className="bar">
        <span className="bar-title">ATC Flow Board</span>
        <span className="bar-tag">R0 · shell</span>
        <span className="spacer" />
        <a className="bar-link" href="/atcfps/">
          ← the strip board
        </a>
      </header>

      <main className="stage">
        <section className="ring" aria-label="Runway ring (static sketch)">
          {RING.map((seg, i) => (
            <div key={seg} className={`segment ${seg === 'RUNWAY' ? 'is-runway' : ''}`}>
              <span className="segment-name">{seg}</span>
              {i < RING.length - 1 && <span className="segment-arrow">▸</span>}
            </div>
          ))}
          <div className="segment segment-loop">
            <span className="segment-arrow">↻</span>
          </div>
        </section>

        <p className="note">
          A strip is not a rectangle in a column; it is an object with a state on a process. The runway is a
          ring so circuit traffic goes round; a gesture that changes the state is also the record of the
          clearance. This page is the empty stage for that — the model comes first (R1), then the ring (R2).
        </p>
      </main>
    </div>
  )
}
