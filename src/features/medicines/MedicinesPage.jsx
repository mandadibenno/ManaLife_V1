import { useMemo, useState } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { AlarmClock, Check, ChevronLeft, ChevronRight, History, Lock, Pause, Pencil, Pill, Plus, SkipForward, Trash2, Undo2, X } from 'lucide-react'
import { useSpace } from '../../app/SpaceContext'
import { useDoseLogs, useMedicines, useRecentDoses } from '../../hooks/data'
import { useToday } from '../../hooks/useToday'
import { Page, PageHeader, Reveal } from '../../ui/Page'
import { Button, IconButton } from '../../ui/Button'
import { Badge, Card, CardHeader, EmptyState, ProgressRing, SkeletonRows } from '../../ui/Display'
import { Field, Input, Switch, Textarea } from '../../ui/Form'
import { Menu } from '../../ui/Menu'
import { Sheet } from '../../ui/Sheet'
import { useConfirm } from '../../ui/Confirm'
import { addDays, dateLabel, diffDays, relativeDay, timeLabel } from '../../lib/dates'
import { dosesFor } from '../../services/health'
import { useMedicineActions } from './medicineActions'
import { listItem } from '../../motion'

export default function MedicinesPage() {
  const { userId } = useSpace()
  const today = useToday()
  const [date, setDate] = useState(today)
  const meds = useMedicines(userId)
  const logs = useDoseLogs(userId, date)
  const recent = useRecentDoses(userId)
  const { dose, save, remove } = useMedicineActions(date)
  const confirm = useConfirm()
  const [editing, setEditing] = useState(null)

  const doses = useMemo(() => dosesFor(meds.data || [], date), [meds.data, date])
  const statusOf = (d) => (logs.data || []).find((l) => l.medication_id === d.medicine.id && String(l.dose_time).slice(0, 5) === d.time)?.status
  const taken = doses.filter((d) => statusOf(d) === 'taken').length
  const skipped = doses.filter((d) => statusOf(d) === 'skipped').length
  const refills = (meds.data || []).filter((x) => x.is_active && x.refill_on && diffDays(today, x.refill_on) <= 7)
  const nameOf = (id) => (meds.data || []).find((x) => x.id === id)?.name || 'Medicine'

  return (
    <Page>
      <PageHeader
        eyebrow="My Space · Private"
        title="Medicines"
        description="Your schedule and dose history. Only you can see this."
        actions={
          <Button icon={Plus} onClick={() => setEditing({})}>
            Add medicine
          </Button>
        }
      />
      <div className="med-layout">
        <div className="stack" style={{ gap: 16, minWidth: 0 }}>
          <Reveal>
            <Card>
              <div className="dose-head">
                <ProgressRing value={doses.length ? taken / doses.length : 0} size={74} stroke={7} tone={doses.length && taken === doses.length ? 'success' : 'accent'}>
                  <span className="ring-big">{taken}</span>
                  <span className="ring-small">of {doses.length}</span>
                </ProgressRing>
                <div className="spacer">
                  <p className="eyebrow">{relativeDay(date, today) === dateLabel(date) ? dateLabel(date, { weekday: 'long', day: 'numeric', month: 'short' }) : relativeDay(date, today)}</p>
                  <h3>{doses.length ? (taken === doses.length ? 'All doses taken' : `${doses.length - taken - skipped} still to log`) : 'Nothing scheduled'}</h3>
                  {skipped > 0 && <p className="subtle">{skipped} skipped</p>}
                </div>
                <div className="row" style={{ gap: 4 }}>
                  <IconButton icon={ChevronLeft} label="Previous day" variant="outline" size="sm" onClick={() => setDate((d) => addDays(d, -1))} />
                  <IconButton icon={ChevronRight} label="Next day" variant="outline" size="sm" disabled={date >= today} onClick={() => setDate((d) => addDays(d, 1))} />
                </div>
              </div>
              {meds.isLoading ? (
                <SkeletonRows rows={3} />
              ) : doses.length === 0 ? (
                <EmptyState compact icon={Pill} title="No doses for this day" body={(meds.data || []).length ? 'No active medicines are scheduled.' : 'Add a medicine to build your schedule.'} />
              ) : (
                <div className="dose-list">
                  {doses.map((d) => {
                    const st = statusOf(d)
                    return (
                      <m.div key={`${d.medicine.id}-${d.time}`} className={`dose ${st ? `is-${st}` : ''}`} layout="position" {...listItem}>
                        <span className="dose-time tnum">{timeLabel(d.time)}</span>
                        <div className="list-row-main">
                          <span className="list-row-title">{d.medicine.name}</span>
                          <span className="list-row-meta">
                            {d.medicine.dose_label && <span>{d.medicine.dose_label}</span>}
                            {d.medicine.instructions && <span>{d.medicine.instructions}</span>}
                          </span>
                        </div>
                        {st ? (
                          <div className="row" style={{ gap: 6 }}>
                            <Badge tone={st === 'taken' ? 'success' : 'warning'} icon={st === 'taken' ? Check : SkipForward}>
                              {st === 'taken' ? 'Taken' : 'Skipped'}
                            </Badge>
                            <IconButton icon={Undo2} size="sm" label="Undo" onClick={() => dose.mutate({ medicine: d.medicine, time: d.time, status: null })} />
                          </div>
                        ) : (
                          <div className="row" style={{ gap: 6 }}>
                            <Button size="sm" variant="secondary" icon={X} onClick={() => dose.mutate({ medicine: d.medicine, time: d.time, status: 'skipped' })}>
                              Skip
                            </Button>
                            <Button size="sm" icon={Check} onClick={() => dose.mutate({ medicine: d.medicine, time: d.time, status: 'taken' })}>
                              Taken
                            </Button>
                          </div>
                        )}
                      </m.div>
                    )
                  })}
                </div>
              )}
            </Card>
          </Reveal>

          <Reveal>
            <Card>
              <CardHeader icon={Pill} title="My medicines" subtitle={`${(meds.data || []).filter((x) => x.is_active).length} active`} />
              {(meds.data || []).length === 0 ? (
                <p className="subtle">No medicines yet.</p>
              ) : (
                <div className="list">
                  <AnimatePresence initial={false}>
                    {(meds.data || []).map((x) => (
                      <m.div key={x.id} className={`list-row ${x.is_active ? '' : 'is-paused'}`} layout="position" {...listItem}>
                        <span className="kind-icon kind-event" aria-hidden>
                          {x.is_active ? <Pill size={15} /> : <Pause size={15} />}
                        </span>
                        <div className="list-row-main" role="button" tabIndex={0} onClick={() => setEditing(x)} onKeyDown={(e) => e.key === 'Enter' && setEditing(x)}>
                          <span className="list-row-title">{x.name}</span>
                          <span className="list-row-meta">
                            <span>{(x.schedule_times || []).map(timeLabel).join(' · ')}</span>
                            {x.dose_label && <span>{x.dose_label}</span>}
                            {x.end_date && <span>Until {dateLabel(x.end_date)}</span>}
                            {!x.is_active && <span>Paused</span>}
                          </span>
                        </div>
                        {x.refill_on && <Badge tone={diffDays(today, x.refill_on) <= 3 ? 'warning' : 'neutral'}>Refill {relativeDay(x.refill_on, today)}</Badge>}
                        <Menu
                          label={`Actions for ${x.name}`}
                          items={[
                            { label: 'Edit', icon: Pencil, onClick: () => setEditing(x) },
                            {
                              label: 'Delete',
                              icon: Trash2,
                              tone: 'danger',
                              onClick: async () => {
                                if (await confirm({ title: `Delete ${x.name}?`, body: 'Its dose history will be deleted permanently.', confirmLabel: 'Delete', tone: 'danger' })) remove.mutate(x.id)
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
          </Reveal>
        </div>

        <Reveal as="aside" className="stack" style={{ gap: 16 }}>
          {refills.length > 0 && (
            <Card className="refill-card">
              <CardHeader icon={AlarmClock} title="Refills coming up" />
              {refills.map((x) => (
                <div key={x.id} className="kv">
                  <span>{x.name}</span>
                  <strong>{relativeDay(x.refill_on, today)}</strong>
                </div>
              ))}
            </Card>
          )}
          <Card>
            <CardHeader icon={History} title="Recent history" />
            {(recent.data || []).length === 0 ? (
              <p className="subtle">Logged doses appear here.</p>
            ) : (
              <div className="history">
                {(recent.data || []).slice(0, 12).map((l) => (
                  <div key={l.id || `${l.medication_id}${l.dose_date}${l.dose_time}`} className="history-row">
                    <i className={l.status === 'taken' ? 'is-ok' : 'is-skip'} />
                    <span className="truncate">{nameOf(l.medication_id)}</span>
                    <span className="subtle">
                      {dateLabel(l.dose_date)} · {timeLabel(l.dose_time)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <div className="notice">
            <Lock size={16} />
            <span>A personal log, not a prescribing or alarm service. Follow your clinician's schedule, and don't double a missed dose unless told to.</span>
          </div>
        </Reveal>
      </div>
      <MedicineForm open={!!editing} medicine={editing?.id ? editing : null} onClose={() => setEditing(null)} saving={save.isPending} onSave={(form) => save.mutate({ form, id: editing?.id }, { onSuccess: () => setEditing(null) })} />
    </Page>
  )
}

const SUGGESTED = ['08:00', '13:00', '20:00', '22:00', '06:00', '10:00', '16:00', '18:00']

function MedicineForm({ open, medicine, onClose, onSave, saving }) {
  const today = useToday()
  const [form, setForm] = useState({})
  const [error, setError] = useState('')
  const [lastKey, setLastKey] = useState(null)
  const k = open ? medicine?.id || 'new' : null
  if (k !== lastKey) {
    setLastKey(k)
    setError('')
    setForm(
      medicine
        ? { name: medicine.name, dose_label: medicine.dose_label || '', schedule_times: (medicine.schedule_times || ['08:00']).map((t) => String(t).slice(0, 5)), start_date: medicine.start_date, end_date: medicine.end_date || '', refill_on: medicine.refill_on || '', instructions: medicine.instructions || '', is_active: medicine.is_active }
        : { name: '', dose_label: '', schedule_times: ['08:00'], start_date: today, end_date: '', refill_on: '', instructions: '', is_active: true },
    )
  }
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e?.target ? e.target.value : e }))

  function submit(e) {
    e.preventDefault()
    const times = (form.schedule_times || []).map((t) => t.trim())
    if (!form.name.trim()) return setError('Enter the medicine name')
    if (!form.start_date) return setError('Choose a start date')
    if (form.end_date && form.end_date < form.start_date) return setError('End date must be after the start date')
    if (!times.length || times.length > 8 || times.some((t) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) || new Set(times).size !== times.length) return setError('Use 1–8 different times')
    onSave({ ...form, schedule_times: times })
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={medicine ? 'Edit medicine' : 'Add medicine'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="med-form" loading={saving}>
            {medicine ? 'Save changes' : 'Add medicine'}
          </Button>
        </>
      }
    >
      <form id="med-form" className="form" onSubmit={submit} noValidate>
        <div className="form-row">
          <Field label="Medicine">
            <Input value={form.name || ''} onChange={set('name')} maxLength={150} placeholder="Name on the prescription" data-autofocus />
          </Field>
          <Field label="Dose" optional>
            <Input value={form.dose_label || ''} onChange={set('dose_label')} maxLength={100} placeholder="e.g. 1 tablet" />
          </Field>
        </div>
        <Field label="Times each day">
          <div className="time-list">
            {(form.schedule_times || []).map((t, i) => (
              <div key={i} className="time-chip">
                <Input type="time" value={t} onChange={(e) => setForm((f) => ({ ...f, schedule_times: f.schedule_times.map((x, j) => (j === i ? e.target.value : x)) }))} aria-label={`Time ${i + 1}`} />
                {form.schedule_times.length > 1 && (
                  <button type="button" onClick={() => setForm((f) => ({ ...f, schedule_times: f.schedule_times.filter((_, j) => j !== i) }))} aria-label={`Remove time ${i + 1}`}>
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
            {(form.schedule_times || []).length < 8 && (
              <Button size="sm" variant="soft" icon={Plus} onClick={() => setForm((f) => ({ ...f, schedule_times: [...f.schedule_times, SUGGESTED.find((s) => !f.schedule_times.includes(s)) || '12:00'] }))}>
                Add time
              </Button>
            )}
          </div>
        </Field>
        <div className="form-row">
          <Field label="Start">
            <Input type="date" value={form.start_date || ''} onChange={set('start_date')} />
          </Field>
          <Field label="End" optional>
            <Input type="date" min={form.start_date} value={form.end_date || ''} onChange={set('end_date')} />
          </Field>
        </div>
        <Field label="Refill reminder" optional hint="Shows in Reminders a few days before.">
          <Input type="date" value={form.refill_on || ''} onChange={set('refill_on')} />
        </Field>
        <Field label="Instructions" optional>
          <Textarea rows={2} value={form.instructions || ''} onChange={set('instructions')} maxLength={500} placeholder="As given by your clinician" />
        </Field>
        <Switch label="Active" description="Paused medicines stay in your list but aren't scheduled." checked={!!form.is_active} onChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
        {error && <p className="field-error">{error}</p>}
      </form>
    </Sheet>
  )
}
