import { useMemo, useState } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { CalendarDays, Check, Pencil, Plus, ReceiptText, Repeat2, Trash2, Undo2 } from 'lucide-react'
import { useSpace } from '../../app/SpaceContext'
import { useBills } from '../../hooks/data'
import { useToday } from '../../hooks/useToday'
import { Page, PageHeader, Reveal } from '../../ui/Page'
import { Button } from '../../ui/Button'
import { Badge, Card, EmptyState, Segmented, Skeleton, Stat } from '../../ui/Display'
import { ChipGroup, Field, Input, Select } from '../../ui/Form'
import { Menu } from '../../ui/Menu'
import { Sheet } from '../../ui/Sheet'
import { useConfirm } from '../../ui/Confirm'
import { addDays, dateLabel, isoDate, relativeDay } from '../../lib/dates'
import { money, sum } from '../../lib/format'
import { BILL_CATEGORIES, billStates, useBillActions } from './billActions'
import { ease } from '../../motion'

export default function BillsPage() {
  const { space, title } = useSpace()
  const today = useToday()
  const { data, isLoading } = useBills(space)
  const { setPaid, save, remove } = useBillActions()
  const confirm = useConfirm()
  const [view, setView] = useState('due')
  const [editing, setEditing] = useState(null)
  const states = useMemo(() => billStates(data, today), [data, today])
  const monthEnd = addDays(today, 30)

  const due = states.filter((s) => !s.paid)
  const overdue = due.filter((s) => s.overdue)
  const next30 = due.filter((s) => s.occurrence <= monthEnd)
  const paidRecently = states.filter((s) => s.paid || s.lastPaid)
  const shown = view === 'due' ? due : view === 'overdue' ? overdue : view === 'paid' ? paidRecently : states

  async function onDelete(bill) {
    if (await confirm({ title: 'Delete bill?', body: `“${bill.title}” and its payment history will be removed.`, confirmLabel: 'Delete', tone: 'danger' })) remove.mutate(bill.id)
  }

  return (
    <Page>
      <PageHeader
        eyebrow={space.name}
        title={title('bills')}
        description="Know what's due, mark what's paid. Not connected to any bank."
        actions={
          <Button icon={Plus} onClick={() => setEditing({})}>
            Add bill
          </Button>
        }
      />
      <Reveal className="stats-row">
        <Card>
          <Stat label="Due in 30 days" value={isLoading ? <Skeleton width={90} height={24} /> : money(sum(next30, (s) => s.bill.amount))} hint={`${next30.length} ${next30.length === 1 ? 'bill' : 'bills'}`} />
        </Card>
        <Card>
          <Stat label="Overdue" tone={overdue.length ? 'danger' : undefined} value={overdue.length ? money(sum(overdue, (s) => s.bill.amount)) : '—'} hint={overdue.length ? `${overdue.length} need attention` : 'Nothing late'} />
        </Card>
        <Card>
          <Stat label="Tracked monthly" value={money(sum(states.filter((s) => s.bill.repeat === 'monthly'), (s) => s.bill.amount))} hint={`${states.filter((s) => s.bill.repeat === 'monthly').length} recurring`} />
        </Card>
      </Reveal>
      <Reveal className="toolbar">
        <Segmented
          layoutId="bill-view"
          label="Bill filter"
          value={view}
          onChange={setView}
          options={[
            { value: 'due', label: 'To pay', count: due.length || undefined },
            { value: 'overdue', label: 'Overdue', count: overdue.length || undefined },
            { value: 'paid', label: 'Paid' },
            { value: 'all', label: 'All' },
          ]}
        />
      </Reveal>

      {isLoading ? (
        <div className="bill-grid">
          {[1, 2, 3].map((i) => (
            <Card key={i} style={{ height: 170 }}>
              <Skeleton width="50%" />
            </Card>
          ))}
        </div>
      ) : shown.length === 0 ? (
        <Card>
          <EmptyState
            icon={ReceiptText}
            title={states.length ? 'Nothing here' : 'No bills yet'}
            body={states.length ? 'Try another filter.' : 'Add rent, utilities or subscriptions to never miss a due date.'}
            action={!states.length && <Button onClick={() => setEditing({})}>Add a bill</Button>}
          />
        </Card>
      ) : (
        <div className="bill-grid">
          <AnimatePresence initial={false}>
            {shown.map((s, i) => {
              const { bill, occurrence, paid, overdue: late, lastPaid } = s
              const showPaidCycle = view === 'paid' && lastPaid
              const occ = showPaidCycle ? lastPaid : occurrence
              const isPaid = showPaidCycle ? true : paid
              return (
                <m.article
                  key={bill.id}
                  layout
                  className={`bill-card ${isPaid ? 'is-paid' : ''} ${late && !isPaid ? 'is-late' : ''}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease, delay: Math.min(i * 0.03, 0.2) } }}
                  exit={{ opacity: 0, scale: 0.97 }}
                >
                  <header className="bill-top">
                    <Badge tone={isPaid ? 'success' : late ? 'danger' : 'neutral'}>{isPaid ? 'Paid' : late ? 'Overdue' : relativeDay(occ, today)}</Badge>
                    <Menu
                      label={`Actions for ${bill.title}`}
                      items={[
                        { label: 'Edit', icon: Pencil, onClick: () => setEditing(bill) },
                        { label: 'Delete', icon: Trash2, tone: 'danger', onClick: () => onDelete(bill) },
                      ]}
                    />
                  </header>
                  <h3 className="truncate">{bill.title}</h3>
                  <p className="bill-amount tnum">{money(bill.amount)}</p>
                  <p className="bill-meta">
                    <span>
                      <CalendarDays size={13} /> {dateLabel(occ, { day: 'numeric', month: 'short', year: occ.slice(0, 4) !== today.slice(0, 4) ? 'numeric' : undefined })}
                    </span>
                    <span>
                      <Repeat2 size={13} /> {bill.repeat === 'monthly' ? 'Monthly' : 'One time'}
                    </span>
                    <span>{bill.category}</span>
                  </p>
                  <Button
                    full
                    size="sm"
                    variant={isPaid ? 'secondary' : 'primary'}
                    icon={isPaid ? Undo2 : Check}
                    onClick={() => setPaid.mutate({ bill, occurrence: occ, paid: !isPaid })}
                  >
                    {isPaid ? 'Undo payment' : 'Mark paid'}
                  </Button>
                </m.article>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      <BillForm open={!!editing} bill={editing?.id ? editing : null} onClose={() => setEditing(null)} saving={save.isPending} onSave={(values) => save.mutate({ values, id: editing?.id }, { onSuccess: () => setEditing(null) })} />
    </Page>
  )
}

function BillForm({ open, bill, onClose, onSave, saving }) {
  const [form, setForm] = useState({})
  const [error, setError] = useState({})
  const [lastKey, setLastKey] = useState(null)
  const k = open ? bill?.id || 'new' : null
  if (k !== lastKey) {
    setLastKey(k)
    setError({})
    setForm(bill ? { title: bill.title, amount: String(bill.amount), category: bill.category, due_on: bill.due_on, repeat: bill.repeat } : { title: '', amount: '', category: 'Utilities', due_on: isoDate(), repeat: 'monthly' })
  }
  const set = (key) => (v) => setForm((f) => ({ ...f, [key]: v?.target ? v.target.value : v }))
  function submit(e) {
    e.preventDefault()
    const errs = {}
    if (!form.title?.trim()) errs.title = 'Name the bill'
    if (!(Number(form.amount) >= 0) || form.amount === '') errs.amount = 'Enter an amount'
    setError(errs)
    if (!Object.keys(errs).length) onSave(form)
  }
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={bill ? 'Edit bill' : 'New bill'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="bill-form" loading={saving}>
            {bill ? 'Save changes' : 'Add bill'}
          </Button>
        </>
      }
    >
      <form id="bill-form" className="form" onSubmit={submit} noValidate>
        <Field label="Bill" error={error.title}>
          <Input value={form.title || ''} onChange={set('title')} placeholder="e.g. Electricity" maxLength={160} data-autofocus />
        </Field>
        <div className="form-row">
          <Field label="Amount (₹)" error={error.amount}>
            <Input type="number" inputMode="decimal" min="0" step="0.01" value={form.amount || ''} onChange={set('amount')} />
          </Field>
          <Field label={form.repeat === 'monthly' ? 'First due date' : 'Due date'}>
            <Input type="date" value={form.due_on || ''} onChange={set('due_on')} />
          </Field>
        </div>
        <Field label="Repeats">
          <ChipGroup size="sm" label="Repeats" value={form.repeat} onChange={set('repeat')} options={[{ value: 'monthly', label: 'Every month' }, { value: 'none', label: 'One time' }]} />
        </Field>
        <Field label="Category">
          <Select value={form.category || 'Other'} onChange={set('category')}>
            {[...new Set([...BILL_CATEGORIES, form.category || 'Other'])].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
      </form>
    </Sheet>
  )
}
