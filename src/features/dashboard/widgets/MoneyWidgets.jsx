import { useMemo } from 'react'
import { useSpace } from '../../../app/SpaceContext'
import { useBills, useBudget, useExpenses } from '../../../hooks/data'
import { AnimatedNumber, BarChart, Badge, CheckCircle, ProgressBar } from '../../../ui/Display'
import { addDays, dateLabel, monthKey, relativeDay } from '../../../lib/dates'
import { money, sum } from '../../../lib/format'
import { billStates, useBillActions } from '../../bills/billActions'
import { WidgetCard, WidgetEmpty, WidgetLoading } from './WidgetCard'

export function ExpensesWidget({ size, today }) {
  const { space, basePath, title, icon } = useSpace()
  const month = monthKey(today)
  const { data, isLoading } = useExpenses(space, month)
  const budget = useBudget(space, month)
  const stats = useMemo(() => {
    const list = data || []
    const total = sum(list, (x) => x.amount)
    const todayTotal = sum(list.filter((x) => x.spent_on === today), (x) => x.amount)
    const days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13))
    const series = days.map((d) => ({ key: d, label: dateLabel(d, { day: 'numeric' }), value: sum(list.filter((x) => x.spent_on === d), (x) => x.amount), highlight: d === today }))
    const byCat = {}
    list.forEach((x) => (byCat[x.category] = (byCat[x.category] || 0) + Number(x.amount)))
    const top = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0]
    return { total, todayTotal, series, top }
  }, [data, today])
  const limit = budget.data
  const ratio = limit ? stats.total / limit : 0

  return (
    <WidgetCard to={`${basePath}/expenses`} title={title('expenses')} icon={icon('expenses')} size={size} aside={<Badge>{dateLabel(`${month}-01`, { month: 'long' })}</Badge>}>
      {isLoading ? (
        <WidgetLoading />
      ) : (
        <>
          <div className="money-hero">
            <div className="money-big">
              <AnimatedNumber value={stats.total} format={(n) => money(n)} />
            </div>
            <p className="subtle">
              {stats.todayTotal ? `${money(stats.todayTotal)} today` : 'Nothing spent today'}
              {stats.top ? ` · Most on ${stats.top[0]}` : ''}
            </p>
          </div>
          {limit ? (
            <div className="budget-line">
              <ProgressBar value={ratio} tone={ratio > 1 ? 'danger' : ratio > 0.85 ? 'warning' : 'accent'} label="Budget used" />
              <span className={ratio > 1 ? 'text-danger' : 'subtle'}>{ratio > 1 ? `${money(stats.total - limit)} over budget` : `${money(limit - stats.total)} left of ${money(limit)}`}</span>
            </div>
          ) : null}
          {size !== 'sm' && <BarChart data={stats.series} height={64} format={money} labelEvery={3} />}
        </>
      )}
    </WidgetCard>
  )
}

export function BillsWidget({ size, today }) {
  const { space, basePath, title, icon } = useSpace()
  const { data, isLoading } = useBills(space)
  const { setPaid } = useBillActions()
  const states = useMemo(() => billStates(data, today), [data, today])
  const open = states.filter((s) => !s.paid)
  const dueSoon = open.filter((s) => s.occurrence <= addDays(today, 30))
  const overdue = open.filter((s) => s.overdue).length

  return (
    <WidgetCard
      to={`${basePath}/bills`}
      title={title('bills')}
      icon={icon('bills')}
      size={size}
      tone={overdue ? 'alert' : undefined}
      aside={dueSoon.length ? <Badge tone={overdue ? 'danger' : 'neutral'}>{money(sum(dueSoon, (s) => s.bill.amount))} due</Badge> : null}
    >
      {isLoading ? (
        <WidgetLoading />
      ) : open.length === 0 ? (
        <WidgetEmpty>{states.length ? 'All bills are paid. 🎉' : 'No bills tracked yet.'}</WidgetEmpty>
      ) : (
        <div className="list list-compact">
          {open.slice(0, size === 'sm' ? 3 : 4).map(({ bill, occurrence, overdue: late }) => (
            <div key={bill.id} className="list-row">
              <CheckCircle tone="success" checked={false} onChange={() => setPaid.mutate({ bill, occurrence, paid: true })} label={`Mark ${bill.title} paid`} />
              <div className="list-row-main">
                <span className="list-row-title">{bill.title}</span>
                <span className="list-row-meta">
                  <span className={late ? 'is-overdue' : ''}>{late ? `Overdue · ${dateLabel(occurrence)}` : relativeDay(occurrence, today)}</span>
                </span>
              </div>
              <strong className="tnum">{money(bill.amount)}</strong>
            </div>
          ))}
        </div>
      )}
    </WidgetCard>
  )
}
