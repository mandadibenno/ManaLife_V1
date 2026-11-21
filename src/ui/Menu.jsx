import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { Ellipsis } from 'lucide-react'

/**
 * Small accessible action menu.
 * items: [{ label, icon, onClick, tone: 'danger', disabled }]
 */
export function Menu({ items, label = 'More actions', icon: Icon = Ellipsis, align = 'end', size = 'sm' }) {
  const [open, setOpen] = useState(false)
  const root = useRef(null)
  const id = useId()

  useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => !root.current?.contains(e.target) && setOpen(false)
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        root.current?.querySelector('button')?.focus()
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const list = [...root.current.querySelectorAll('[role="menuitem"]:not([disabled])')]
        const i = list.indexOf(document.activeElement)
        const next = e.key === 'ArrowDown' ? list[(i + 1) % list.length] : list[(i - 1 + list.length) % list.length]
        next?.focus()
      }
    }
    document.addEventListener('pointerdown', onDoc)
    document.addEventListener('keydown', onKey)
    const t = window.setTimeout(() => root.current?.querySelector('[role="menuitem"]')?.focus(), 20)
    return () => {
      window.clearTimeout(t)
      document.removeEventListener('pointerdown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="menu" ref={root}>
      <button
        type="button"
        className={`icon-btn icon-btn-ghost icon-btn-${size}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        aria-label={label}
        title={label}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
      >
        <Icon size={size === 'sm' ? 16 : 19} />
      </button>
      <AnimatePresence>
        {open && (
          <m.div
            id={id}
            role="menu"
            className={`menu-list menu-${align}`}
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.1 } }}
            transition={{ duration: 0.14 }}
          >
            {items.filter(Boolean).map((item) => {
              const ItemIcon = item.icon
              return (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  className={`menu-item ${item.tone === 'danger' ? 'is-danger' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpen(false)
                    item.onClick()
                  }}
                >
                  {ItemIcon && <ItemIcon size={15} aria-hidden />}
                  {item.label}
                </button>
              )
            })}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
