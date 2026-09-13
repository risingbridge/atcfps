import { placeById } from '../model/template.js'
import Cell from './Cell.jsx'

/**
 * The runway as a loop, laid out as two rows:
 *   row 1 (flying, left→right):   airborne ▸ crosswind ▸ downwind ▸ base     departed
 *   row 2 (ground/approach):      hold ▸ line up ▸ [RUNWAY] ◂ short final ◂ final    vacated
 * Custom place lists render generically: ring places fill row 1 until the
 * two nearest the runway, which sit on row 2 beside it.
 */
export default function Ring({ runway, byPlace, seqById, now, onOpen, onSwipe, alarmIds }) {
  const ring = runway.places.filter((p) => p.kind === 'ring')
  const dep = runway.places.filter((p) => p.kind === 'dep')
  const rwy = runway.places.find((p) => p.kind === 'runway')
  const approach = ring.slice(-2) // final, short final (or fewer)
  const flying = ring.slice(0, Math.max(0, ring.length - approach.length))
  const vacated = placeById(runway, 'vacated')
  const departed = placeById(runway, 'departed')
  const cell = (p, extra = {}) => (
    <Cell key={p.id} place={p} tokens={byPlace[p.id] ?? []} seqById={seqById} now={now} onOpen={onOpen} onSwipe={onSwipe} alarmIds={alarmIds} {...extra} />
  )
  return (
    <div className="ring">
      <div className="ring-row ring-row-fly">
        {flying.map((p, i) => cell(p, { arrow: i < flying.length - 1 ? '▸' : '↴' }))}
        {departed && cell(departed, { className: 'cell-exit' })}
      </div>
      <div className="ring-row ring-row-ground">
        {dep.map((p) => cell(p, { arrow: '▸' }))}
        {rwy && cell(rwy, { className: 'cell-runway', arrow: '↺' })}
        {[...approach].reverse().map((p) => cell(p, { arrow: '◂' }))}
        {vacated && cell(vacated, { className: 'cell-exit' })}
      </div>
    </div>
  )
}
