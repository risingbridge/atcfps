import { sanitizeBoard, sanitizePresets } from '../state/store.js'

export const FORMAT = 'atcfps'
export const FORMAT_VERSION = 1

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
}

function slug(name) {
  return (name || 'board').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'board'
}

/** Trigger a JSON download entirely client-side (Blob + <a download>). */
export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function exportBoard(board) {
  downloadJson(`${slug(board.name)}-${stamp()}.json`, {
    format: FORMAT,
    version: FORMAT_VERSION,
    kind: 'board',
    exportedAt: new Date().toISOString(),
    board,
  })
}

export function exportAll(state) {
  downloadJson(`atcfps-all-boards-${stamp()}.json`, {
    format: FORMAT,
    version: FORMAT_VERSION,
    kind: 'boards',
    exportedAt: new Date().toISOString(),
    boards: state.boardOrder.map((id) => state.boards[id]),
    settings: { presets: state.settings?.presets ?? { vehicle: [], info: [] } },
  })
}

/**
 * Parse an export file. Accepts a single-board file, an all-boards file, or
 * (leniently) a bare board object. Returns { boards, presets }: sanitized
 * boards ready for importBoard() and any presets the file carried (old
 * files with `settings.vehicles` still work); throws with a readable
 * message otherwise.
 */
export function parseImport(text) {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Not a JSON file')
  }
  let raw
  if (data?.format === FORMAT && data.kind === 'board') raw = [data.board]
  else if (data?.format === FORMAT && data.kind === 'boards') raw = data.boards
  else if (data?.bays && data?.bayOrder) raw = [data]
  else throw new Error('Not an ATC strip board export')
  if (!Array.isArray(raw) || raw.length === 0) throw new Error('File contains no boards')

  const boards = raw.map((b) => sanitizeBoard(b, 'tmp')).filter(Boolean)
  if (boards.length === 0) throw new Error('No usable boards in file')
  const presets =
    data.kind === 'boards' ? sanitizePresets(data.settings?.presets, data.settings?.vehicles) : { vehicle: [], info: [] }
  return { boards, presets }
}

/** Read a File as text (FileReader keeps it simple across Safari versions). */
export function readFileText(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error ?? new Error('Could not read file'))
    r.readAsText(file)
  })
}
