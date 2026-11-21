// Date helpers. All app dates are local calendar days in ISO form (YYYY-MM-DD).
// Times of day are "HH:MM" strings. Noon is used internally to avoid DST edge cases.

const LOCALE = 'en-IN'

export function isoDate(date = new Date()) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function parseISO(iso) {
  return new Date(`${iso}T12:00:00`)
}

export function addDays(iso, days) {
  const d = parseISO(iso)
  d.setDate(d.getDate() + days)
  return isoDate(d)
}

export function addMonths(iso, months) {
  const d = parseISO(iso)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + months)
  d.setDate(Math.min(day, daysInMonth(d.getFullYear(), d.getMonth())))
  return isoDate(d)
}

/** Days in month. `month` is 0-based. */
export function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

export function diffDays(fromIso, toIso) {
  return Math.round((parseISO(toIso) - parseISO(fromIso)) / 86400000)
}

/** Monday of the week containing `iso`. */
export function startOfWeek(iso) {
  const d = parseISO(iso)
  return addDays(iso, -((d.getDay() + 6) % 7))
}

export function monthKey(iso = isoDate()) {
  return iso.slice(0, 7)
}

export function monthRange(month) {
  const [y, m] = month.split('-').map(Number)
  const start = `${month}-01`
  const end = isoDate(new Date(y, m, 1, 12)) // first day of next month (exclusive)
  return { start, end, days: daysInMonth(y, m - 1) }
}

export function shiftMonth(month, delta) {
  return monthKey(addMonths(`${month}-01`, delta))
}

export function dateLabel(iso, opts = { month: 'short', day: 'numeric' }) {
  if (!iso) return 'No date'
  return parseISO(iso).toLocaleDateString(LOCALE, opts)
}

export function fullDate(iso) {
  return dateLabel(iso, { weekday: 'long', month: 'long', day: 'numeric' })
}

export function monthLabel(month, opts = { month: 'long', year: 'numeric' }) {
  return parseISO(`${month}-01`).toLocaleDateString(LOCALE, opts)
}

export function weekdayShort(iso) {
  return dateLabel(iso, { weekday: 'short' })
}

/** "Today", "Tomorrow", "Yesterday", "In 3 days", "2 days ago", or a date. */
export function relativeDay(iso, today = isoDate()) {
  if (!iso) return ''
  const n = diffDays(today, iso)
  if (n === 0) return 'Today'
  if (n === 1) return 'Tomorrow'
  if (n === -1) return 'Yesterday'
  if (n > 1 && n < 7) return `In ${n} days`
  if (n < -1 && n > -7) return `${-n} days ago`
  return dateLabel(iso)
}

/** "08:30" -> "8:30 AM" */
export function timeLabel(value) {
  if (!value) return ''
  const [h, m] = String(value).slice(0, 5).split(':').map(Number)
  if (Number.isNaN(h)) return ''
  return `${h % 12 || 12}:${String(m || 0).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

export function greeting(date = new Date()) {
  const h = date.getHours()
  if (h < 5) return 'Good night'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

/** Calendar cells (Monday-first) for a month: array of ISO dates or null padding. */
export function monthCells(month) {
  const [y, m] = month.split('-').map(Number)
  const first = new Date(y, m - 1, 1, 12)
  const shift = (first.getDay() + 6) % 7
  const days = daysInMonth(y, m - 1)
  const total = Math.ceil((days + shift) / 7) * 7
  return Array.from({ length: total }, (_, i) => {
    const day = i - shift + 1
    return day >= 1 && day <= days ? `${month}-${String(day).padStart(2, '0')}` : null
  })
}
