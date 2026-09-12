import { useCallback, useEffect, useRef, useState } from 'react'
import { useDialogs } from '../hooks/useDialogs.js'
import { useNow } from '../hooks/useNow.js'
import { useToast } from '../hooks/useToast.js'
import { FLIGHT_KIND_META, STRIP_TYPES, normalizeFlightKind, stripLabel } from '../lib/stripTypes.js'
import { formatZuluDate } from '../lib/time.js'
import { actions } from '../state/store.js'
import { useActiveBoard } from '../state/storeContext.js'

const FIELD_LABELS = {
  aircraftType: 'Type',
  route: 'Route',
  requestedAltitude: 'Requested',
  clearedAltitude: 'Cleared',
  squawk: 'Squawk',
  remarks: 'Remarks',
  notes: 'Notes',
}

function kindOf(strip) {
  return strip.type === 'flight' ? normalizeFlightKind(strip.flightKind) : undefined
}

/** Full-screen list of removed strips for the active board, with restore. */
export default function ArchiveView({ onClose }) {
  const { board, dispatch } = useActiveBoard()
  const { confirm } = useDialogs()
  const { showToast } = useToast()
  const ref = useRef(null)
  const [openId, setOpenId] = useState(null)
  const [chosenBay, setChosenBay] = useState(board.bayOrder[0] ?? '')
  // fall back to the first bay if the chosen one disappears meanwhile
  const targetBay = board.bays[chosenBay] ? chosenBay : (board.bayOrder[0] ?? '')
  const now = useNow()
  const archive = board.archive ?? []

  useEffect(() => {
    const dlg = ref.current
    dlg.showModal()
    const handleClose = () => onClose()
    dlg.addEventListener('close', handleClose)
    return () => dlg.removeEventListener('close', handleClose)
  }, [onClose])

  const restore = useCallback(
    (entry) => {
      const bay = board.bays[targetBay]
      if (!bay) return
      dispatch(actions.restoreFromArchive(board.id, entry.entryId, bay.id))
      setOpenId(null)
      showToast(`Restored "${stripLabel(entry.strip)}" to ${bay.name}`)
    },
    [board, targetBay, dispatch, showToast],
  )

  async function clear() {
    if (await confirm(`Clear the archive for "${board.name}"? ${archive.length} entries will be gone for good.`, { confirmLabel: 'Clear' })) {
      dispatch(actions.clearArchive(board.id))
    }
  }

  return (
    <dialog ref={ref} className="modal archive" onClick={(e) => e.target === ref.current && ref.current.close()}>
      <div className="archive-body">
        <header className="archive-header">
          <h2 className="modal-title" style={{ margin: 0 }}>
            Archive
            <span className="modal-title-meta">
              {board.name} · {archive.length} {archive.length === 1 ? 'entry' : 'entries'}
            </span>
          </h2>
          <span className="spacer" />
          <button className="btn btn-quiet" onClick={clear} disabled={archive.length === 0}>
            Clear archive
          </button>
          <button className="btn" onClick={() => ref.current.close()}>
            Close
          </button>
        </header>

        {archive.length === 0 ? (
          <p className="archive-empty">Nothing archived yet. Removed strips end up here.</p>
        ) : (
          <ul className="archive-list">
            <li className="archive-row archive-row-head" aria-hidden="true">
              <span />
              <span>Strip</span>
              <span>Created</span>
              <span>Removed</span>
              <span>From bay</span>
            </li>
            {archive.map((entry) => {
              const { strip } = entry
              const def = STRIP_TYPES[strip.type]
              const kind = kindOf(strip)
              const open = openId === entry.entryId
              return (
                <li key={entry.entryId} className={`archive-item ${open ? 'is-open' : ''}`}>
                  <button
                    className="archive-row"
                    aria-expanded={open}
                    onClick={() => setOpenId(open ? null : entry.entryId)}
                  >
                    <span className="archive-chip" data-type={strip.type} data-kind={kind} title={def.label}>
                      {def.icon}
                    </span>
                    <span className="archive-label">
                      {stripLabel(strip)}
                      {kind && FLIGHT_KIND_META[kind].code && (
                        <span className="archive-kind">{FLIGHT_KIND_META[kind].code}</span>
                      )}
                    </span>
                    <span className="archive-time">{formatZuluDate(strip.createdAt, now)}</span>
                    <span className="archive-time">{formatZuluDate(entry.archivedAt, now)}</span>
                    <span className="archive-bay">{entry.fromBayName || '—'}</span>
                  </button>
                  {open && (
                    <div className="archive-details">
                      <dl className="archive-fields">
                        {Object.entries(FIELD_LABELS)
                          .filter(([f]) => strip[f])
                          .map(([f, label]) => (
                            <div key={f} className="archive-field">
                              <dt>{label}</dt>
                              <dd>{strip[f]}</dd>
                            </div>
                          ))}
                        {strip.type === 'info' && (
                          <div className="archive-field archive-field-wide">
                            <dt>Message</dt>
                            <dd>{strip.message}</dd>
                          </div>
                        )}
                      </dl>
                      <div className="archive-restore">
                        <label className="field">
                          <span className="field-label">Restore to</span>
                          <select
                            className="board-select"
                            value={targetBay}
                            onChange={(e) => setChosenBay(e.target.value)}
                            disabled={board.bayOrder.length === 0}
                          >
                            {board.bayOrder.map((id) => (
                              <option key={id} value={id}>
                                {board.bays[id].name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          className="btn btn-primary"
                          onClick={() => restore(entry)}
                          disabled={!board.bays[targetBay]}
                          title={board.bayOrder.length ? undefined : 'Add a bay first'}
                        >
                          Restore
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
