import { useCallback, useMemo, useState } from 'react'
import { DialogContext } from '../hooks/useDialogs.js'
import ConfirmDialog from './ConfirmDialog.jsx'

export default function DialogProvider({ children }) {
  const [request, setRequest] = useState(null)

  const open = useCallback(
    (req) =>
      new Promise((resolve) => {
        setRequest({ ...req, resolve })
      }),
    [],
  )

  const api = useMemo(
    () => ({
      /** Resolves true when confirmed, false otherwise. */
      confirm: (message, opts = {}) =>
        open({ kind: 'confirm', message, danger: true, confirmLabel: 'Delete', ...opts }).then((r) => r === true),
      /** Resolves the entered string, or null on cancel. */
      prompt: (title, defaultValue = '', opts = {}) =>
        open({ kind: 'prompt', title, defaultValue, ...opts }).then((r) => (typeof r === 'string' ? r : null)),
    }),
    [open],
  )

  const onDone = useCallback(
    (result) => {
      setRequest((r) => {
        r?.resolve(result)
        return null
      })
    },
    [],
  )

  return (
    <DialogContext.Provider value={api}>
      {children}
      {request && <ConfirmDialog key={request.title ?? request.message} request={request} onDone={onDone} />}
    </DialogContext.Provider>
  )
}
