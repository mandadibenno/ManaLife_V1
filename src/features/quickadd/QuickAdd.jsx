import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { CalendarDays, ChartColumn, ListChecks, ShoppingBasket } from 'lucide-react'
import { Sheet } from '../../ui/Sheet'
import { Segmented } from '../../ui/Display'
import { Button } from '../../ui/Button'
import { ChipGroup, Field, Input, Select } from '../../ui/Form'
import { useToast } from '../../ui/Toast'
import { useSpace } from '../../app/SpaceContext'
import { addDays, isoDate, startOfWeek } from '../../lib/dates'
import { keys } from '../../hooks/data'
import { saveTask } from '../../services/tasks'
import { addGrocery, saveEvent } from '../../services/lists'
import { EXPENSE_CATEGORIES, saveExpense } from '../../services/money'

const QuickAddContext = createContext({ open: () => {} })
const KINDS = [
  { value: 'tasks', label: 'Task', icon: ListChecks },
  { value: 'expenses', label: 'Expense', icon: ChartColumn },
  { value: 'groceries', label: 'Shopping', icon: ShoppingBasket },
  { value: 'calendar', label: 'Event', icon: CalendarDays },
]

export function QuickAddProvider({ children }) {
  const [state, setState] = useState({ open: false, kind: null })
  const { has } = useSpace()
  const kinds = KINDS.filter((k) => has(k.value))

  const open = useCallback((kind) => setState({ open: true, kind: kind || null }), [])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setState((s) => ({ open: !s.open, kind: s.kind }))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const value = useMemo(() => ({ open }), [open])
  const kind = kinds.find((k) => k.value === state.kind)?.value || kinds[0]?.value

  return (
    <QuickAddContext.Provider value={value}>
      {children}
      <Sheet open={state.open} onClose={() => setState((s) => ({ ...s, open: false }))} title="Quick add" size="md">
        {kinds.length ? (
          <QuickAddBody kinds={kinds} kind={kind} setKind={(k) => setState({ open: true, kind: k })} close={() => setState((s) => ({ ...s, open: false }))} />
        ) : (
          <p className="muted">Turn on Tasks, Spending, Shopping or Calendar in this space to use quick add.</p>
        )}
      </Sheet>
    </QuickAddContext.Provider>
  )
}

export const useQuickAdd = () => useContext(QuickAddContext)

function QuickAddBody({ kinds, kind, setKind, close }) {
  return (
    <div className="qa">
      {kinds.length > 1 && <Segmented layoutId="qa-kind" label="What to add" value={kind} onChange={setKind} options={kinds.map((k) => ({ value: k.value, label: k.label }))} />}
      {kind === 'tasks' && <TaskForm close={close} />}
      {kind === 'expenses' && <ExpenseForm close={close} />}
      {kind === 'groceries' && <GroceryForm close={close} />}
      {kind === 'calendar' && <EventForm close={close} />}
    </div>
  )
}

function useAfterSave(module, label) {
  const qc = useQueryClient()
  const toast = useToast()
  const navigate = useNavigate()
  const { basePath } = useSpace()
  return (queryKey) => {
    qc.invalidateQueries({ queryKey })
    toast.success(label, { action: { label: 'View', onClick: () => navigate(`${basePath}/${module}`) } })
  }
}

function TaskForm({ close }) {
  const { space, userId, members } = useSpace()
  const today = isoDate()
  const [title, setTitle] = useState('')
  const [when, setWhen] = useState('today')
  const [date, setDate] = useState(today)
  const [priority, setPriority] = useState('medium')
  const [assignee, setAssignee] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const done = useAfterSave('tasks', 'Task added')
  const toast = useToast()
  const due = when === 'today' ? today : when === 'tomorrow' ? addDays(today, 1) : when === 'weekend' ? addDays(startOfWeek(today), 5) : date

  async function submit(e) {
    e.preventDefault()
    if (!title.trim()) return setError('Give the task a name')
    setBusy(true)
    try {
      await saveTask(space.id, userId, { title, description: '', category: space.type === 'office' ? 'Work' : space.isPersonal ? 'Personal' : 'Home', priority, assigned_to: assignee || null, due_on: due, time: null, repeat: 'none' })
      done(keys.tasks(space.id))
      close()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <Field label="Task" error={error}>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing?" maxLength={180} data-autofocus autoFocus />
      </Field>
      <Field label="When">
        <ChipGroup
          value={when}
          onChange={setWhen}
          label="Due"
          options={[
            { value: 'today', label: 'Today' },
            { value: 'tomorrow', label: 'Tomorrow' },
            { value: 'weekend', label: 'Weekend' },
            { value: 'pick', label: 'Pick date' },
          ]}
        />
      </Field>
      {when === 'pick' && (
        <Field label="Date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      )}
      <div className="form-row">
        <Field label="Priority">
          <ChipGroup size="sm" value={priority} onChange={setPriority} label="Priority" options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]} />
        </Field>
        {!space.isPersonal && members.length > 1 && (
          <Field label="Assign to">
            <Select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
              <option value="">Anyone</option>
              {members.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id === userId ? 'Me' : p.display_name}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>
      <Button type="submit" size="lg" full loading={busy}>
        Add task
      </Button>
    </form>
  )
}

function ExpenseForm({ close }) {
  const { space, userId } = useSpace()
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Food')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(isoDate())
  const [optional, setOptional] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const done = useAfterSave('expenses', 'Expense saved')
  const toast = useToast()

  async function submit(e) {
    e.preventDefault()
    const n = Number(amount)
    if (!Number.isFinite(n) || n <= 0) return setError('Enter an amount')
    setBusy(true)
    try {
      await saveExpense(space.id, userId, { amount: n, category, spent_on: date, note, expense_type: optional ? 'optional' : 'essential' })
      done(['expenses', space.id])
      close()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <Field label="Amount (₹)" error={error}>
        <Input className="input-xl" type="number" inputMode="decimal" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" data-autofocus autoFocus />
      </Field>
      <Field label="Category">
        <ChipGroup size="sm" value={category} onChange={setCategory} label="Category" options={EXPENSE_CATEGORIES} />
      </Field>
      <div className="form-row">
        <Field label="Note" optional>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Lunch with team" maxLength={300} />
        </Field>
        <Field label="Date">
          <Input type="date" value={date} max={isoDate()} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
      <ChipGroup size="sm" value={optional ? 'optional' : 'essential'} onChange={(v) => setOptional(v === 'optional')} label="Type" options={[{ value: 'essential', label: 'Essential' }, { value: 'optional', label: 'Nice-to-have' }]} />
      <Button type="submit" size="lg" full loading={busy}>
        Save expense
      </Button>
    </form>
  )
}

function GroceryForm({ close }) {
  const { space, userId } = useSpace()
  const [name, setName] = useState('')
  const [qty, setQty] = useState('')
  const [busy, setBusy] = useState(false)
  const [added, setAdded] = useState([])
  const ref = useRef(null)
  const qc = useQueryClient()
  const toast = useToast()

  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    try {
      await addGrocery(space.id, userId, { name, quantity: qty })
      qc.invalidateQueries({ queryKey: keys.groceries(space.id) })
      setAdded((a) => [name.trim(), ...a].slice(0, 6))
      setName('')
      setQty('')
      ref.current?.focus()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="form-row">
        <Field label="Item">
          <Input ref={ref} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Milk" maxLength={150} data-autofocus autoFocus />
        </Field>
        <Field label="Quantity" optional>
          <Input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="e.g. 2 litres" maxLength={60} />
        </Field>
      </div>
      {added.length > 0 && <p className="subtle">Added: {added.join(', ')}</p>}
      <div className="row">
        <Button variant="secondary" onClick={close} full>
          Done
        </Button>
        <Button type="submit" full loading={busy}>
          Add item
        </Button>
      </div>
    </form>
  )
}

function EventForm({ close }) {
  const { space, userId } = useSpace()
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(isoDate())
  const [time, setTime] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const done = useAfterSave('calendar', 'Event added')
  const toast = useToast()

  async function submit(e) {
    e.preventDefault()
    if (!title.trim()) return setError('Give the event a name')
    setBusy(true)
    try {
      await saveEvent(space.id, userId, { title, event_date: date, time, category: space.type === 'office' ? 'Planning' : 'Family' })
      done(keys.events(space.id))
      close()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <Field label="Event" error={error}>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Dinner with Priya" maxLength={180} data-autofocus autoFocus />
      </Field>
      <div className="form-row">
        <Field label="Date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Time" optional>
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
      </div>
      <Button type="submit" size="lg" full loading={busy}>
        Add event
      </Button>
    </form>
  )
}
