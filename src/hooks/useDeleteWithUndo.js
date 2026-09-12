import { useCallback } from 'react'
import { useToast } from './useToast.js'
import { useDialogs } from './useDialogs.js'
import { stripLabel } from '../lib/stripTypes.js'
import { actions } from '../state/store.js'
import { useActiveBoard } from '../state/storeContext.js'

/** Delete helpers that snapshot first and offer Undo in a toast. */
export function useDeleteWithUndo() {
  const { board, dispatch } = useActiveBoard()
  const { showToast } = useToast()
  const { confirm } = useDialogs()

  const deleteStrip = useCallback(
    (stripId) => {
      const strip = board.strips[stripId]
      if (!strip) return
      const index = board.bays[strip.currentBayId]?.stripOrder.indexOf(stripId) ?? 0
      dispatch(actions.deleteStrip(board.id, stripId))
      showToast(`Deleted "${stripLabel(strip)}"`, {
        actionLabel: 'Undo',
        onAction: () => dispatch(actions.restoreStrip(board.id, strip, index)),
      })
    },
    [board, dispatch, showToast],
  )

  const deleteBay = useCallback(
    async (bayId) => {
      const bay = board.bays[bayId]
      if (!bay) return false
      const n = bay.stripOrder.length
      if (n && !(await confirm(`Delete bay "${bay.name}" and its ${n} strip${n === 1 ? '' : 's'}?`))) return false
      const index = board.bayOrder.indexOf(bayId)
      const strips = Object.fromEntries(bay.stripOrder.map((id) => [id, board.strips[id]]))
      dispatch(actions.deleteBay(board.id, bayId))
      showToast(`Deleted bay "${bay.name}"${n ? ` (${n} strip${n === 1 ? '' : 's'})` : ''}`, {
        actionLabel: 'Undo',
        onAction: () => dispatch(actions.restoreBay(board.id, bay, strips, index)),
      })
      return true
    },
    [board, dispatch, showToast, confirm],
  )

  return { deleteStrip, deleteBay }
}
