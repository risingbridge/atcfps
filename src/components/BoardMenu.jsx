import { useRef } from 'react'
import { useDialogs } from '../hooks/useDialogs.js'
import { useToast } from '../hooks/useToast.js'
import { exportAll, exportBoard, parseImport, readFileText } from '../lib/exportImport.js'
import { actions } from '../state/store.js'
import { useStore } from '../state/storeContext.js'
import Menu from './Menu.jsx'

export default function BoardMenu() {
  const { state, dispatch } = useStore()
  const { confirm, prompt } = useDialogs()
  const { showToast } = useToast()
  const fileInput = useRef(null)
  const board = state.boards[state.activeBoardId]

  async function rename() {
    const name = await prompt('Rename board', board.name, { confirmLabel: 'Rename' })
    if (name != null) dispatch(actions.renameBoard(board.id, name))
  }

  async function remove() {
    const count = Object.keys(board.strips).length
    const msg = `Delete board "${board.name}"${count ? ` and its ${count} strips` : ''}?`
    if (!(await confirm(msg))) return
    const index = state.boardOrder.indexOf(board.id)
    const snapshot = board
    dispatch(actions.deleteBoard(board.id))
    showToast(`Deleted board "${snapshot.name}"`, {
      actionLabel: 'Undo',
      onAction: () => dispatch(actions.restoreBoard(snapshot, index)),
    })
  }

  async function onFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const boards = parseImport(await readFileText(file))
      for (const b of boards) dispatch(actions.importBoard(b))
      showToast(boards.length === 1 ? `Imported "${boards[0].name || 'board'}"` : `Imported ${boards.length} boards`)
    } catch (err) {
      showToast(`Import failed: ${err.message}`, { tone: 'error' })
    }
  }

  const items = [
    { label: 'Rename board…', onSelect: rename },
    'separator',
    { label: 'Export this board', onSelect: () => exportBoard(board) },
    { label: 'Export all boards', onSelect: () => exportAll(state) },
    { label: 'Import…', onSelect: () => fileInput.current?.click() },
    'separator',
    { label: 'Print', onSelect: () => window.print() },
    'separator',
    { label: 'Delete board', onSelect: remove, danger: true },
  ]

  return (
    <>
      <Menu label="Board menu" items={items} />
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={onFile}
        aria-hidden="true"
        tabIndex={-1}
      />
    </>
  )
}
