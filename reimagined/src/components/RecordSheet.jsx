import { useEffect, useRef, useState } from 'react'
import { downloadText, eventText, shiftCsv } from '../lib/record.js'
import { formatZulu } from '../lib/time.js'
import { actions } from '../model/store.js'
import { useStore } from '../state/storeContext.js'

/** History: every token that left the board, with its log; shift export; restore. */
export default function RecordSheet({ onClose }) {
  const { state, dispatch } = useStore()
  const ref = useRef(null)
  const [openId, setOpenId] = useState(null)

  useEffect(() => {
    const dlg = ref.current
    dlg.showModal()
    const h = () => onClose()
    dlg.addEventListener('close', h)
    return () => dlg.removeEventListener('close', h)
  }, [onClose])

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16)

  return (
    <dialog ref={ref} className="sheet sheet-tall" onClick={(e) => e.target === ref.current && ref.current.close()}>
      <div className="sheet-body">
        <header className="card-head">
          <span className="card-callsign">Record</span>
          <span className="card-place">{state.history.length} completed · {Object.keys(state.tokens).length} on the board</span>
          <span className="spacer" />
          <button className="btn" onClick={() => downloadText(`flow-shift-${stamp}.csv`, shiftCsv(state), 'text/csv')}>
            Export CSV
          </button>
          <button className="btn" onClick={() => window.print()}>
            Print
          </button>
          <button className="btn btn-quiet btn-danger" onClick={() => dispatch(actions.clearHistory())} disabled={state.history.length === 0}>
            Clear
          </button>
          <button className="btn" onClick={() => ref.current.close()}>
            Close
          </button>
        </header>

        {state.history.length === 0 ? (
          <p className="help">Nothing completed yet. Transferred and removed tokens end up here with their logs.</p>
        ) : (
          <ul className="record-list">
            {state.history.map((t) => {
              const first = t.events[0]
              const last = t.events[t.events.length - 1]
              const open = openId === t.id
              return (
                <li key={t.id} className={`record-item ${open ? 'is-open' : ''}`}>
                  <button className="record-row" onClick={() => setOpenId(open ? null : t.id)} aria-expanded={open}>
                    <span className="record-frame" data-frame={t.kind === 'vehicle' ? 'vehicle' : t.kind === 'info' ? 'info' : t.intent} />
                    <span className="record-callsign">{t.callsign || t.kind}</span>
                    <span className="record-meta">{[t.type, state.runways[t.runwayId]?.name && `RWY ${state.runways[t.runwayId].name}`].filter(Boolean).join(' · ')}</span>
                    <span className="record-time">{first ? formatZulu(first.at) : ''} → {last ? formatZulu(last.at) : ''}</span>
                    <span className="record-last">{last ? eventText(last) : ''}</span>
                  </button>
                  {open && (
                    <div className="record-details">
                      <ol className="log">
                        {t.events.map((e, i) => (
                          <li key={i} className={`log-item log-${e.type}`}>
                            <span className="log-time">{formatZulu(e.at)}</span>
                            <span className="log-text">{eventText(e)}</span>
                          </li>
                        ))}
                      </ol>
                      <div className="row">
                        <span className="spacer" />
                        <button className="btn" onClick={() => { dispatch(actions.restoreToken(t)); setOpenId(null) }} disabled={!state.runways[t.runwayId]}>
                          Restore to {state.runways[t.runwayId]?.places.find((p) => p.id === t.placeId)?.name ?? t.placeId}
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </dialog>
  )
}
