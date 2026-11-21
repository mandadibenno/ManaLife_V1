import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useSpace } from '../../../app/SpaceContext'
import { useEvents, useMeals } from '../../../hooks/data'
import { Badge } from '../../../ui/Display'
import { addDays, dateLabel, relativeDay, startOfWeek, timeLabel } from '../../../lib/dates'
import { MAIN_MEALS, MEAL_LABELS } from '../../../services/routines'
import { useReminders } from '../../reminders/useReminders'
import { REMINDER_ICONS } from '../../reminders/reminderMeta'
import { WidgetCard, WidgetEmpty, WidgetLoading } from './WidgetCard'

export function CalendarWidget({ size, today }) {
  const { space, basePath, title, icon } = useSpace()
  const { data, isLoading } = useEvents(space)
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i))
  const upcoming = useMemo(() => (data || []).filter((e) => e.event_date >= today).sort((a, b) => a.event_date.localeCompare(b.event_date) || (a.time || '').localeCompare(b.time || '')), [data, today])
  const busy = new Set(upcoming.map((e) => e.event_date))

  return (
    <WidgetCard to={`${basePath}/calendar`} title={title('calendar')} icon={icon('calendar')} size={size}>
      <div className="week-strip" aria-label="Next 7 days">
        {week.map((d) => (
          <div key={d} className={`week-day ${d === today ? 'is-today' : ''}`}>
            <span>{dateLabel(d, { weekday: 'narrow' })}</span>
            <strong>{Number(d.slice(-2))}</strong>
            <i className={busy.has(d) ? 'is-on' : ''} />
          </div>
        ))}
      </div>
      {isLoading ? (
        <WidgetLoading rows={2} />
      ) : upcoming.length === 0 ? (
        <WidgetEmpty>No plans coming up.</WidgetEmpty>
      ) : (
        <div className="event-list">
          {upcoming.slice(0, size === 'sm' ? 2 : 3).map((e) => (
            <div key={e.id} className="event-item">
              <span className="date-chip">
                <small>{dateLabel(e.event_date, { month: 'short' })}</small>
                <strong>{Number(e.event_date.slice(-2))}</strong>
              </span>
              <div className="list-row-main">
                <span className="list-row-title">{e.title}</span>
                <span className="list-row-meta">
                  <span>{relativeDay(e.event_date, today)}</span>
                  <span>{e.time ? timeLabel(e.time) : 'All day'}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </WidgetCard>
  )
}

export function MealsWidget({ size, today }) {
  const { space, basePath, title, icon } = useSpace()
  const { data, isLoading } = useMeals(space, startOfWeek(today))
  const todays = (data || []).filter((m) => m.meal_date === today)
  return (
    <WidgetCard to={`${basePath}/meals`} title={`${title('meals')} · Today`} icon={icon('meals')} size={size}>
      {isLoading ? (
        <WidgetLoading />
      ) : (
        <div className="meal-today">
          {MAIN_MEALS.map((type) => {
            const meal = todays.find((m) => m.meal_type === type)
            return (
              <Link key={type} to={`${basePath}/meals`} className={`meal-slot ${meal ? 'has-meal' : ''}`}>
                <small>{MEAL_LABELS[type]}</small>
                <span className="truncate">{meal ? meal.meal_name : 'Plan a meal'}</span>
              </Link>
            )
          })}
        </div>
      )}
    </WidgetCard>
  )
}

export function RemindersWidget({ size }) {
  const { basePath, title, icon } = useSpace()
  const { items, loading, today } = useReminders()
  const overdue = items.filter((i) => i.status === 'overdue').length
  const dueToday = items.filter((i) => i.status === 'today' && !i.soft).length
  const top = items.filter((i) => !i.soft).slice(0, size === 'sm' ? 3 : 4)
  return (
    <WidgetCard
      to={`${basePath}/reminders`}
      title={title('reminders')}
      icon={icon('reminders')}
      size={size}
      tone={overdue ? 'alert' : undefined}
      aside={
        <div className="row" style={{ gap: 6 }}>
          {overdue > 0 && <Badge tone="danger">{overdue} overdue</Badge>}
          {dueToday > 0 && <Badge tone="accent">{dueToday} today</Badge>}
        </div>
      }
    >
      {loading ? (
        <WidgetLoading />
      ) : top.length === 0 ? (
        <WidgetEmpty>You're all caught up.</WidgetEmpty>
      ) : (
        <div className="list list-compact">
          {top.map((r) => {
            const Icon = REMINDER_ICONS[r.kind]
            return (
              <Link key={r.id} to={r.to} className="list-row reminder-row">
                <span className={`reminder-dot is-${r.status}`} aria-hidden>
                  <Icon size={14} />
                </span>
                <div className="list-row-main">
                  <span className="list-row-title">{r.title}</span>
                  <span className="list-row-meta">
                    <span className={r.status === 'overdue' ? 'is-overdue' : ''}>{r.status === 'overdue' ? `Overdue · ${dateLabel(r.date)}` : relativeDay(r.date, today)}</span>
                    {r.time && <span>{timeLabel(r.time)}</span>}
                    {r.meta && <span>{r.meta}</span>}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </WidgetCard>
  )
}
