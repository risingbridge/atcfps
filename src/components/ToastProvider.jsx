import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ToastContext } from '../hooks/useToast.js'

const DEFAULT_DURATION = 8000

export default function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const timer = useRef(null)

  const dismiss = useCallback(() => {
    clearTimeout(timer.current)
    setToast(null)
  }, [])

  const showToast = useCallback(
    (message, { actionLabel, onAction, duration = DEFAULT_DURATION, tone = 'info' } = {}) => {
      clearTimeout(timer.current)
      setToast({ id: Date.now(), message, actionLabel, onAction, tone })
      timer.current = setTimeout(() => setToast(null), duration)
    },
    [],
  )

  useEffect(() => () => clearTimeout(timer.current), [])

  const api = useMemo(() => ({ showToast, dismiss }), [showToast, dismiss])

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast && (
        <div className={`toast toast-${toast.tone}`} role="status">
          <span className="toast-message">{toast.message}</span>
          {toast.actionLabel && (
            <button
              className="btn btn-toast"
              onClick={() => {
                toast.onAction?.()
                dismiss()
              }}
            >
              {toast.actionLabel}
            </button>
          )}
          <button className="btn btn-quiet btn-icon" onClick={dismiss} aria-label="Dismiss">
            ✕
          </button>
        </div>
      )}
    </ToastContext.Provider>
  )
}
