import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, m } from 'motion/react'
import { BellOff, BellRing, CheckCheck, Info } from 'lucide-react'
import { useSpace } from '../../app/SpaceContext'
import { Page, PageHeader, Reveal } from '../../ui/Page'
import { Card, CheckCircle, EmptyState, SkeletonRows } from '../../ui/Display'
import { ChipGroup } from '../../ui/Form'
import { dateLabel, relativeDay, timeLabel } from '../../lib/dates'
import { taskOccurrence } from '../../lib/recurrence'
import { useReminders } from './useReminders'
import { REMINDER_ICONS, REMINDER_LABELS } from './reminderMeta'
import { useTaskActions } from '../tasks/taskActions'
import { useBillActions } from '../bills/billActions'
import { useHabitActions } from '../habits/habitActions'
import { useMedicineActions } from '../medicines/medicineActions'
import { listItem } from '../../motion'

const GROUPS = [
  { key: 'overdue', label: 'Overdue' },
  { key: 'today', label: 'Today' },
  { key: 'upcoming', label: 'Next 7 days' },
]

export default function RemindersPage() {
  const { space, title } = useSpace()
  const { items, loading, today } = useReminders({ horizon: 7 })
  const [kinds, setKinds] = useState([])
  const tasks = useTaskActions()
  const bills = useBillActions()
  const habits = useHabitActions()
  const meds = useMedicineActions(today)

  const available = [...new Set(items.map((i) => i.kind))]
  const shown = kinds.length ? items.filter((i) => kinds.includes(i.kind)) : items

  // Items that can be completed right here.
  const complete = (r) => {
    if (r.kind === 'task') tasks.toggle.mutate({ task: r.ref, occurrence: taskOccurrence(r.ref, r.date), done: true })
    else if (r.kind === 'bill') bills.setPaid.mutate({ bill: r.ref, occurrence: r.occurrence, paid: true })
    else if (r.kind === 'habit') habits.toggle.mutate({ habit: r.ref, day: today, done: true })
    else if (r.kind === 'dose') meds.dose.mutate({ medicine: r.ref.medicine, time: r.ref.time, status: 'taken' })
  }
  const completable = (r) => ['task', 'bill', 'habit', 'dose'].includes(r.kind) && r.date <= today

  return (
    <Page className="page-narrow">
      <PageHeader eyebrow={space.name} title={title('reminders')} description="Everything that needs you — overdue, today and this week — in one place." />
      {available.length > 1 && (
        <Reveal className="toolbar">
          <ChipGroup size="sm" multiple label="Filter reminders" value={kinds} onChange={setKinds} options={available.map((k) => ({ value: k, label: REMINDER_LABELS[k], icon: REMINDER_ICONS[k] }))} />
        </Reveal>
      )}
      {loading ? (
        <Card>
          <SkeletonRows rows={5} />
        </Card>
      ) : shown.length === 0 ? (
        <Card>
          <EmptyState icon={CheckCheck} title="You're all caught up" body="Nothing overdue and nothing due this week." />
        </Card>
      ) : (
        GROUPS.map((g) => {
          const list = shown.filter((i) => i.status === g.key)
          if (!list.length) return null
          return (
            <Reveal key={g.key} as="section" className="reminder-group">
              <p className={`group-label ${g.key === 'overdue' ? 'is-overdue' : ''}`}>
                {g.label} · {list.length}
              </p>
              <Card className="card-list">
                <div className="list">
                  <AnimatePresence initial={false}>
                    {list.map((r) => {
                      const Icon = REMINDER_ICONS[r.kind]
                      return (
                        <m.div key={r.id} layout="position" className="list-row" {...listItem}>
                          {completable(r) ? (
                            <CheckCircle checked={false} tone={r.kind === 'bill' || r.kind === 'dose' ? 'success' : undefined} onChange={() => complete(r)} label={`Complete ${r.title}`} />
                          ) : (
                            <span className={`reminder-dot is-${r.status}`} aria-hidden>
                              <Icon size={14} />
                            </span>
                          )}
                          <Link to={r.to} className="list-row-main">
                            <span className="list-row-title">{r.title}</span>
                            <span className="list-row-meta">
                              <span>
                                <Icon size={12} /> {REMINDER_LABELS[r.kind]}
                              </span>
                              <span className={r.status === 'overdue' ? 'is-overdue' : ''}>{r.status === 'overdue' ? dateLabel(r.date) : relativeDay(r.date, today)}</span>
                              {r.time && <span>{timeLabel(r.time)}</span>}
                              {r.meta && <span>{r.meta}</span>}
                            </span>
                          </Link>
                        </m.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              </Card>
            </Reveal>
          )
        })
      )}
      <Reveal className="notice" style={{ marginTop: 18 }}>
        <Info size={16} />
        <span>
          Reminders are shown inside ManaLife (and as the badge on <BellRing size={12} style={{ display: 'inline', verticalAlign: '-1px' }} />). Phone push notifications need a notification server and aren't switched on yet. <BellOff size={12} style={{ display: 'inline', verticalAlign: '-1px' }} />
        </span>
      </Reveal>
    </Page>
  )
}
