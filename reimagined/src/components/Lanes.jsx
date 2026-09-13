import Cell from './Cell.jsx'

/** Off-flow lanes along the bottom: inbound, outbound, park, vehicles. */
export default function Lanes({ runway, byPlace, seqById, now, onOpen, onSwipe, alarmIds, show, onSortByEta }) {
  const lanes = runway.places.filter((p) => p.kind === 'lane' && (!show || show.includes(p.id)))
  const hasEta = (byPlace.inbound ?? []).some((t) => t.eta)
  return (
    <div className="lanes" data-lanes={lanes.length}>
      {lanes.map((p) => (
        <Cell
          key={p.id}
          place={p}
          tokens={byPlace[p.id] ?? []}
          seqById={seqById}
          now={now}
          onOpen={onOpen}
          onSwipe={onSwipe}
          alarmIds={alarmIds}
          className="cell-lane"
          tools={
            p.id === 'inbound' && hasEta ? (
              <button className="btn btn-small" onClick={onSortByEta} title="Re-sequence by ETA">
                by ETA
              </button>
            ) : null
          }
        />
      ))}
    </div>
  )
}
