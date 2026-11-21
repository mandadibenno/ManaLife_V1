// Recurrence rules ported from V1 (behaviour preserved) with a few helpers added.
import { isoDate, parseISO, daysInMonth, addDays, diffDays } from './dates'

/** Is a task scheduled on `date`? One-off tasks stay visible from their due date until done. */
export function isTaskDue(task, date = isoDate()) {
  if (!task?.due_on || task.due_on > date) return false
  if (task.repeat === 'none' || !task.repeat) return true
  if (task.repeat === 'daily') return true
  const anchor = parseISO(task.due_on)
  const current = parseISO(date)
  if (task.repeat === 'weekly') return diffDays(task.due_on, date) % 7 === 0
  if (task.repeat === 'monthly') {
    const dim = daysInMonth(current.getFullYear(), current.getMonth())
    return current.getDate() === Math.min(anchor.getDate(), dim)
  }
  return false
}

/** Which occurrence a completion for `date` refers to. */
export function taskOccurrence(task, date = isoDate()) {
  return task.repeat === 'none' || !task.repeat ? task.due_on : date
}

/** Next date (>= from) on which the task is scheduled, within a year. */
export function nextTaskDate(task, from = isoDate()) {
  if (!task?.due_on) return null
  if (task.repeat === 'none' || !task.repeat) return task.due_on
  let d = task.due_on > from ? task.due_on : from
  for (let i = 0; i < 370; i++) {
    if (isTaskDue(task, d)) return d
    d = addDays(d, 1)
  }
  return null
}

/** Next due date of a bill (monthly bills roll forward to the next unpaid-looking occurrence). */
export function billOccurrence(bill, date = isoDate()) {
  if (bill.repeat !== 'monthly') return bill.due_on
  const original = parseISO(bill.due_on)
  const current = parseISO(date)
  const day = Math.min(original.getDate(), daysInMonth(current.getFullYear(), current.getMonth()))
  let due = isoDate(new Date(current.getFullYear(), current.getMonth(), day, 12))
  if (due < date) {
    const nm = new Date(current.getFullYear(), current.getMonth() + 1, 1, 12)
    due = isoDate(new Date(nm.getFullYear(), nm.getMonth(), Math.min(original.getDate(), daysInMonth(nm.getFullYear(), nm.getMonth())), 12))
  }
  return due < bill.due_on ? bill.due_on : due
}

/**
 * The occurrence a monthly bill is "about" this month, even if already past — used so that
 * a bill due on the 3rd and paid on the 2nd still shows as paid until next month's cycle.
 */
export function currentBillCycle(bill, date = isoDate()) {
  if (bill.repeat !== 'monthly') return bill.due_on
  const original = parseISO(bill.due_on)
  const current = parseISO(date)
  const day = Math.min(original.getDate(), daysInMonth(current.getFullYear(), current.getMonth()))
  const thisMonth = isoDate(new Date(current.getFullYear(), current.getMonth(), day, 12))
  return thisMonth < bill.due_on ? bill.due_on : thisMonth
}

export const doneKey = (id, occurrence) => `${id}|${occurrence}`
