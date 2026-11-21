import { m } from 'motion/react'
import { fadeUp, stagger } from '../motion'

/** Page wrapper: content fades/slides in, children with `Reveal` stagger. */
export function Page({ children, className = '' }) {
  return (
    <m.div className={`page ${className}`} variants={stagger(0.05, 0)} initial="hidden" animate="show">
      {children}
    </m.div>
  )
}

export function Reveal({ children, className = '', as = 'div', ...rest }) {
  const Tag = m[as]
  return (
    <Tag className={className} variants={fadeUp} {...rest}>
      {children}
    </Tag>
  )
}

export function PageHeader({ eyebrow, title, description, actions, children }) {
  return (
    <Reveal className="page-header">
      <div className="page-header-text">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="page-desc">{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
      {children}
    </Reveal>
  )
}

export function Toolbar({ children }) {
  return <Reveal className="toolbar">{children}</Reveal>
}
