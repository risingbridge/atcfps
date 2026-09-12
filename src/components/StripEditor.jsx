import { useCallback } from 'react'
import { useDeleteWithUndo } from '../hooks/useDeleteWithUndo.js'
import { actions, leftNeighbour, rightNeighbour } from '../state/store.js'
import { useActiveBoard } from '../state/storeContext.js'
import EditNotesModal from './EditNotesModal.jsx'
import FlightStripModal from './FlightStripModal.jsx'

/** Opens the right edit modal for a strip; handles save + delete. */
export default function StripEditor({ strip, onClose }) {
  const { board, dispatch } = useActiveBoard()
  const { deleteStrip } = useDeleteWithUndo()

  const save = useCallback(
    ({ spanWith, ...patch }) => {
      dispatch(actions.updateStrip(board.id, strip.id, patch))
      if (spanWith !== undefined && spanWith !== (strip.spanBayId ?? null)) {
        dispatch(actions.spanWith(board.id, strip.id, spanWith))
      }
    },
    [dispatch, board.id, strip.id, strip.spanBayId],
  )

  const bayRef = (id) => (id && board.bays[id] ? { id, name: board.bays[id].name } : null)
  const span = {
    value: strip.spanBayId ?? null,
    options: { left: bayRef(leftNeighbour(board, strip.currentBayId)), right: bayRef(rightNeighbour(board, strip.currentBayId)) },
  }

  const remove = useCallback(() => {
    deleteStrip(strip.id)
    onClose()
  }, [deleteStrip, strip.id, onClose])

  if (strip.type === 'flight') {
    return <FlightStripModal initial={strip} onSubmit={save} onClose={onClose} onDelete={remove} span={span} />
  }
  return <EditNotesModal strip={strip} onSubmit={save} onClose={onClose} onDelete={remove} span={span} />
}
