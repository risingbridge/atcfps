import Cell from './Cell.jsx'

/** Off-flow lanes along the bottom: inbound, outbound, park, vehicles. */
export default function Lanes({ runway, byPlace, seqById, now, onOpen, onSwipe, alarmIds, show }) {
  const lanes = runway.places.filter((p) => p.kind === 'lane' && (!show || show.includes(p.id)))
  return (
    <div className="lanes">
      {lanes.map((p) => (
        <Cell key={p.id} place={p} tokens={byPlace[p.id] ?? []} seqById={seqById} now={now} onOpen={onOpen} onSwipe={onSwipe} alarmIds={alarmIds} className="cell-lane" />
      ))}
    </div>
  )
}
