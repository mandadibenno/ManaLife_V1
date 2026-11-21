import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronsUpDown, Link2, Lock, Plus, UsersRound } from 'lucide-react'
import { useWorkspace } from '../hooks/workspace'
import { SPACE_TYPES } from '../config/spaceTypes'
import { SpaceIcon } from '../ui/Display'
import { Sheet } from '../ui/Sheet'
import { useIsDesktop } from '../hooks/useMediaQuery'

function SpaceList({ current, onPick }) {
  const { personal, shared, v2 } = useWorkspace()
  const navigate = useNavigate()
  const go = (path) => {
    onPick?.()
    navigate(path)
  }
  const Item = ({ space }) => (
    <button type="button" className={`switch-item ${space.id === current?.id ? 'is-active' : ''}`} onClick={() => go(`/space/${space.id}`)}>
      <SpaceIcon space={space} size={34} />
      <span className="switch-item-text">
        <span className="truncate">{space.name}</span>
        <small>
          {space.isPersonal ? (
            <>
              <Lock size={11} /> Private
            </>
          ) : (
            <>
              {SPACE_TYPES[space.type].label}
              {space.isOwner ? ' · Owner' : ''}
            </>
          )}
        </small>
      </span>
      {space.id === current?.id && <Check size={16} className="switch-item-check" />}
    </button>
  )
  return (
    <div className="switch-list">
      {personal && (
        <>
          <p className="switch-caption">Personal</p>
          <Item space={personal} />
        </>
      )}
      <p className="switch-caption">Shared spaces</p>
      {shared.length ? shared.map((s) => <Item key={s.id} space={s} />) : <p className="switch-empty">No shared spaces yet.</p>}
      <div className="switch-actions">
        <button type="button" className="switch-action" onClick={() => go('/spaces/new')}>
          <Plus size={16} /> New space
        </button>
        <button type="button" className="switch-action" onClick={() => go('/join')}>
          <Link2 size={16} /> Join with code
        </button>
      </div>
      {!v2 && <p className="switch-note">My Space and Couple spaces activate after the 2.0 database update.</p>}
    </div>
  )
}

/** Shows the active space. Desktop: popover. Mobile: bottom sheet. */
export function SpaceSwitcher({ current, variant = 'sidebar' }) {
  const desktop = useIsDesktop()
  const [open, setOpen] = useState(false)
  const root = useRef(null)
  const typeLabel = current ? (current.isPersonal ? 'Only you' : SPACE_TYPES[current.type].label) : ''

  useEffect(() => {
    if (!open || !desktop) return undefined
    const close = (e) => !root.current?.contains(e.target) && setOpen(false)
    const esc = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [open, desktop])

  return (
    <div className={`switcher switcher-${variant}`} ref={root}>
      <button type="button" className="switcher-btn" onClick={() => setOpen((o) => !o)} aria-haspopup="dialog" aria-expanded={open}>
        {current && <SpaceIcon space={current} size={variant === 'pill' ? 28 : 36} />}
        <span className="switcher-text">
          <strong className="truncate">{current?.name || 'Choose a space'}</strong>
          {variant !== 'pill' && (
            <small>
              {current?.isPersonal ? <Lock size={11} /> : <UsersRound size={11} />} {typeLabel}
            </small>
          )}
        </span>
        <ChevronsUpDown size={15} className="switcher-chevron" />
      </button>
      {desktop ? (
        <AnimatePresence>
          {open && (
            <m.div
              className="switcher-pop"
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.12 } }}
              transition={{ duration: 0.18 }}
            >
              <SpaceList current={current} onPick={() => setOpen(false)} />
            </m.div>
          )}
        </AnimatePresence>
      ) : (
        <Sheet open={open} onClose={() => setOpen(false)} title="Switch space" size="sm" initialFocus={false}>
          <SpaceList current={current} onPick={() => setOpen(false)} />
        </Sheet>
      )}
    </div>
  )
}
