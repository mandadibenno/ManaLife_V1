import { useEffect, useState } from 'react'
import { isoDate } from '../lib/dates'

/**
 * Today's ISO date that rolls over at midnight and when the app returns to the foreground.
 * Fixes V1's module-level `today`, which went stale in PWAs left open overnight.
 */
export function useToday() {
  const [today, setToday] = useState(isoDate)

  useEffect(() => {
    let timer
    const sync = () => setToday((prev) => (prev === isoDate() ? prev : isoDate()))
    const schedule = () => {
      const now = new Date()
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5)
      timer = window.setTimeout(() => {
        sync()
        schedule()
      }, next - now)
    }
    schedule()
    const onVisible = () => document.visibilityState === 'visible' && sync()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', sync)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', sync)
    }
  }, [])

  return today
}
