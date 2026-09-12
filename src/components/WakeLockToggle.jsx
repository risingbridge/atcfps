import { useWakeLock } from '../hooks/useWakeLock.js'
import { actions } from '../state/store.js'
import { useStore } from '../state/storeContext.js'

export default function WakeLockToggle() {
  const { state, dispatch } = useStore()
  const enabled = state.settings.keepScreenOn
  const { supported, active, error } = useWakeLock(enabled)

  const title = !supported
    ? 'Screen Wake Lock is not available here (needs HTTPS and a supporting browser)'
    : error
      ? `Wake lock failed: ${error}`
      : enabled
        ? active
          ? 'Screen will stay on'
          : 'Waiting to acquire wake lock'
        : 'Keep the screen from sleeping'

  return (
    <label className={`toggle ${!supported ? 'is-disabled' : ''}`} title={title}>
      <input
        type="checkbox"
        checked={enabled}
        disabled={!supported}
        onChange={(e) => dispatch(actions.setKeepScreenOn(e.target.checked))}
      />
      <span className="toggle-track" aria-hidden="true">
        <span className="toggle-thumb" />
      </span>
      <span className="toggle-label">
        Keep screen on
        <span className={`toggle-dot ${enabled && active ? 'is-active' : ''} ${error ? 'is-error' : ''}`} />
      </span>
    </label>
  )
}
