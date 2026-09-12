import { createContext, useContext } from 'react'

export const ToastContext = createContext(null)

/**
 * showToast(message, { actionLabel, onAction, duration }) — a transient
 * notice at the bottom of the screen, optionally with one action (Undo).
 */
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
