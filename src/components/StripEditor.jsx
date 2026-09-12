import { useCallback } from 'react'
import { useDeleteWithUndo } from '../hooks/useDeleteWithUndo.js'
import { actions } from '../state/store.js'
import { useActiveBoard } from '../state/storeContext.js'
import EditNotesModal from './EditNotesModal.jsx'
import FlightStripModal from './FlightStripModal.jsx'

/** Opens the right edit modal for a strip; handles save + delete. */
export default function StripEditor({ strip, onClose }) {
  const { board, dispatch } = useActiveBoard()
  const { deleteStrip } = useDeleteWithUndo()

  const save = useCallback(
    (patch) => dispatch(actions.updateStrip(board.id, strip.id, patch)),
    [dispatch, board.id, strip.id],
  )

  const remove = useCallback(() => {
    deleteStrip(strip.id)
    onClose()
  }, [deleteStrip, strip.id, onClose])

  if (strip.type === 'flight') {
    return <FlightStripModal initial={strip} onSubmit={save} onClose={onClose} onDelete={remove} />
  }
  return <EditNotesModal strip={strip} onSubmit={save} onClose={onClose} onDelete={remove} />
}
