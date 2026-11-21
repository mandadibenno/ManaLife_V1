import { useEffect, useRef, useState } from 'react'
import { m, useInView } from 'motion/react'
import { Check } from 'lucide-react'
import { initials } from '../lib/format'
import { SPACE_ICONS } from '../config/icons'
import { ACCENTS } from '../config/accents'
import { useTheme } from '../hooks/theme'
import { ease } from '../motion'

export function Card({ as: Tag = 'div', className = '', interactive = false, children, ...rest }) {
  return (
    <Tag className={`card ${interactive ? 'card-interactive' : ''} ${className}`} {...rest}>
      {children}
    </Tag>
  )
}

export function CardHeader({ title, subtitle, icon: Icon, action, className = '' }) {
  return (
    <div className={`card-head ${className}`}>
      {Icon && (
        <span className="card-head-icon" aria-hidden>
          <Icon size={16} />
        </span>
      )}
      <div className="card-head-text">
        <h3>{title}</h3>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action && <div className="card-head-action">{action}</div>}
    </div>
  )
}

export function Badge({ tone = 'neutral', children, icon: Icon, className = '' }) {
  return (
    <span className={`badge badge-${tone} ${className}`}>
      {Icon && <Icon size={12} aria-hidden />}
      {children}
    </span>
  )
}

const AVATAR_TINTS = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--c6)', 'var(--c7)', 'var(--c8)']
function tintFor(seed = '') {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return AVATAR_TINTS[Math.abs(h) % AVATAR_TINTS.length]
}

export function Avatar({ name = '', id, size = 32, className = '', ring = false }) {
  return (
    <span
      className={`avatar ${ring ? 'avatar-ring' : ''} ${className}`}
      style={{ '--avatar-size': `${size}px`, '--avatar-tint': tintFor(id || name) }}
      title={name}
      aria-label={name}
      role="img"
    >
      {initials(name)}
    </span>
  )
}

export function AvatarStack({ people = [], max = 4, size = 28 }) {
  const shown = people.slice(0, max)
  const rest = people.length - shown.length
  return (
    <span className="avatar-stack" style={{ '--avatar-size': `${size}px` }}>
      {shown.map((p) => (
        <Avatar key={p.id} id={p.id} name={p.display_name} size={size} ring />
      ))}
      {rest > 0 && <span className="avatar avatar-ring avatar-more">+{rest}</span>}
    </span>
  )
}

export function SpaceIcon({ space, size = 36, radius, icon, accent }) {
  const { resolved } = useTheme()
  const Icon = SPACE_ICONS[icon || space?.icon] || SPACE_ICONS.sparkles
  const palette = (ACCENTS[accent || space?.accent] || ACCENTS.violet)[resolved === 'dark' ? 'dark' : 'light']
  return (
    <span
      className="space-icon"
      style={{ '--si-size': `${size}px`, '--si-radius': radius ? `${radius}px` : undefined, '--si-bg': palette.soft, '--si-fg': palette.text, '--si-base': palette.base }}
      aria-hidden
    >
      <Icon size={Math.round(size * 0.5)} strokeWidth={2} />
    </span>
  )
}

export function EmptyState({ icon: Icon, title, body, action, compact = false }) {
  return (
    <m.div className={`empty ${compact ? 'empty-compact' : ''}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease }}>
      {Icon && (
        <span className="empty-icon" aria-hidden>
          <Icon size={compact ? 20 : 24} />
        </span>
      )}
      <h3>{title}</h3>
      {body && <p>{body}</p>}
      {action && <div className="empty-action">{action}</div>}
    </m.div>
  )
}

export function Skeleton({ width = '100%', height = 14, radius = 8, className = '' }) {
  return <span className={`skeleton ${className}`} style={{ width, height, borderRadius: radius }} aria-hidden />
}

export function SkeletonRows({ rows = 4 }) {
  return (
    <div className="skeleton-rows" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton-row">
          <Skeleton width={22} height={22} radius={999} />
          <div className="stack" style={{ gap: 6, flex: 1 }}>
            <Skeleton width={`${60 + ((i * 17) % 30)}%`} />
            <Skeleton width="30%" height={10} />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Animated round checkbox used for tasks, groceries, habits and doses. */
export function CheckCircle({ checked, onChange, label, size = 24, disabled, tone }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`check ${checked ? 'is-checked' : ''} ${tone ? `check-${tone}` : ''}`}
      style={{ '--check-size': `${size}px` }}
      onClick={(e) => {
        e.stopPropagation()
        onChange(!checked)
      }}
    >
      <m.span className="check-fill" initial={false} animate={{ scale: checked ? 1 : 0, opacity: checked ? 1 : 0 }} transition={{ type: 'spring', stiffness: 600, damping: 30 }} />
      <svg viewBox="0 0 24 24" className="check-mark" aria-hidden>
        <m.path
          d="M6.5 12.5l3.6 3.6L17.5 8.6"
          fill="none"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          transition={{ duration: checked ? 0.28 : 0.12, ease, delay: checked ? 0.05 : 0 }}
        />
      </svg>
      {checked && <span className="check-burst" aria-hidden />}
    </button>
  )
}

export function ProgressRing({ value = 0, size = 64, stroke = 7, children, tone = 'accent' }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, value))
  return (
    <div className={`ring ring-${tone}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-track" strokeWidth={stroke} fill="none" />
        <m.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className="ring-value"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: 0.9, ease }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {children && <div className="ring-label">{children}</div>}
    </div>
  )
}

export function ProgressBar({ value = 0, tone = 'accent', label, height = 8 }) {
  const pct = Math.max(0, Math.min(1, value))
  return (
    <div className={`bar bar-${tone}`} style={{ height }} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct * 100)} aria-label={label}>
      <m.span className="bar-fill" initial={{ scaleX: 0 }} animate={{ scaleX: pct }} transition={{ duration: 0.8, ease }} />
    </div>
  )
}

/** Number that counts up the first time it scrolls into view, then animates between values. */
export function AnimatedNumber({ value, format = (n) => Math.round(n).toLocaleString('en-IN') }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const [display, setDisplay] = useState(0)
  const last = useRef(0)
  useEffect(() => {
    if (!inView) return undefined
    const target = Number(value) || 0
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      last.current = target
      setDisplay(target)
      return undefined
    }
    // Tiny rAF tween (avoids pulling Motion's imperative animate() into the boot bundle).
    const from = last.current
    const start = performance.now()
    let frame
    const step = (now) => {
      const t = Math.min(1, (now - start) / 800)
      const eased = 1 - Math.pow(1 - t, 4)
      setDisplay(from + (target - from) * eased)
      if (t < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    last.current = target
    return () => cancelAnimationFrame(frame)
  }, [value, inView])
  return (
    <span ref={ref} className="tnum">
      {format(display)}
    </span>
  )
}

/** Simple, fast bar chart (no chart library). data: [{ label, value, title, highlight }] */
export function BarChart({ data, height = 140, format = (v) => v, showLabels = true, labelEvery = 1 }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="chart" style={{ '--chart-h': `${height}px` }} role="img" aria-label={`Bar chart, highest ${format(max)}`}>
      <div className="chart-bars">
        {data.map((d, i) => (
          <div key={d.key || i} className={`chart-col ${d.highlight ? 'is-hl' : ''}`} title={d.title || `${d.label}: ${format(d.value)}`}>
            <m.span
              className="chart-bar"
              initial={{ scaleY: 0 }}
              animate={{ scaleY: d.value ? Math.max(0.03, d.value / max) : 0.015 }}
              transition={{ duration: 0.6, ease, delay: Math.min(i * 0.012, 0.3) }}
            />
          </div>
        ))}
      </div>
      {showLabels && (
        <div className="chart-labels" aria-hidden>
          {data.map((d, i) => (
            <span key={d.key || i} className={d.highlight ? 'is-hl' : ''}>
              {i % labelEvery === 0 || d.highlight ? d.label : ''}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export function Segmented({ options, value, onChange, label, size = 'md', layoutId = 'seg' }) {
  const ref = useRef(null)
  // Keep the active option visible when the control scrolls horizontally (e.g. week days on phones).
  useEffect(() => {
    const el = ref.current?.querySelector('[aria-selected="true"]')
    const box = ref.current
    if (el && box && box.scrollWidth > box.clientWidth) box.scrollTo({ left: el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2, behavior: 'smooth' })
  }, [value])
  return (
    <div ref={ref} className={`segmented segmented-${size}`} role="tablist" aria-label={label}>
      {options.map((o) => {
        const opt = typeof o === 'string' ? { value: o, label: o } : o
        const active = opt.value === value
        return (
          <button key={opt.value} type="button" role="tab" aria-selected={active} className={`seg ${active ? 'is-active' : ''}`} onClick={() => onChange(opt.value)}>
            {active && <m.span layoutId={layoutId} className="seg-pill" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
            <span className="seg-label">
              {opt.label}
              {opt.count != null && <span className="seg-count">{opt.count}</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function Stat({ label, value, hint, tone, icon: Icon }) {
  return (
    <div className={`stat ${tone ? `stat-${tone}` : ''}`}>
      <div className="stat-label">
        {Icon && <Icon size={14} aria-hidden />}
        {label}
      </div>
      <div className="stat-value">{value}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  )
}

export function DoneMark({ size = 14 }) {
  return <Check size={size} strokeWidth={3} aria-hidden />
}
