import { LazyMotion, MotionConfig } from 'motion/react'

// Motion features are loaded asynchronously so they don't block first paint.
const loadFeatures = () => import('./features').then((m) => m.default)

export function MotionProvider({ children }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user" transition={{ type: 'spring', stiffness: 420, damping: 36, mass: 0.8 }}>
        {children}
      </MotionConfig>
    </LazyMotion>
  )
}

export const ease = [0.22, 1, 0.36, 1]
export const spring = { type: 'spring', stiffness: 520, damping: 38, mass: 0.7 }
export const softSpring = { type: 'spring', stiffness: 260, damping: 30 }

export const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.36, ease } },
}

export const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.24, ease } },
}

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.32, ease } },
}

export const stagger = (each = 0.045, delay = 0.02) => ({
  hidden: {},
  show: { transition: { staggerChildren: each, delayChildren: delay } },
})

/** Enter/exit for list rows: collapses height so siblings glide into place. */
export const listItem = {
  initial: { opacity: 0, y: -6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease } },
  exit: { opacity: 0, x: -12, transition: { duration: 0.16, ease } },
}
