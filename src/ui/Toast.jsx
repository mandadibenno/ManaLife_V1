import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, m } from 'motion/react'
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react'

const ToastContext = createContext(null)
const ICONS = { success: CheckCircle2, error: CircleAlert, info: Info }

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const timers = useRef(new Map())

  const dismiss = useCallback((id) => {
    setItems((list) => list.filter((t) => t.id !== id))
    window.clearTimeout(timers.current.get(id))
    timers.current.delete(id)
  }, [])

  const push = useCallback(
    (kind, message, opts = {}) => {
      const id = Math.random().toString(36).slice(2)
      setItems((list) => [...list.slice(-2), { id, kind, message, action: opts.action }])
      timers.current.set(id, window.setTimeout(() => dismiss(id), opts.duration || (kind === 'error' ? 6000 : 3500)))
      return id
    },
    [dismiss],
  )

  const api = useMemo(
    () => ({
      success: (msg, o) => push('success', msg, o),
      error: (msg, o) => push('error', msg, o),
      info: (msg, o) => push('info', msg, o),
      dismiss,
    }),
    [push, dismiss],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div className="toasts" aria-live="polite" aria-atomic="false">
          <AnimatePresence initial={false}>
            {items.map((t) => {
              const Icon = ICONS[t.kind] || Info
              return (
                <m.div
                  key={t.id}
                  layout
                  className={`toast toast-${t.kind}`}
                  role={t.kind === 'error' ? 'alert' : 'status'}
                  initial={{ opacity: 0, y: 16, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                >
                  <Icon size={18} aria-hidden />
                  <span className="toast-msg">{t.message}</span>
                  {t.action && (
                    <button
                      type="button"
                      className="toast-action"
                      onClick={() => {
                        t.action.onClick()
                        dismiss(t.id)
                      }}
                    >
                      {t.action.label}
                    </button>
                  )}
                  <button type="button" className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss">
                    <X size={14} />
                  </button>
                </m.div>
              )
            })}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
