import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, m } from 'motion/react'
import { ChevronLeft, ChevronRight, Eye, Flower2, Lock, Pencil, Plus, Share2, Trash2 } from 'lucide-react'
import { useSpace } from '../../app/SpaceContext'
import { useWorkspace } from '../../hooks/workspace'
import { keys, useAction, usePeriods, useSharedPeriods } from '../../hooks/data'
import { useToday } from '../../hooks/useToday'
import { Page, PageHeader, Reveal } from '../../ui/Page'
import { Button, IconButton } from '../../ui/Button'
import { Badge, Card, CardHeader, EmptyState, ProgressRing, SkeletonRows, Stat } from '../../ui/Display'
import { ChipGroup, Field, Input, Select, Textarea } from '../../ui/Form'
import { Menu } from '../../ui/Menu'
import { Sheet } from '../../ui/Sheet'
import { useConfirm } from '../../ui/Confirm'
import { addDays, dateLabel, diffDays, monthCells, monthKey, monthLabel, shiftMonth } from '../../lib/dates'
import { shortName } from '../../lib/format'
import { cycleStats, deletePeriod, savePeriod } from '../../services/health'
import { listItem } from '../../motion'

const SYMPTOMS = ['Cramps', 'Headache', 'Back pain', 'Bloating', 'Fatigue', 'Mood changes', 'Breast tenderness', 'Acne', 'Other']
const FLOWS = [
  { value: '', label: 'Not noted' },
  { value: 'spotting', label: 'Spotting' },
  { value: 'light', label: 'Light' },
  { value: 'medium', label: 'Medium' },
  { value: 'heavy', label: 'Heavy' },
]

export default function CyclePage() {
  const { space } = useSpace()
  return space.isPersonal ? <OwnCycle /> : <PartnerCycle />
}

function OwnCycle() {
  const { userId } = useSpace()
  const ws = useWorkspace()
  const today = useToday()
  const { data, isLoading } = usePeriods(userId)
  const confirm = useConfirm()
  const [editing, setEditing] = useState(null)
  const key = keys.periods(userId)
  const save = useAction(({ form, id }) => savePeriod(userId, form, id), { invalidate: [key], success: 'Saved', onSuccess: () => setEditing(null) })
  const remove = useAction((id) => deletePeriod(userId, id), { invalidate: [key], success: 'Entry deleted' })
  const entries = useMemo(() => data || [], [data])
  const s = useMemo(() => cycleStats(entries, today), [entries, today])
  const sharedSpaces = ws.shared.filter((x) => x.type === 'couple' || x.type === 'family')

  return (
    <Page>
      <PageHeader
        eyebrow="My Space · Private"
        title="Cycle Tracker"
        description="Track periods and symptoms privately. Predictions are estimates."
        actions={
          <Button icon={Plus} onClick={() => setEditing({})}>
            Log period
          </Button>
        }
      />
      <Reveal className="cycle-hero-row">
        <Card className="cycle-hero">
          <ProgressRing value={s.averageCycle && s.cycleDay ? Math.min(1, s.cycleDay / s.averageCycle) : 0} size={120} stroke={10}>
            <span className="ring-small">Cycle day</span>
            <span className="ring-big xl">{s.cycleDay ?? '–'}</span>
          </ProgressRing>
          <div>
            <p className="eyebrow">Next period</p>
            <h2>{s.nextExpected ? dateLabel(s.nextExpected, { weekday: 'long', day: 'numeric', month: 'long' }) : 'Log two periods to see a prediction'}</h2>
            {s.daysUntil != null && <p className="muted">{s.daysUntil > 0 ? `In about ${s.daysUntil} days` : s.daysUntil === 0 ? 'Expected today' : `${-s.daysUntil} days later than estimated`}</p>}
          </div>
        </Card>
        <div className="stats-row two">
          <Card>
            <Stat label="Average cycle" value={s.averageCycle ? `${s.averageCycle} days` : '—'} />
          </Card>
          <Card>
            <Stat label="Average period" value={s.averageDuration ? `${s.averageDuration} days` : '—'} />
          </Card>
        </div>
      </Reveal>
      <div className="calendar-layout">
        <Reveal as="section">
          <CycleCalendar entries={entries} predicted={s.nextExpected} duration={s.averageDuration || 5} today={today} />
        </Reveal>
        <Reveal as="aside" className="stack" style={{ gap: 16 }}>
          <Card>
            <CardHeader icon={Flower2} title="History" />
            {isLoading ? (
              <SkeletonRows rows={3} />
            ) : entries.length === 0 ? (
              <EmptyState compact icon={Flower2} title="Nothing logged yet" body="Log your most recent period to begin." />
            ) : (
              <div className="list">
                <AnimatePresence initial={false}>
                  {entries.map((e) => (
                    <m.div key={e.id} className="list-row" layout="position" {...listItem}>
                      <span className="kind-icon kind-cycle" aria-hidden>
                        <Flower2 size={15} />
                      </span>
                      <div className="list-row-main">
                        <span className="list-row-title">
                          {dateLabel(e.start_date)}
                          {e.end_date ? ` – ${dateLabel(e.end_date)}` : ''}
                        </span>
                        <span className="list-row-meta">
                          {e.end_date && <span>{diffDays(e.start_date, e.end_date) + 1} days</span>}
                          {e.flow && <span>{e.flow}</span>}
                          {!!e.symptoms?.length && <span>{e.symptoms.join(', ')}</span>}
                        </span>
                      </div>
                      <Menu
                        label="Entry actions"
                        items={[
                          { label: 'Edit', icon: Pencil, onClick: () => setEditing(e) },
                          {
                            label: 'Delete',
                            icon: Trash2,
                            tone: 'danger',
                            onClick: async () => {
                              if (await confirm({ title: 'Delete this entry?', confirmLabel: 'Delete', tone: 'danger' })) remove.mutate(e.id)
                            },
                          },
                        ]}
                      />
                    </m.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </Card>
          {s.cycles.length > 1 && (
            <Card>
              <CardHeader title="Cycle lengths" subtitle="Last 6 cycles" />
              <div className="cycle-bars">
                {s.cycles.slice(-6).map((c) => (
                  <div key={c.date} className="cycle-bar">
                    <span>{dateLabel(c.date)}</span>
                    <div className="bar">
                      <m.span className="bar-fill" initial={{ scaleX: 0 }} animate={{ scaleX: Math.min(1, c.days / 45) }} />
                    </div>
                    <strong className="tnum">{c.days}d</strong>
                  </div>
                ))}
              </div>
            </Card>
          )}
          <Card>
            <CardHeader icon={Share2} title="Sharing" />
            <p className="muted" style={{ marginBottom: 10 }}>
              Private by default. You can give one partner read-only access from a couple or family space's settings.
            </p>
            {sharedSpaces.length ? (
              <div className="row-wrap">
                {sharedSpaces.map((x) => (
                  <Button key={x.id} as={Link} to={`/space/${x.id}/settings`} size="sm" variant="secondary">
                    {x.name}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="subtle">Create a couple space to share with a partner.</p>
            )}
          </Card>
          <div className="notice">
            <Lock size={16} />
            <span>Private record. Predictions are estimates, not medical advice or a method of contraception.</span>
          </div>
        </Reveal>
      </div>
      <PeriodForm open={!!editing} entry={editing?.id ? editing : null} onClose={() => setEditing(null)} saving={save.isPending} onSave={(form) => save.mutate({ form, id: editing?.id })} />
    </Page>
  )
}

function CycleCalendar({ entries, predicted, duration, today }) {
  const [month, setMonth] = useState(monthKey(today))
  const cells = monthCells(month)
  const isPeriod = (d) => entries.some((e) => d >= e.start_date && d <= (e.end_date || e.start_date))
  const isPredicted = (d) => predicted && d >= predicted && d <= addDays(predicted, duration - 1)
  return (
    <Card className="cal-card">
      <div className="month-nav cal-nav">
        <h2>{monthLabel(month)}</h2>
        <div className="spacer" />
        <IconButton icon={ChevronLeft} label="Previous month" variant="outline" onClick={() => setMonth((x) => shiftMonth(x, -1))} />
        <IconButton icon={ChevronRight} label="Next month" variant="outline" onClick={() => setMonth((x) => shiftMonth(x, 1))} />
      </div>
      <div className="cal-grid cal-compact">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <span key={i} className="cal-head">
            {d}
          </span>
        ))}
        {cells.map((d, i) =>
          d ? (
            <span key={d} className={`cal-cell ${d === today ? 'is-today' : ''} ${isPeriod(d) ? 'is-period' : ''} ${!isPeriod(d) && isPredicted(d) ? 'is-predicted' : ''}`}>
              <span className="cal-num">{Number(d.slice(-2))}</span>
            </span>
          ) : (
            <span key={`x${i}`} className="cal-cell is-empty" />
          ),
        )}
      </div>
      <div className="cal-legend">
        <span>
          <i className="dot-period" /> Logged
        </span>
        <span>
          <i className="dot-predicted" /> Predicted
        </span>
      </div>
    </Card>
  )
}

function PeriodForm({ open, entry, onClose, onSave, saving }) {
  const today = useToday()
  const [form, setForm] = useState({})
  const [error, setError] = useState('')
  const [lastKey, setLastKey] = useState(null)
  const k = open ? entry?.id || 'new' : null
  if (k !== lastKey) {
    setLastKey(k)
    setError('')
    setForm(entry ? { start_date: entry.start_date, end_date: entry.end_date || '', flow: entry.flow || '', symptoms: entry.symptoms || [], notes: entry.notes || '' } : { start_date: today, end_date: '', flow: '', symptoms: [], notes: '' })
  }
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={entry ? 'Edit period' : 'Log period'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={saving}
            onClick={() => {
              if (!form.start_date || form.start_date > today) return setError('Start date can’t be in the future')
              if (form.end_date && (form.end_date < form.start_date || form.end_date > today)) return setError('Check the end date')
              onSave(form)
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="form">
        <div className="form-row">
          <Field label="Started">
            <Input type="date" max={today} value={form.start_date || ''} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} />
          </Field>
          <Field label="Ended" optional>
            <Input type="date" min={form.start_date} max={today} value={form.end_date || ''} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} />
          </Field>
        </div>
        <Field label="Flow">
          <ChipGroup size="sm" label="Flow" value={form.flow} onChange={(v) => setForm((f) => ({ ...f, flow: v }))} options={FLOWS} />
        </Field>
        <Field label="Symptoms">
          <ChipGroup size="sm" multiple label="Symptoms" value={form.symptoms || []} onChange={(v) => setForm((f) => ({ ...f, symptoms: v }))} options={SYMPTOMS} />
        </Field>
        <Field label="Notes" optional>
          <Textarea rows={2} maxLength={1000} value={form.notes || ''} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        </Field>
        {error && <p className="field-error">{error}</p>}
      </div>
    </Sheet>
  )
}

/** Read-only view of a partner's cycle, only when they granted access in this space. */
function PartnerCycle() {
  const { sharedCycleOwners, nameOf } = useSpace()
  const today = useToday()
  const [chosen, setChosen] = useState('')
  const owner = sharedCycleOwners.includes(chosen) ? chosen : sharedCycleOwners[0]
  const { data, isLoading } = useSharedPeriods(owner)
  const s = useMemo(() => cycleStats(data || [], today), [data, today])
  const name = shortName(nameOf(owner))

  return (
    <Page className="page-narrow">
      <PageHeader eyebrow="Shared with you · Read only" title={`${name}'s cycle`} description={`${name} chose to share this with you. You can view it, not change it.`} actions={<Badge icon={Eye}>View only</Badge>} />
      {sharedCycleOwners.length > 1 && (
        <Reveal className="toolbar">
          <div style={{ width: 220 }}>
            <Select value={owner} onChange={(e) => setChosen(e.target.value)} aria-label="Whose cycle">
              {sharedCycleOwners.map((id) => (
                <option key={id} value={id}>
                  {nameOf(id)}
                </option>
              ))}
            </Select>
          </div>
        </Reveal>
      )}
      <Reveal>
        <Card className="cycle-hero">
          <ProgressRing value={s.averageCycle && s.cycleDay ? Math.min(1, s.cycleDay / s.averageCycle) : 0} size={100} stroke={9}>
            <span className="ring-small">Day</span>
            <span className="ring-big">{s.cycleDay ?? '–'}</span>
          </ProgressRing>
          <div>
            <p className="eyebrow">Next period (estimate)</p>
            <h2>{s.nextExpected ? dateLabel(s.nextExpected, { weekday: 'long', day: 'numeric', month: 'long' }) : 'Not enough data yet'}</h2>
            <p className="subtle">Not reliable for contraception or pregnancy decisions.</p>
          </div>
        </Card>
      </Reveal>
      <Reveal>
        <Card style={{ marginTop: 16 }}>
          <CardHeader icon={Flower2} title="Shared history" />
          {isLoading ? (
            <SkeletonRows rows={3} />
          ) : !(data || []).length ? (
            <p className="subtle">Nothing shared yet.</p>
          ) : (
            <div className="list">
              {data.map((e, i) => (
                <div key={`${e.start_date}-${i}`} className="list-row">
                  <span className="kind-icon kind-cycle">
                    <Flower2 size={15} />
                  </span>
                  <div className="list-row-main">
                    <span className="list-row-title">
                      {dateLabel(e.start_date)}
                      {e.end_date ? ` – ${dateLabel(e.end_date)}` : ''}
                    </span>
                    <span className="list-row-meta">
                      {e.flow && <span>Flow: {e.flow}</span>}
                      {!!e.symptoms?.length && <span>{e.symptoms.join(', ')}</span>}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </Reveal>
    </Page>
  )
}
