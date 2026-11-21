import { useId } from 'react'

/** ManaLife mark: two overlapping circles — you, and your people — inside a soft tile. */
export function LogoMark({ size = 34 }) {
  // Unique gradient id: a duplicate id inside a hidden subtree (display:none) would blank this mark.
  const gid = `ml-g-${useId().replace(/:/g, '')}`
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden className="logo-mark">
      <defs>
        <linearGradient id={gid} x1="6" y1="4" x2="44" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7C5CFF" />
          <stop offset="0.55" stopColor="#E2457A" />
          <stop offset="1" stopColor="#FF9A3D" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill={`url(#${gid})`} />
      <circle cx="19.5" cy="24" r="9.5" fill="#fff" fillOpacity="0.95" />
      <circle cx="29" cy="24" r="9.5" fill="#fff" fillOpacity="0.55" />
    </svg>
  )
}

export function Logo({ size = 34, tagline = false }) {
  return (
    <span className="logo">
      <LogoMark size={size} />
      <span className="logo-text">
        <span className="logo-name">
          Mana<span>Life</span>
        </span>
        {tagline && <span className="logo-tagline">Your life. Your people. Your space.</span>}
      </span>
    </span>
  )
}
