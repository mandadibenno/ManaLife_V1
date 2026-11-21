import { useState } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { Flame, Plus } from 'lucide-react'
import { useSpace } from '../../../app/SpaceContext'
import { useGroceries, useHabits } from '../../../hooks/data'
import { Badge, CheckCircle } from '../../../ui/Display'
import { useGroceryActions } from '../../groceries/groceryActions'
import { habitStats, useHabitActions } from '../../habits/habitActions'
import { listItem } from '../../../motion'
import { WidgetCard, WidgetEmpty, WidgetLoading } from './WidgetCard'

export function GroceriesWidget({ size }) {
  const { space, basePath, title, icon } = useSpace()
  const { data, isLoading } = useGroceries(space)
  const { add, toggle } = useGroceryActions()
  const [text, setText] = useState('')
  const open = (data || []).filter((g) => !g.checked)

  return (
    <WidgetCard to={`${basePath}/groceries`} title={title('groceries')} icon={icon('groceries')} size={size} aside={open.length ? <Badge tone="accent">{open.length} to buy</Badge> : null}>
      {isLoading ? (
        <WidgetLoading />
      ) : open.length === 0 ? (
        <WidgetEmpty>The list is empty.</WidgetEmpty>
      ) : (
        <div className="list list-compact">
          <AnimatePresence initial={false}>
            {open.slice(0, size === 'sm' ? 4 : 5).map((g) => (
              <m.div key={g.id} layout="position" className="list-row" {...listItem}>
                <CheckCircle checked={false} onChange={() => toggle.mutate({ id: g.id, checked: true })} label={`Bought ${g.name}`} size={22} disabled={g.pending} />
                <div className="list-row-main">
                  <span className="list-row-title">{g.name}</span>
                </div>
                {g.quantity && <span className="subtle">{g.quantity}</span>}
              </m.div>
            ))}
          </AnimatePresence>
          {open.length > 5 && <p className="widget-more">+{open.length - 5} more</p>}
        </div>
      )}
      <form
        className="widget-add"
        onSubmit={(e) => {
          e.preventDefault()
          if (!text.trim()) return
          add.mutate({ name: text })
          setText('')
        }}
      >
        <Plus size={16} aria-hidden />
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add an item" aria-label="Add a shopping item" maxLength={150} />
      </form>
    </WidgetCard>
  )
}

export function HabitsWidget({ size, today }) {
  const { space, basePath, title, icon, userId } = useSpace()
  const { data, isLoading } = useHabits(space)
  const { toggle } = useHabitActions()
  const habits = data?.habits || []
  const checks = data?.checks || []
  const doneCount = habits.filter((h) => checks.some((c) => c.habit_id === h.id && c.user_id === userId && c.done_on === today)).length

  return (
    <WidgetCard to={`${basePath}/habits`} title={title('habits')} icon={icon('habits')} size={size} aside={habits.length ? <Badge tone={doneCount === habits.length ? 'success' : 'neutral'}>{doneCount}/{habits.length} today</Badge> : null}>
      {isLoading ? (
        <WidgetLoading />
      ) : habits.length === 0 ? (
        <WidgetEmpty>Start a small daily habit.</WidgetEmpty>
      ) : (
        <div className="list list-compact">
          {habits.slice(0, 5).map((h) => {
            const s = habitStats(h.id, checks, userId, today)
            return (
              <div key={h.id} className={`list-row ${s.doneToday ? 'is-done' : ''}`}>
                <CheckCircle checked={s.doneToday} onChange={(v) => toggle.mutate({ habit: h, day: today, done: v })} label={`${h.title} today`} size={22} />
                <div className="list-row-main">
                  <span className="list-row-title">{h.title}</span>
                </div>
                {s.streak > 0 && (
                  <span className="streak" title={`${s.streak}-day streak`}>
                    <Flame size={13} /> {s.streak}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </WidgetCard>
  )
}
