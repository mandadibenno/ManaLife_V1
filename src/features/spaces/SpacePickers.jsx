import { Check } from 'lucide-react'
import { m } from 'motion/react'
import { MODULES, MODULE_ORDER, moduleTitle } from '../../config/modules'
import { SPACE_ICONS, SPACE_ICON_KEYS } from '../../config/icons'
import { ACCENTS, ACCENT_KEYS } from '../../config/accents'
import { useTheme } from '../../hooks/theme'

/** Feature toggles with an optional "show on dashboard" sub-toggle. */
export function ModulePicker({ type, personal = false, enabled, cards, onChange }) {
  const keys = MODULE_ORDER.filter((k) => personal || !MODULES[k].personalOnly)
  const toggle = (key) => {
    const on = enabled.includes(key)
    onChange({ enabled: on ? enabled.filter((k) => k !== key) : [...enabled, key], cards: on ? cards.filter((k) => k !== key) : cards })
  }
  const toggleCard = (key) => onChange({ enabled, cards: cards.includes(key) ? cards.filter((k) => k !== key) : [...cards, key] })
  return (
    <div className="module-picker">
      {keys.map((key) => {
        const Icon = MODULES[key].icon
        const on = enabled.includes(key)
        return (
          <div key={key} className={`module-opt ${on ? 'is-on' : ''}`}>
            <button type="button" className="module-main" onClick={() => toggle(key)} role="checkbox" aria-checked={on}>
              <span className="module-icon">
                <Icon size={18} />
              </span>
              <span className="module-text">
                <strong>{moduleTitle(key, type)}</strong>
                <small>{MODULES[key].blurb}</small>
              </span>
              <span className="module-check" aria-hidden>
                {on && (
                  <m.span initial={{ scale: 0 }} animate={{ scale: 1 }}>
                    <Check size={14} strokeWidth={3} />
                  </m.span>
                )}
              </span>
            </button>
            {on && (
              <label className="module-card">
                <input type="checkbox" checked={cards.includes(key)} onChange={() => toggleCard(key)} />
                Show on dashboard by default
              </label>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function IconPicker({ value, accent, onChange, ...aria }) {
  const { resolved } = useTheme()
  const palette = (ACCENTS[accent] || ACCENTS.violet)[resolved === 'dark' ? 'dark' : 'light']
  return (
    <div className="icon-picker" role="radiogroup" aria-label={aria['aria-labelledby'] ? undefined : 'Icon'} {...aria} style={{ '--pick-bg': palette.soft, '--pick-fg': palette.text, '--pick-ring': palette.base }}>
      {SPACE_ICON_KEYS.map((key) => {
        const Icon = SPACE_ICONS[key]
        return (
          <button key={key} type="button" role="radio" aria-checked={value === key} aria-label={key.replace(/-/g, ' ')} className={`icon-opt ${value === key ? 'is-on' : ''}`} onClick={() => onChange(key)}>
            <Icon size={18} />
          </button>
        )
      })}
    </div>
  )
}

export function AccentPicker({ value, onChange, ...aria }) {
  const { resolved } = useTheme()
  return (
    <div className="accent-picker" role="radiogroup" aria-label={aria['aria-labelledby'] ? undefined : 'Colour'} {...aria}>
      {ACCENT_KEYS.map((key) => {
        const p = ACCENTS[key][resolved === 'dark' ? 'dark' : 'light']
        return (
          <button key={key} type="button" role="radio" aria-checked={value === key} aria-label={ACCENTS[key].label} title={ACCENTS[key].label} className={`accent-opt ${value === key ? 'is-on' : ''}`} style={{ '--swatch': p.base }} onClick={() => onChange(key)}>
            {value === key && <Check size={14} strokeWidth={3} />}
          </button>
        )
      })}
    </div>
  )
}
