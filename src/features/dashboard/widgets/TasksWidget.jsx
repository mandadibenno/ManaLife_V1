import { useMemo, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { Plus } from 'lucide-react'
import { useSpace } from '../../../app/SpaceContext'
import { useTasks } from '../../../hooks/data'
import { ProgressRing } from '../../../ui/Display'
import { TaskRow } from '../../tasks/TaskRow'
import { completionSet, useTaskActions } from '../../tasks/taskActions'
import { addDays } from '../../../lib/dates'
import { doneKey, isTaskDue, taskOccurrence } from '../../../lib/recurrence'
import { WidgetCard, WidgetEmpty, WidgetLoading } from './WidgetCard'

/** Today's tasks (or, in Office spaces, upcoming deadlines) with inline completion and quick add. */
export function TasksWidget({ size, today }) {
  const { space, basePath, title, icon, nameOf } = useSpace()
  const { data, isLoading } = useTasks(space)
  const { toggle, save } = useTaskActions()
  const [text, setText] = useState('')
  const office = space.type === 'office'
  const done = useMemo(() => completionSet(data), [data])

  const items = useMemo(() => {
    const tasks = data?.tasks || []
    if (office) {
      const horizon = addDays(today, 7)
      return tasks
        .filter((t) => (!t.repeat || t.repeat === 'none') && t.due_on <= horizon && !done.has(doneKey(t.id, t.due_on)))
        .map((t) => ({ task: t, date: t.due_on, done: false }))
        .sort((a, b) => a.date.localeCompare(b.date) || (a.task.priority === 'high' ? -1 : 1))
    }
    return tasks
      .filter((t) => isTaskDue(t, today))
      .map((t) => {
        const occ = taskOccurrence(t, today)
        return { task: t, date: occ, done: done.has(doneKey(t.id, occ)) }
      })
      .sort((a, b) => Number(a.done) - Number(b.done) || (a.task.time || '99').localeCompare(b.task.time || '99'))
  }, [data, done, today, office])

  const total = office ? 0 : items.length
  const completed = office ? 0 : items.filter((i) => i.done).length

  function add(e) {
    e.preventDefault()
    if (!text.trim()) return
    save.mutate(
      { values: { title: text, description: '', due_on: today, time: null, repeat: 'none', priority: 'medium', category: office ? 'Work' : space.isPersonal ? 'Personal' : 'Home', assigned_to: null } },
      { onSuccess: () => setText('') },
    )
  }

  return (
    <WidgetCard
      to={`${basePath}/tasks`}
      title={office ? 'Deadlines this week' : `${title('tasks')} · Today`}
      icon={icon('tasks')}
      size={size}
      aside={
        !office && total > 0 ? (
          <ProgressRing value={completed / total} size={38} stroke={4.5}>
            <span className="ring-small">
              {completed}/{total}
            </span>
          </ProgressRing>
        ) : null
      }
    >
      {isLoading ? (
        <WidgetLoading rows={4} />
      ) : items.length === 0 ? (
        <WidgetEmpty>{office ? 'No deadlines in the next 7 days.' : 'Nothing due today. Enjoy it.'}</WidgetEmpty>
      ) : (
        <div className="list list-compact">
          <AnimatePresence initial={false}>
            {items.slice(0, size === 'sm' ? 4 : 6).map(({ task, date, done: isDone }) => (
              <TaskRow
                key={`${task.id}-${date}`}
                task={task}
                done={isDone}
                today={today}
                nameOf={nameOf}
                compact
                overdue={date < today}
                showDate={office || date < today}
                onToggle={(v) => toggle.mutate({ task, occurrence: taskOccurrence(task, date), done: v })}
              />
            ))}
          </AnimatePresence>
          {items.length > 6 && <p className="widget-more">+{items.length - 6} more</p>}
        </div>
      )}
      <form className="widget-add" onSubmit={add}>
        <Plus size={16} aria-hidden />
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a task for today" aria-label="Add a task for today" maxLength={180} />
      </form>
    </WidgetCard>
  )
}
