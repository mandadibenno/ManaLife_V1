import { useMemo } from 'react'
import { useSpace } from '../../app/SpaceContext'
import { useToday } from '../../hooks/useToday'
import { useBills, useDocsAvailable, useDocuments, useDoseLogs, useEvents, useHabits, useMedicines, useTasks } from '../../hooks/data'
import { addDays, diffDays } from '../../lib/dates'
import { currentBillCycle, billOccurrence, isTaskDue, nextTaskDate, taskOccurrence, doneKey } from '../../lib/recurrence'
import { dosesFor } from '../../services/health'
import { money } from '../../lib/format'

const statusOf = (date, today) => (date < today ? 'overdue' : date === today ? 'today' : 'upcoming')

/**
 * Builds one agenda from every module enabled in the active space:
 * overdue/today/upcoming tasks, bills, events, medicine doses & refills, expiring documents, habits.
 * Computed in the app — no extra database tables. (Push notifications would need a server.)
 */
export function useReminders({ horizon = 7, enabled = true } = {}) {
  const { space, has, userId, basePath } = useSpace()
  const today = useToday()
  const on = (k) => enabled && has(k)
  const tasksQ = useTasks(on('tasks') ? space : null)
  const billsQ = useBills(on('bills') ? space : null)
  const eventsQ = useEvents(on('calendar') ? space : null)
  const habitsQ = useHabits(on('habits') ? space : null)
  const medsQ = useMedicines(on('medicines') ? userId : null)
  const dosesQ = useDoseLogs(on('medicines') ? userId : null, today)
  const docsOk = useDocsAvailable(on('documents') ? space : null)
  const docsQ = useDocuments(on('documents') ? space : null, docsOk.data === true)

  const items = useMemo(() => {
    const out = []
    const end = addDays(today, horizon)

    if (tasksQ.data) {
      const done = new Set(tasksQ.data.completions.map((c) => doneKey(c.task_id, c.occurrence_on)))
      for (const t of tasksQ.data.tasks) {
        const oneOff = !t.repeat || t.repeat === 'none'
        if (oneOff) {
          if (done.has(doneKey(t.id, t.due_on)) || t.due_on > end) continue
          out.push({ id: `t-${t.id}`, kind: 'task', ref: t, title: t.title, date: t.due_on, time: t.time, status: statusOf(t.due_on, today), priority: t.priority, to: `${basePath}/tasks` })
        } else if (isTaskDue(t, today)) {
          if (done.has(doneKey(t.id, taskOccurrence(t, today)))) continue
          out.push({ id: `t-${t.id}`, kind: 'task', ref: t, title: t.title, date: today, time: t.time, status: 'today', priority: t.priority, recurring: t.repeat, to: `${basePath}/tasks` })
        } else if (t.repeat !== 'daily') {
          const next = nextTaskDate(t, addDays(today, 1))
          if (next && next <= end) out.push({ id: `t-${t.id}`, kind: 'task', ref: t, title: t.title, date: next, time: t.time, status: 'upcoming', priority: t.priority, recurring: t.repeat, to: `${basePath}/tasks` })
        }
      }
    }

    if (billsQ.data) {
      const paid = new Set(billsQ.data.payments.map((p) => doneKey(p.bill_id, p.occurrence_on)))
      for (const b of billsQ.data.bills) {
        const cycle = currentBillCycle(b, today)
        let date = cycle
        if (paid.has(doneKey(b.id, cycle)) || cycle > end) {
          if (b.repeat !== 'monthly') continue
          date = billOccurrence(b, addDays(cycle, 1))
          if (date === cycle || paid.has(doneKey(b.id, date)) || date > end) continue
        }
        out.push({ id: `b-${b.id}-${date}`, kind: 'bill', ref: b, occurrence: date, title: b.title, meta: money(b.amount), date, status: statusOf(date, today), to: `${basePath}/bills` })
      }
    }

    if (eventsQ.data) {
      for (const e of eventsQ.data) {
        if (e.event_date < today || e.event_date > end) continue
        out.push({ id: `e-${e.id}`, kind: 'event', ref: e, title: e.title, date: e.event_date, time: e.time, meta: e.category, status: statusOf(e.event_date, today), to: `${basePath}/calendar` })
      }
    }

    if (medsQ.data) {
      const logs = new Map((dosesQ.data || []).map((l) => [`${l.medication_id}|${String(l.dose_time).slice(0, 5)}`, l.status]))
      for (const d of dosesFor(medsQ.data, today)) {
        if (logs.has(`${d.medicine.id}|${d.time}`)) continue
        out.push({ id: `d-${d.medicine.id}-${d.time}`, kind: 'dose', ref: d, title: d.medicine.name, meta: d.medicine.dose_label, date: today, time: d.time, status: 'today', to: `${basePath}/medicines` })
      }
      for (const m of medsQ.data) {
        if (!m.is_active || !m.refill_on || diffDays(today, m.refill_on) > 5) continue
        out.push({ id: `r-${m.id}`, kind: 'refill', ref: m, title: `Refill ${m.name}`, date: m.refill_on, status: statusOf(m.refill_on, today), to: `${basePath}/medicines` })
      }
    }

    if (docsQ.data) {
      for (const d of docsQ.data) {
        if (!d.expires_on || diffDays(today, d.expires_on) > 30) continue
        out.push({ id: `doc-${d.id}`, kind: 'document', ref: d, title: d.expires_on < today ? `${d.title} expired` : `${d.title} expires`, date: d.expires_on, meta: d.category, status: d.expires_on < today ? 'overdue' : d.expires_on === today ? 'today' : 'upcoming', to: `${basePath}/documents` })
      }
    }

    if (habitsQ.data) {
      const mine = new Set(habitsQ.data.checks.filter((c) => c.user_id === userId && c.done_on === today).map((c) => c.habit_id))
      for (const h of habitsQ.data.habits) {
        if (mine.has(h.id)) continue
        out.push({ id: `h-${h.id}`, kind: 'habit', ref: h, title: h.title, date: today, status: 'today', soft: true, to: `${basePath}/habits` })
      }
    }

    const rank = { overdue: 0, today: 1, upcoming: 2 }
    return out.sort((a, b) => rank[a.status] - rank[b.status] || a.date.localeCompare(b.date) || (a.time || '99').localeCompare(b.time || '99'))
  }, [tasksQ.data, billsQ.data, eventsQ.data, medsQ.data, dosesQ.data, docsQ.data, habitsQ.data, today, horizon, basePath, userId])

  const loading = [tasksQ, billsQ, eventsQ, medsQ, habitsQ].some((q) => q.isLoading && q.fetchStatus !== 'idle')
  const attention = items.filter((i) => !i.soft && i.status !== 'upcoming').length
  return { items, loading, attention, today }
}

/** Badge count: overdue + due today (not including habits). */
export function useReminderCount() {
  const { has } = useSpace()
  const { attention } = useReminders({ enabled: has('reminders') })
  return has('reminders') ? attention : 0
}
