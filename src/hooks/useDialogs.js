import { createContext, useContext } from 'react'

export const DialogContext = createContext(null)

/**
 * Promise-based confirm/prompt dialogs:
 *   if (await confirm('Delete bay "X"?')) …
 *   const name = await prompt('Board name', 'Board 2')   // null on cancel
 */
export function useDialogs() {
  const ctx = useContext(DialogContext)
  if (!ctx) throw new Error('useDialogs must be used inside <DialogProvider>')
  return ctx
}
