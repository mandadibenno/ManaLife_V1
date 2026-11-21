import { Link } from 'react-router-dom'
import { m } from 'motion/react'
import { ArrowUpRight } from 'lucide-react'
import { fadeUp } from '../../../motion'
import { Skeleton } from '../../../ui/Display'

export const SIZE_CLASS = { xl: 'w-xl', lg: 'w-lg', md: 'w-md', sm: 'w-sm' }

export function WidgetCard({ to, title, icon: Icon, size = 'md', aside, children, className = '', tone }) {
  return (
    <m.section className={`widget ${SIZE_CLASS[size]} ${tone ? `widget-${tone}` : ''} ${className}`} variants={fadeUp} aria-label={title}>
      <header className="widget-head">
        <Link to={to} className="widget-link">
          {Icon && (
            <span className="widget-icon" aria-hidden>
              <Icon size={16} />
            </span>
          )}
          <h3>{title}</h3>
          <ArrowUpRight size={15} className="widget-arrow" aria-hidden />
        </Link>
        {aside && <div className="widget-aside">{aside}</div>}
      </header>
      <div className="widget-body">{children}</div>
    </m.section>
  )
}

export function WidgetLoading({ rows = 3 }) {
  return (
    <div className="stack" style={{ gap: 12, paddingTop: 4 }} aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} width={`${85 - i * 15}%`} height={14} />
      ))}
    </div>
  )
}

export function WidgetEmpty({ children, action }) {
  return (
    <div className="widget-empty">
      <p>{children}</p>
      {action}
    </div>
  )
}
