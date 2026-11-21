import { useMemo, useState } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, ListChecks, Pencil, Plus, ReceiptText, Trash2 } from 'lucide-react'
import { useSpace } from '../../app/SpaceContext'
import { keys, useAction, useBills, useEvents, useTasks } from '../../hooks/data'
import { useToday } from '../../hooks/useToday'
import { Page, PageHeader, Reveal } from '../../ui/Page'
import { Button, IconButton } from '../../ui/Button'
import { Badge, Card, CardHeader, EmptyState } from '../../ui/Display'
import { Field, Input, Select } from '../../ui/Form'
import { Menu } from '../../ui/Menu'
import { Sheet } from '../../ui/Sheet'
import { useConfirm } from '../../ui/Confirm'
import { dateLabel, fullDate, monthCells, monthKey, monthLabel, relativeDay, shiftMonth, timeLabel } from '../../lib/dates'
import { billOccurrence } from '../../lib/recurrence'
import { money } from '../../lib/format'
import { deleteEvent, saveEvent } from '../../services/lists'
import { listItem } from '../../motion'

const EVENT_CATEGORIES = ['Family', 'Birthday', 'Anniversary', 'Appointment', 'Planning', 'Work', 'Travel', 'Other']

export default function CalendarPage() {
  const { space, title, userId, has } = useSpace()
  const today = useToday()
  const [month, setMonth] = useState(monthKey(today))
  const [selected, setSelected] = useState(today)
  const [editing, setEditing] = useState(null)
  const confirm = useConfirm()
  const events = useEvents(space)
  const bills = useBills(has('bills') ? space : null)
  const tasks = useTasks(has('tasks') ? space : null)
  const key = keys.events(space.id)
  const save = useAction(({ values, id }) => saveEvent(space.id, userId, values, id), { invalidate: [key], success: (_d, { id }) => (id ? 'Event updated' : 'Event added') })
  const remove = useAction((id) => deleteEvent(space.id, id), { invalidate: [key], success: 'Event deleted', optimistic: { key, update: (old, id) => old && old.filter((e) => e.id !== id) } })

  // Everything with a date, keyed by day: events plus (read-only) bill and task due dates.
  const byDay = useMemo(() => {
    const map = new Map()
    const push = (d, item) => {
      if (!map.has(d)) map.set(d, [])
      map.get(d).push(item)
    }
    ;(events.data || []).forEach((e) => push(e.event_date, { kind: 'event', id: e.id, ref: e }))
    ;(bills.data?.bills || []).forEach((b) => {
      const d = b.repeat === 'monthly' ? billOccurrence(b, `${month}-01`) : b.due_on
      if (d.startsWith(month)) push(d, { kind: 'bill', id: `b${b.id}`, ref: b })
    })
    ;(tasks.data?.tasks || []).filter((t) => !t.repeat || t.repeat === 'none').forEach((t) => push(t.due_on, { kind: 'task', id: `t${t.id}`, ref: t }))
    return map
  }, [events.data, bills.data, tasks.data, month])

  const cells = monthCells(month)
  const dayItems = (byDay.get(selected) || []).sort((a, b) => (a.ref.time || '').localeCompare(b.ref.time || ''))
  const upcoming = (events.data || []).filter((e) => e.event_date >= today).sort((a, b) => a.event_date.localeCompare(b.event_date)).slice(0, 8)

  return (
    <Page>
      <PageHeader
        eyebrow={space.name}
        title={title('calendar')}
        description={space.type === 'office' ? 'Meetings, launches and team dates.' : 'Plans, birthdays and the moments that matter.'}
        actions={
          <Button icon={Plus} onClick={() => setEditing({ event_date: selected })}>
            New event
          </Button>
        }
      />
      <div className="calendar-layout">
        <Reveal as="section">
          <Card className="cal-card">
            <div className="month-nav cal-nav">
              <h2>{monthLabel(month)}</h2>
              <div className="spacer" />
              {month !== monthKey(today) && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setMonth(monthKey(today))
                    setSelected(today)
                  }}
                >
                  Today
                </Button>
              )}
              <IconButton icon={ChevronLeft} label="Previous month" variant="outline" onClick={() => setMonth((m) => shiftMonth(m, -1))} />
              <IconButton icon={ChevronRight} label="Next month" variant="outline" onClick={() => setMonth((m) => shiftMonth(m, 1))} />
            </div>
            <div className="cal-grid" role="grid" aria-label={monthLabel(month)}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                <span key={d} className="cal-head" role="columnheader">
                  {d}
                </span>
              ))}
              {cells.map((d, i) => {
                if (!d) return <span key={`x${i}`} className="cal-cell is-empty" />
                const items = byDay.get(d) || []
                const kinds = [...new Set(items.map((x) => x.kind))]
                return (
                  <button
                    key={d}
                    type="button"
                    role="gridcell"
                    aria-selected={d === selected}
                    aria-label={`${fullDate(d)}${items.length ? `, ${items.length} items` : ''}`}
                    className={`cal-cell ${d === today ? 'is-today' : ''} ${d === selected ? 'is-selected' : ''} ${d < today ? 'is-past' : ''}`}
                    onClick={() => setSelected(d)}
                    onDoubleClick={() => setEditing({ event_date: d })}
                  >
                    {d === selected && <m.span layoutId="cal-sel" className="cal-sel" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                    <span className="cal-num">{Number(d.slice(-2))}</span>
                    {items.length > 0 && (
                      <span className="cal-dots">
                        {kinds.map((k) => (
                          <i key={k} className={`dot-${k}`} />
                        ))}
                      </span>
                    )}
                    {items.filter((x) => x.kind === 'event').slice(0, 2).map((x) => (
                      <span key={x.id} className="cal-chip">
                        {x.ref.title}
                      </span>
                    ))}
                  </button>
                )
              })}
            </div>
            <div className="cal-legend">
              <span>
                <i className="dot-event" /> Events
              </span>
              {has('bills') && (
                <span>
                  <i className="dot-bill" /> Bills due
                </span>
              )}
              {has('tasks') && (
                <span>
                  <i className="dot-task" /> Task deadlines
                </span>
              )}
            </div>
          </Card>
        </Reveal>

        <Reveal as="aside" className="stack" style={{ gap: 16 }}>
          <Card>
            <CardHeader
              icon={CalendarDays}
              title={relativeDay(selected, today) === dateLabel(selected) ? fullDate(selected) : `${relativeDay(selected, today)} · ${dateLabel(selected)}`}
              action={<IconButton icon={Plus} label="Add event on this day" size="sm" variant="soft" onClick={() => setEditing({ event_date: selected })} />}
            />
            {dayItems.length === 0 ? (
              <EmptyState compact icon={CalendarDays} title="Nothing planned" body="Double-click a day or tap + to add an event." />
            ) : (
              <div className="list">
                <AnimatePresence initial={false}>
                  {dayItems.map((x) => (
                    <m.div key={x.id} layout="position" className="list-row" {...listItem}>
                      <span className={`kind-icon kind-${x.kind}`} aria-hidden>
                        {x.kind === 'event' ? <CalendarDays size={15} /> : x.kind === 'bill' ? <ReceiptText size={15} /> : <ListChecks size={15} />}
                      </span>
                      <div className="list-row-main">
                        <span className="list-row-title">{x.ref.title}</span>
                        <span className="list-row-meta">
                          {x.kind === 'event' && (
                            <span>
                              <Clock3 size={12} />
                              {x.ref.time ? timeLabel(x.ref.time) : 'All day'}
                            </span>
                          )}
                          {x.kind === 'event' && <span>{x.ref.category}</span>}
                          {x.kind === 'bill' && <span>Bill due · {money(x.ref.amount)}</span>}
                          {x.kind === 'task' && <span>Task deadline</span>}
                        </span>
                      </div>
                      {x.kind === 'event' ? (
                        <Menu
                          label="Event actions"
                          items={[
                            { label: 'Edit', icon: Pencil, onClick: () => setEditing(x.ref) },
                            {
                              label: 'Delete',
                              icon: Trash2,
                              tone: 'danger',
                              onClick: async () => {
                                if (await confirm({ title: 'Delete event?', body: x.ref.title, confirmLabel: 'Delete', tone: 'danger' })) remove.mutate(x.ref.id)
                              },
                            },
                          ]}
                        />
                      ) : (
                        <Badge>{x.kind === 'bill' ? 'Bill' : 'Task'}</Badge>
                      )}
                    </m.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </Card>
          <Card>
            <CardHeader icon={Clock3} title="Coming up" />
            {upcoming.length === 0 ? (
              <p className="subtle">No upcoming events.</p>
            ) : (
              <div className="event-list">
                {upcoming.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    className="event-item event-btn"
                    onClick={() => {
                      setMonth(monthKey(e.event_date))
                      setSelected(e.event_date)
                    }}
                  >
                    <span className="date-chip">
                      <small>{dateLabel(e.event_date, { month: 'short' })}</small>
                      <strong>{Number(e.event_date.slice(-2))}</strong>
                    </span>
                    <span className="list-row-main">
                      <span className="list-row-title">{e.title}</span>
                      <span className="list-row-meta">
                        <span>{relativeDay(e.event_date, today)}</span>
                        <span>{e.time ? timeLabel(e.time) : 'All day'}</span>
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </Reveal>
      </div>
      <EventForm open={!!editing} event={editing} onClose={() => setEditing(null)} saving={save.isPending} onSave={(values) => save.mutate({ values, id: editing?.id }, { onSuccess: () => setEditing(null) })} />
    </Page>
  )
}

function EventForm({ open, event, onClose, onSave, saving }) {
  const [form, setForm] = useState({})
  const [error, setError] = useState('')
  const [lastKey, setLastKey] = useState(null)
  const k = open ? event?.id || `new-${event?.event_date}` : null
  if (k !== lastKey) {
    setLastKey(k)
    setError('')
    setForm({ title: event?.title || '', event_date: event?.event_date || '', time: event?.time || '', category: event?.category || 'Family' })
  }
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={event?.id ? 'Edit event' : 'New event'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="event-form" loading={saving}>
            {event?.id ? 'Save changes' : 'Add event'}
          </Button>
        </>
      }
    >
      <form
        id="event-form"
        className="form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          if (!form.title.trim()) return setError('Name the event')
          if (!form.event_date) return setError('Pick a date')
          onSave(form)
        }}
      >
        <Field label="Event" error={error}>
          <Input value={form.title} onChange={set('title')} maxLength={180} placeholder="e.g. Dinner with Priya" data-autofocus />
        </Field>
        <div className="form-row">
          <Field label="Date">
            <Input type="date" value={form.event_date} onChange={set('event_date')} />
          </Field>
          <Field label="Time" optional>
            <Input type="time" value={form.time} onChange={set('time')} />
          </Field>
        </div>
        <Field label="Category">
          <Select value={form.category} onChange={set('category')}>
            {[...new Set([...EVENT_CATEGORIES, form.category])].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
      </form>
    </Sheet>
  )
}
