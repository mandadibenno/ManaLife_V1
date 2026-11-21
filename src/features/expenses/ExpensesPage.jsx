import { useMemo, useState } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { ChartColumn, ChevronLeft, ChevronRight, Download, Pencil, Plus, Target, Trash2 } from 'lucide-react'
import { useSpace } from '../../app/SpaceContext'
import { keys, useAction, useBudget, useExpenses } from '../../hooks/data'
import { useToday } from '../../hooks/useToday'
import { Page, PageHeader, Reveal } from '../../ui/Page'
import { Button, IconButton } from '../../ui/Button'
import { AnimatedNumber, BarChart, Card, CardHeader, EmptyState, ProgressBar, SkeletonRows, Stat } from '../../ui/Display'
import { ChipGroup, Field, Input, SearchInput, Select } from '../../ui/Form'
import { Menu } from '../../ui/Menu'
import { Sheet } from '../../ui/Sheet'
import { useConfirm } from '../../ui/Confirm'
import { dateLabel, monthKey, monthLabel, monthRange, relativeDay, shiftMonth } from '../../lib/dates'
import { downloadCsv, money, shortName, sum } from '../../lib/format'
import { EXPENSE_CATEGORIES, deleteExpense, saveExpense, setBudget } from '../../services/money'
import { listItem } from '../../motion'

const CAT_COLORS = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--c6)', 'var(--c7)', 'var(--c8)']

export default function ExpensesPage() {
  const { space, title, userId, nameOf } = useSpace()
  const today = useToday()
  const [month, setMonth] = useState(monthKey(today))
  const { data, isLoading } = useExpenses(space, month)
  const budget = useBudget(space, month)
  const confirm = useConfirm()
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState('')
  const [editing, setEditing] = useState(null)
  const [budgetOpen, setBudgetOpen] = useState(false)
  const listKey = keys.expenses(space.id, month)

  const save = useAction(({ values, id }) => saveExpense(space.id, userId, values, id), { invalidate: [['expenses', space.id]], success: (_d, { id }) => (id ? 'Expense updated' : 'Expense saved') })
  const remove = useAction((id) => deleteExpense(space.id, id), {
    invalidate: [listKey],
    success: 'Expense deleted',
    optimistic: { key: listKey, update: (old, id) => old && old.filter((x) => x.id !== id) },
  })
  const saveBudget = useAction((limit) => setBudget(space.id, userId, month, limit), { invalidate: [keys.budget(space.id, month)], success: 'Budget saved', onSuccess: () => setBudgetOpen(false) })

  const stats = useMemo(() => {
    const list = data || []
    const total = sum(list, (x) => x.amount)
    const optional = sum(list.filter((x) => x.expense_type === 'optional'), (x) => x.amount)
    const { days } = monthRange(month)
    const isCurrent = month === monthKey(today)
    const elapsed = isCurrent ? Number(today.slice(-2)) : days
    const daily = Array.from({ length: days }, (_, i) => {
      const d = `${month}-${String(i + 1).padStart(2, '0')}`
      return { key: d, label: String(i + 1), value: sum(list.filter((x) => x.spent_on === d), (x) => x.amount), highlight: d === today, title: `${dateLabel(d)}: ${money(sum(list.filter((x) => x.spent_on === d), (x) => x.amount))}` }
    })
    const byCat = EXPENSE_CATEGORIES.map((name, i) => ({ name, color: CAT_COLORS[i], amount: sum(list.filter((x) => x.category === name), (x) => x.amount) }))
      .filter((c) => c.amount > 0)
      .sort((a, b) => b.amount - a.amount)
    return { total, optional, essential: total - optional, avg: elapsed ? total / elapsed : 0, daily, byCat, isCurrent, elapsed, days }
  }, [data, month, today])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (data || []).filter((x) => (!cat || x.category === cat) && (!q || (x.note || '').toLowerCase().includes(q) || x.category.toLowerCase().includes(q)))
  }, [data, query, cat])
  const byDay = useMemo(() => {
    const map = new Map()
    filtered.forEach((x) => {
      if (!map.has(x.spent_on)) map.set(x.spent_on, [])
      map.get(x.spent_on).push(x)
    })
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  const limit = budget.data
  const ratio = limit ? stats.total / limit : 0
  const projected = stats.isCurrent && stats.elapsed ? (stats.total / stats.elapsed) * stats.days : null

  function exportCsv() {
    downloadCsv(`manalife-${space.name.replace(/\W+/g, '-').toLowerCase()}-${month}.csv`, [
      ['Date', 'Category', 'Type', 'Amount', 'Note', 'Added by'],
      ...(data || []).map((x) => [x.spent_on, x.category, x.expense_type, x.amount, x.note || '', nameOf(x.created_by)]),
    ])
  }

  return (
    <Page>
      <PageHeader
        eyebrow={space.name}
        title={title('expenses')}
        description={space.isPersonal ? 'Where your money goes, day by day.' : 'Shared spending, visible to everyone in this space.'}
        actions={
          <>
            <Button variant="secondary" icon={Download} onClick={exportCsv} disabled={!data?.length}>
              Export
            </Button>
            <Button icon={Plus} onClick={() => setEditing({})}>
              Add expense
            </Button>
          </>
        }
      />

      <Reveal className="month-nav">
        <IconButton icon={ChevronLeft} label="Previous month" variant="outline" onClick={() => setMonth((m) => shiftMonth(m, -1))} />
        <h2>{monthLabel(month)}</h2>
        <IconButton icon={ChevronRight} label="Next month" variant="outline" onClick={() => setMonth((m) => shiftMonth(m, 1))} disabled={month >= monthKey(today)} />
        {month !== monthKey(today) && (
          <Button size="sm" variant="ghost" onClick={() => setMonth(monthKey(today))}>
            This month
          </Button>
        )}
      </Reveal>

      <div className="money-layout">
        <Reveal as="section">
          <Card className="spend-hero">
            <div className="spend-top">
              <div>
                <p className="eyebrow">Spent in {monthLabel(month, { month: 'long' })}</p>
                <div className="money-big xl">
                  <AnimatedNumber value={stats.total} format={(n) => money(n)} />
                </div>
                <p className="subtle">
                  {money(stats.avg)} a day on average{projected && stats.isCurrent ? ` · on track for ${money(projected)}` : ''}
                </p>
              </div>
              <Button variant="soft" size="sm" icon={Target} onClick={() => setBudgetOpen(true)}>
                {limit ? 'Edit budget' : 'Set budget'}
              </Button>
            </div>
            {limit ? (
              <div className="budget-line">
                <ProgressBar value={ratio} height={10} tone={ratio > 1 ? 'danger' : ratio > 0.85 ? 'warning' : 'accent'} label="Budget used" />
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span className={ratio > 1 ? 'text-danger' : 'muted'}>{ratio > 1 ? `${money(stats.total - limit)} over budget` : `${money(limit - stats.total)} left`}</span>
                  <span className="subtle">of {money(limit)}</span>
                </div>
              </div>
            ) : null}
            <BarChart data={stats.daily} height={120} format={money} labelEvery={stats.days > 20 ? 5 : 1} />
          </Card>
        </Reveal>

        <Reveal as="aside" className="stack" style={{ gap: 16 }}>
          <div className="stats-row two">
            <Card>
              <Stat label="Essential" value={money(stats.essential)} />
            </Card>
            <Card>
              <Stat label="Nice-to-have" value={money(stats.optional)} hint={stats.total ? `${Math.round((stats.optional / stats.total) * 100)}% of spending` : undefined} />
            </Card>
          </div>
          <Card>
            <CardHeader icon={ChartColumn} title="By category" />
            {stats.byCat.length === 0 ? (
              <p className="subtle">No spending recorded this month.</p>
            ) : (
              <>
                <div className="cat-stack" aria-hidden>
                  {stats.byCat.map((c) => (
                    <m.span key={c.name} style={{ background: c.color }} initial={{ flexGrow: 0 }} animate={{ flexGrow: c.amount }} transition={{ duration: 0.7 }} />
                  ))}
                </div>
                <div className="cat-list">
                  {stats.byCat.map((c) => (
                    <button key={c.name} type="button" className={`cat-row ${cat === c.name ? 'is-on' : ''}`} onClick={() => setCat((v) => (v === c.name ? '' : c.name))}>
                      <i style={{ background: c.color }} />
                      <span>{c.name}</span>
                      <span className="subtle">{Math.round((c.amount / stats.total) * 100)}%</span>
                      <strong className="tnum">{money(c.amount)}</strong>
                    </button>
                  ))}
                </div>
              </>
            )}
          </Card>
        </Reveal>
      </div>

      <Reveal className="toolbar" style={{ marginTop: 20 }}>
        <SearchInput value={query} onChange={setQuery} placeholder="Search notes" />
        <div style={{ width: 170 }}>
          <Select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category filter">
            <option value="">All categories</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </div>
      </Reveal>

      <Reveal>
        <Card className="card-list">
          {isLoading ? (
            <SkeletonRows rows={5} />
          ) : byDay.length === 0 ? (
            <EmptyState icon={ChartColumn} title={data?.length ? 'No matching expenses' : 'No expenses this month'} body={data?.length ? 'Try a different filter.' : 'Use Quick add or “Add expense” to log spending in seconds.'} />
          ) : (
            byDay.map(([day, items]) => (
              <div key={day} className="task-group">
                <p className="group-label day-label">
                  <span>{relativeDay(day, today) === dateLabel(day) ? dateLabel(day, { weekday: 'short', day: 'numeric', month: 'short' }) : relativeDay(day, today)}</span>
                  <span className="tnum">{money(sum(items, (x) => x.amount))}</span>
                </p>
                <div className="list">
                  <AnimatePresence initial={false}>
                    {items.map((x) => (
                      <m.div key={x.id} layout="position" className="list-row" {...listItem}>
                        <span className="cat-dot" style={{ background: CAT_COLORS[EXPENSE_CATEGORIES.indexOf(x.category)] || 'var(--c8)' }} aria-hidden />
                        <div className="list-row-main" role="button" tabIndex={0} onClick={() => setEditing(x)} onKeyDown={(e) => e.key === 'Enter' && setEditing(x)}>
                          <span className="list-row-title">{x.note || x.category}</span>
                          <span className="list-row-meta">
                            <span>{x.category}</span>
                            {x.expense_type === 'optional' && <span>Nice-to-have</span>}
                            {!space.isPersonal && <span>{x.created_by === userId ? 'You' : shortName(nameOf(x.created_by))}</span>}
                          </span>
                        </div>
                        <strong className="tnum">{money(x.amount, true)}</strong>
                        <div className="list-row-actions reveal">
                          <Menu
                            label="Expense actions"
                            items={[
                              { label: 'Edit', icon: Pencil, onClick: () => setEditing(x) },
                              {
                                label: 'Delete',
                                icon: Trash2,
                                tone: 'danger',
                                onClick: async () => {
                                  if (await confirm({ title: 'Delete expense?', body: `${money(x.amount)} · ${x.category}`, confirmLabel: 'Delete', tone: 'danger' })) remove.mutate(x.id)
                                },
                              },
                            ]}
                          />
                        </div>
                      </m.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))
          )}
        </Card>
      </Reveal>

      <ExpenseForm open={!!editing} expense={editing?.id ? editing : null} onClose={() => setEditing(null)} saving={save.isPending} onSave={(values) => save.mutate({ values, id: editing?.id }, { onSuccess: () => setEditing(null) })} />
      <BudgetSheet open={budgetOpen} onClose={() => setBudgetOpen(false)} current={limit} month={month} saving={saveBudget.isPending} onSave={(v) => saveBudget.mutate(v)} />
    </Page>
  )
}

function ExpenseForm({ open, expense, onClose, onSave, saving }) {
  const today = useToday()
  const [form, setForm] = useState({})
  const [error, setError] = useState('')
  const [lastKey, setLastKey] = useState(null)
  const k = open ? expense?.id || 'new' : null
  if (k !== lastKey) {
    setLastKey(k)
    setError('')
    setForm(expense ? { amount: String(expense.amount), category: expense.category, expense_type: expense.expense_type, spent_on: expense.spent_on, note: expense.note || '' } : { amount: '', category: 'Food', expense_type: 'essential', spent_on: today, note: '' })
  }
  const set = (key) => (v) => setForm((f) => ({ ...f, [key]: v?.target ? v.target.value : v }))
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={expense ? 'Edit expense' : 'New expense'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="expense-form" loading={saving}>
            {expense ? 'Save changes' : 'Save expense'}
          </Button>
        </>
      }
    >
      <form
        id="expense-form"
        className="form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          if (!(Number(form.amount) > 0)) return setError('Enter an amount greater than zero')
          if (!form.spent_on) return setError('Pick a date')
          onSave(form)
        }}
      >
        <Field label="Amount (₹)" error={error}>
          <Input className="input-xl" type="number" inputMode="decimal" min="0" step="0.01" value={form.amount || ''} onChange={set('amount')} placeholder="0" data-autofocus />
        </Field>
        <Field label="Category">
          <ChipGroup size="sm" label="Category" value={form.category} onChange={set('category')} options={EXPENSE_CATEGORIES} />
        </Field>
        <div className="form-row">
          <Field label="Date">
            <Input type="date" value={form.spent_on || ''} max={today} onChange={set('spent_on')} />
          </Field>
          <Field label="Type" hint="Nice-to-have isn't bad — it's just worth a look.">
            <Select value={form.expense_type} onChange={set('expense_type')}>
              <option value="essential">Essential</option>
              <option value="optional">Nice-to-have</option>
            </Select>
          </Field>
        </div>
        <Field label="Note" optional>
          <Input value={form.note || ''} onChange={set('note')} maxLength={300} placeholder="What was it for?" />
        </Field>
      </form>
    </Sheet>
  )
}

function BudgetSheet({ open, onClose, current, month, onSave, saving }) {
  const [value, setValue] = useState('')
  const [was, setWas] = useState(false)
  if (open && !was) setValue(current ? String(current) : '')
  if (open !== was) setWas(open)
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Budget for ${monthLabel(month)}`}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} disabled={value === '' || Number(value) < 0} onClick={() => onSave(Number(value))}>
            Save budget
          </Button>
        </>
      }
    >
      <Field label="Monthly limit (₹)" hint="Set to 0 to turn the budget off.">
        <Input className="input-xl" type="number" inputMode="decimal" min="0" value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
      </Field>
    </Sheet>
  )
}
