import { m } from 'motion/react'
import { Lock } from 'lucide-react'
import { SpaceIcon } from '../../ui/Display'
import { Logo } from '../../ui/Logo'
import { ease } from '../../motion'

const SPACES = [
  { name: 'My Space', icon: 'user-round', accent: 'violet', line: '3 of 5 tasks done', private: true },
  { name: 'Alex & Sam', icon: 'heart', accent: 'rose', line: 'Anniversary dinner · Sat' },
  { name: 'Rao Home', icon: 'house', accent: 'amber', line: '6 groceries · 2 bills due' },
  { name: 'Goa Trip Crew', icon: 'plane', accent: 'sky', line: '₹4,800 shared so far' },
  { name: 'Design Studio', icon: 'briefcase', accent: 'indigo', line: 'Mockups due tomorrow' },
]

/** Decorative left panel for auth screens: the product idea in one glance. */
export function Showcase() {
  return (
    <div className="showcase" aria-hidden>
      <div className="showcase-top">
        <Logo size={36} tagline />
      </div>
      <div className="showcase-copy">
        <h1 className="display">
          Your life.
          <br />
          <em>Your people.</em>
          <br />
          Your space.
        </h1>
        <p>One calm place for your own day and everything you share with the people in it.</p>
      </div>
      <div className="showcase-stack">
        {SPACES.map((s, i) => (
          <m.div
            key={s.name}
            className="showcase-card"
            initial={{ opacity: 0, y: 24, rotate: 0 }}
            animate={{ opacity: 1, y: 0, rotate: [-2, 1.5, -1, 2, -1.5][i] }}
            transition={{ duration: 0.7, ease, delay: 0.15 + i * 0.09 }}
            style={{ '--i': i }}
          >
            <SpaceIcon icon={s.icon} accent={s.accent} size={36} />
            <div>
              <strong>{s.name}</strong>
              <small>
                {s.private && <Lock size={11} />} {s.line}
              </small>
            </div>
          </m.div>
        ))}
      </div>
    </div>
  )
}
