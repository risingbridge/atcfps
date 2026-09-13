import { useEffect, useRef } from 'react'
import { actions } from '../state/store.js'
import { useStore } from '../state/storeContext.js'
import PresetList from './PresetList.jsx'

/** App settings: pre-made vehicle and info strips offered as one-tap quick-add. */
export default function SettingsDialog({ onClose }) {
  const { state, dispatch } = useStore()
  const ref = useRef(null)
  const presets = state.settings.presets ?? { vehicle: [], info: [], divider: [] }

  useEffect(() => {
    const dlg = ref.current
    dlg.showModal()
    const handleClose = () => onClose()
    dlg.addEventListener('close', handleClose)
    return () => dlg.removeEventListener('close', handleClose)
  }, [onClose])

  return (
    <dialog ref={ref} className="modal settings" onClick={(e) => e.target === ref.current && ref.current.close()}>
      <div className="modal-body">
        <header className="settings-header">
          <h2 className="modal-title" style={{ margin: 0 }}>
            Settings
          </h2>
          <span className="spacer" />
          <button className="btn" onClick={() => ref.current.close()}>
            Close
          </button>
        </header>

        <section className="settings-section">
          <h3 className="settings-title">Regular vehicles</h3>
          <p className="settings-help">
            One-tap buttons when adding a vehicle strip, in this order. A note is pre-filled on the strip and can be
            changed there. Shared by all boards.
          </p>
          <PresetList
            presets={presets.vehicle}
            onChange={(list) => dispatch(actions.setPresets('vehicle', list))}
            labelName="Vehicle ID"
            autoFocus
          />
        </section>

        <section className="settings-section">
          <h3 className="settings-title">Regular info strips</h3>
          <p className="settings-help">One-tap buttons when adding an info strip. Same rules as vehicles.</p>
          <PresetList
            presets={presets.info}
            onChange={(list) => dispatch(actions.setPresets('info', list))}
            labelName="Message"
          />
        </section>

        <section className="settings-section">
          <h3 className="settings-title">Dividers</h3>
          <p className="settings-help">
            Labels offered when adding a divider to a bay (bay menu → Add divider…), e.g. CLEARED TO LAND.
          </p>
          <PresetList
            presets={presets.divider ?? []}
            onChange={(list) => dispatch(actions.setPresets('divider', list))}
            labelName="Divider label"
            noNotes
          />
        </section>
      </div>
    </dialog>
  )
}
