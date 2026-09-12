import { useCallback } from 'react'
import { useDialogs } from '../hooks/useDialogs.js'
import { stripLabel } from '../lib/stripTypes.js'
import { actions } from '../state/store.js'
import { useActiveBoard } from '../state/storeContext.js'
import EditNotesModal from './EditNotesModal.jsx'
import FlightStripModal from './FlightStripModal.jsx'

/** Opens the right edit modal for a strip; handles save + delete. */
export default function StripEditor({ strip, onClose }) {
  const { board, dispatch } = useActiveBoard()
  const { confirm } = useDialogs()

  const save = useCallback(
    (patch) => dispatch(actions.updateStrip(board.id, strip.id, patch)),
    [dispatch, board.id, strip.id],
  )

  const remove = useCallback(async () => {
    if (await confirm(`Delete strip "${stripLabel(strip)}"?`)) {
      dispatch(actions.deleteStrip(board.id, strip.id))
      onClose()
    }
  }, [confirm, dispatch, board.id, strip, onClose])

  if (strip.type === 'flight') {
    return <FlightStripModal initial={strip} onSubmit={save} onClose={onClose} onDelete={remove} />
  }
  return <EditNotesModal strip={strip} onSubmit={save} onClose={onClose} onDelete={remove} />
}
