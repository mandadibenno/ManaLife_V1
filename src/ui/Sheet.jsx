import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, m, useDragControls } from 'motion/react'
import { X } from 'lucide-react'
import { useIsDesktop } from '../hooks/useMediaQuery'
import { ease } from '../motion'

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
let openCount = 0

/**
 * Responsive dialog: a centred card on desktop, a draggable bottom sheet on phones.
 * Traps focus, closes on Esc / backdrop / swipe down, restores focus on close.
 */
export function Sheet({ open, onClose, title, description, children, footer, size = 'md', dismissable = true, initialFocus = true }) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <SheetInner onClose={onClose} title={title} description={description} footer={footer} size={size} dismissable={dismissable} initialFocus={initialFocus}>
          {children}
        </SheetInner>
      )}
    </AnimatePresence>,
    document.body,
  )
}

function SheetInner({ onClose, title, description, children, footer, size, dismissable, initialFocus }) {
  const desktop = useIsDesktop()
  const panel = useRef(null)
  const titleId = useId()
  const descId = useId()
  const drag = useDragControls()
  const close = () => dismissable && onClose?.()

  useEffect(() => {
    const previous = document.activeElement
    openCount += 1
    document.documentElement.classList.add('has-sheet')
    const focusTimer = window.setTimeout(() => {
      if (!panel.current) return
      const auto = panel.current.querySelector('[autofocus],[data-autofocus]')
      const first = initialFocus ? auto || panel.current.querySelector('input,select,textarea') : null
      ;(first || panel.current).focus({ preventScroll: true })
    }, 60)
    return () => {
      window.clearTimeout(focusTimer)
      openCount -= 1
      if (openCount <= 0) document.documentElement.classList.remove('has-sheet')
      if (previous && previous.focus) previous.focus({ preventScroll: true })
    }
  }, [initialFocus])

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      close()
      return
    }
    if (e.key !== 'Tab' || !panel.current) return
    const items = [...panel.current.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null)
    if (!items.length) return
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  const variants = desktop
    ? { initial: { opacity: 0, scale: 0.96, y: 12 }, animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.26, ease } }, exit: { opacity: 0, scale: 0.97, y: 8, transition: { duration: 0.16 } } }
    : { initial: { y: '100%' }, animate: { y: 0, transition: { type: 'spring', stiffness: 420, damping: 40 } }, exit: { y: '100%', transition: { duration: 0.22, ease } } }

  return (
    <div className="sheet-root" onKeyDown={onKeyDown}>
      <m.div className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={close} aria-hidden />
      <m.div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={`sheet sheet-${size} ${desktop ? 'is-dialog' : 'is-bottom'}`}
        {...variants}
        drag={desktop || !dismissable ? false : 'y'}
        dragControls={drag}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 110 || info.velocity.y > 600) close()
        }}
      >
        {!desktop && (
          <div className="sheet-grabber" onPointerDown={(e) => drag.start(e)} aria-hidden>
            <span />
          </div>
        )}
        {(title || dismissable) && (
          <header className="sheet-head" onPointerDown={(e) => !desktop && drag.start(e)}>
            <div className="sheet-titles">
              {title && <h2 id={titleId}>{title}</h2>}
              {description && <p id={descId}>{description}</p>}
            </div>
            {dismissable && (
              <button type="button" className="icon-btn icon-btn-soft icon-btn-sm" onClick={close} aria-label="Close">
                <X size={16} />
              </button>
            )}
          </header>
        )}
        <div className="sheet-body">{children}</div>
        {footer && <footer className="sheet-foot">{footer}</footer>}
      </m.div>
    </div>
  )
}
