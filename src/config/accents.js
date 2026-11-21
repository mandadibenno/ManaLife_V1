// Accent palettes. `solid` meets WCAG AA (4.5:1) against `on` for button text.
// `base` is for decorative fills (rings, dots, charts). Dark variants are tuned for #0d0d11.

export const ACCENTS = {
  violet: {
    label: 'Violet',
    light: { base: '#6E56F8', solid: '#5B43E6', soft: '#EEEBFF', softer: '#F7F5FF', text: '#4A35CF', on: '#FFFFFF', glow: 'rgba(110,86,248,.22)' },
    dark: { base: '#8E7DFF', solid: '#A497FF', soft: 'rgba(142,125,255,.16)', softer: 'rgba(142,125,255,.08)', text: '#C1B8FF', on: '#14102E', glow: 'rgba(142,125,255,.28)' },
  },
  rose: {
    label: 'Rose',
    light: { base: '#E2457A', solid: '#C42C62', soft: '#FDEBF1', softer: '#FFF5F8', text: '#B02457', on: '#FFFFFF', glow: 'rgba(226,69,122,.22)' },
    dark: { base: '#FF7CA7', solid: '#FF97BB', soft: 'rgba(255,124,167,.16)', softer: 'rgba(255,124,167,.08)', text: '#FFB2CB', on: '#2C0A17', glow: 'rgba(255,124,167,.26)' },
  },
  amber: {
    label: 'Amber',
    light: { base: '#E07B22', solid: '#B0540D', soft: '#FDF0E3', softer: '#FFF8F1', text: '#9A4A0A', on: '#FFFFFF', glow: 'rgba(224,123,34,.22)' },
    dark: { base: '#FFA857', solid: '#FFBB7D', soft: 'rgba(255,168,87,.16)', softer: 'rgba(255,168,87,.08)', text: '#FFC997', on: '#2B1604', glow: 'rgba(255,168,87,.26)' },
  },
  sky: {
    label: 'Sky',
    light: { base: '#1B96D8', solid: '#0B70A8', soft: '#E5F4FC', softer: '#F3FAFE', text: '#0A6396', on: '#FFFFFF', glow: 'rgba(27,150,216,.22)' },
    dark: { base: '#5EC2F6', solid: '#86D1F8', soft: 'rgba(94,194,246,.16)', softer: 'rgba(94,194,246,.08)', text: '#A3DCFA', on: '#03202F', glow: 'rgba(94,194,246,.26)' },
  },
  indigo: {
    label: 'Indigo',
    light: { base: '#4064E3', solid: '#3150CF', soft: '#EAEFFD', softer: '#F5F7FE', text: '#2A45B2', on: '#FFFFFF', glow: 'rgba(64,100,227,.22)' },
    dark: { base: '#809DFF', solid: '#A2B7FF', soft: 'rgba(128,157,255,.16)', softer: 'rgba(128,157,255,.08)', text: '#B8C8FF', on: '#0B1433', glow: 'rgba(128,157,255,.26)' },
  },
  emerald: {
    label: 'Emerald',
    light: { base: '#14A06D', solid: '#0B7A52', soft: '#E3F6EE', softer: '#F2FBF7', text: '#0A6C49', on: '#FFFFFF', glow: 'rgba(20,160,109,.2)' },
    dark: { base: '#48D49D', solid: '#74E0B6', soft: 'rgba(72,212,157,.15)', softer: 'rgba(72,212,157,.07)', text: '#8FE8C5', on: '#03241A', glow: 'rgba(72,212,157,.24)' },
  },
  teal: {
    label: 'Teal',
    light: { base: '#119CA2', solid: '#0A777C', soft: '#E2F5F5', softer: '#F1FAFA', text: '#096A6F', on: '#FFFFFF', glow: 'rgba(17,156,162,.2)' },
    dark: { base: '#47CDD3', solid: '#72DBE0', soft: 'rgba(71,205,211,.15)', softer: 'rgba(71,205,211,.07)', text: '#93E3E7', on: '#022326', glow: 'rgba(71,205,211,.24)' },
  },
  slate: {
    label: 'Slate',
    light: { base: '#5B667F', solid: '#465068', soft: '#ECEEF3', softer: '#F6F7F9', text: '#3E475D', on: '#FFFFFF', glow: 'rgba(91,102,127,.2)' },
    dark: { base: '#A4AEC6', solid: '#BCC4D7', soft: 'rgba(164,174,198,.15)', softer: 'rgba(164,174,198,.07)', text: '#CAD1E1', on: '#141821', glow: 'rgba(164,174,198,.22)' },
  },
}

export const ACCENT_KEYS = Object.keys(ACCENTS)

/** Apply an accent to <html> as CSS custom properties. */
export function applyAccent(key, mode) {
  const palette = (ACCENTS[key] || ACCENTS.violet)[mode === 'dark' ? 'dark' : 'light']
  const root = document.documentElement
  root.style.setProperty('--accent', palette.base)
  root.style.setProperty('--accent-solid', palette.solid)
  root.style.setProperty('--accent-soft', palette.soft)
  root.style.setProperty('--accent-softer', palette.softer)
  root.style.setProperty('--accent-text', palette.text)
  root.style.setProperty('--accent-on', palette.on)
  root.style.setProperty('--accent-glow', palette.glow)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', mode === 'dark' ? '#0d0d11' : '#f7f6f3')
}
