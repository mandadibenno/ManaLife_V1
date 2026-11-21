import { describe, expect, it } from 'vitest'
import { addDays, isoDate, monthCells, relativeDay, shiftMonth, startOfWeek, timeLabel, monthRange } from '../lib/dates'
import { billOccurrence, currentBillCycle, isTaskDue, nextTaskDate, taskOccurrence } from '../lib/recurrence'

// ---- V1 reference implementations (copied verbatim from src/utils.js @ 2a414a7) ----
function v1IsoDate(date = new Date()) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function v1IsTaskDue(task, date) {
  if (!task.due_on || task.due_on > date) return false
  if (task.repeat === 'none') return true
  if (task.repeat === 'daily') return true
  const anchor = new Date(task.due_on + 'T12:00:00'), current = new Date(date + 'T12:00:00')
  if (task.repeat === 'weekly') return Math.round((current - anchor) / 86400000) % 7 === 0
  if (task.repeat === 'monthly') {
    const daysInMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate()
    return current.getDate() === Math.min(anchor.getDate(), daysInMonth)
  }
  return false
}
function v1BillOccurrence(bill, date) {
  if (bill.repeat !== 'monthly') return bill.due_on
  const original = new Date(bill.due_on + 'T12:00:00')
  const current = new Date(date + 'T12:00:00')
  const day = Math.min(original.getDate(), new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate())
  let due = v1IsoDate(new Date(current.getFullYear(), current.getMonth(), day, 12))
  if (due < date) due = v1IsoDate(new Date(current.getFullYear(), current.getMonth() + 1, Math.min(original.getDate(), new Date(current.getFullYear(), current.getMonth() + 2, 0).getDate()), 12))
  return due < bill.due_on ? bill.due_on : due
}

const days = Array.from({ length: 400 }, (_, i) => addDays('2026-01-01', i))

describe('dates', () => {
  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
  it('finds Monday of the week', () => {
    expect(startOfWeek('2026-11-21')).toBe('2026-11-16') // Saturday → Monday
    expect(startOfWeek('2026-11-16')).toBe('2026-11-16')
    expect(startOfWeek('2026-11-22')).toBe('2026-11-16') // Sunday belongs to the same week
  })
  it('builds Monday-first month grids', () => {
    const cells = monthCells('2026-11')
    expect(cells.length % 7).toBe(0)
    expect(cells.indexOf('2026-11-01')).toBe(6) // 1 Nov 2026 is a Sunday
    expect(cells.filter(Boolean)).toHaveLength(30)
  })
  it('shifts months and computes ranges', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftMonth('2026-03', -1)).toBe('2026-02')
    expect(monthRange('2026-02')).toEqual({ start: '2026-02-01', end: '2026-03-01', days: 28 })
  })
  it('labels relative days and times', () => {
    expect(relativeDay('2026-11-21', '2026-11-21')).toBe('Today')
    expect(relativeDay('2026-11-22', '2026-11-21')).toBe('Tomorrow')
    expect(relativeDay('2026-11-20', '2026-11-21')).toBe('Yesterday')
    expect(relativeDay('2026-11-24', '2026-11-21')).toBe('In 3 days')
    expect(timeLabel('00:05')).toBe('12:05 AM')
    expect(timeLabel('13:30:00')).toBe('1:30 PM')
  })
  it('isoDate uses the local calendar day', () => {
    expect(isoDate(new Date(2026, 10, 21, 23, 59))).toBe('2026-11-21')
  })
})

describe('recurrence matches V1 exactly', () => {
  const tasks = [
    { due_on: '2026-01-31', repeat: 'monthly' },
    { due_on: '2026-02-15', repeat: 'weekly' },
    { due_on: '2026-03-10', repeat: 'daily' },
    { due_on: '2026-05-05', repeat: 'none' },
    { due_on: '2026-01-29', repeat: 'monthly' },
  ]
  it('isTaskDue', () => {
    for (const t of tasks) for (const d of days) expect(isTaskDue(t, d), `${t.repeat} ${t.due_on} on ${d}`).toBe(v1IsTaskDue(t, d))
  })
  it('billOccurrence', () => {
    const bills = [
      { due_on: '2026-01-31', repeat: 'monthly' },
      { due_on: '2026-03-15', repeat: 'monthly' },
      { due_on: '2026-04-10', repeat: 'none' },
    ]
    for (const b of bills) for (const d of days) expect(billOccurrence(b, d), `${b.due_on} on ${d}`).toBe(v1BillOccurrence(b, d))
  })
})

describe('recurrence helpers', () => {
  it('one-off tasks complete on their due date; recurring on the day', () => {
    expect(taskOccurrence({ due_on: '2026-05-05', repeat: 'none' }, '2026-06-01')).toBe('2026-05-05')
    expect(taskOccurrence({ due_on: '2026-05-05', repeat: 'daily' }, '2026-06-01')).toBe('2026-06-01')
  })
  it('monthly tasks clamp to the end of short months', () => {
    const t = { due_on: '2026-01-31', repeat: 'monthly' }
    expect(isTaskDue(t, '2026-02-28')).toBe(true)
    expect(isTaskDue(t, '2026-04-30')).toBe(true)
  })
  it('finds the next occurrence', () => {
    expect(nextTaskDate({ due_on: '2026-11-02', repeat: 'weekly' }, '2026-11-21')).toBe('2026-11-23')
    expect(nextTaskDate({ due_on: '2026-11-30', repeat: 'none' }, '2026-11-21')).toBe('2026-11-30')
  })
  it('currentBillCycle keeps this month even after the due day passes', () => {
    const b = { due_on: '2026-06-03', repeat: 'monthly' }
    expect(currentBillCycle(b, '2026-11-21')).toBe('2026-11-03')
    expect(billOccurrence(b, '2026-11-21')).toBe('2026-12-03')
    expect(currentBillCycle({ due_on: '2026-12-10', repeat: 'monthly' }, '2026-11-21')).toBe('2026-12-10')
  })
})
