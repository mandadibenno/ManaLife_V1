import { useMemo, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { CircleCheck, ListChecks, Plus, Sparkles } from 'lucide-react'
import { useSpace } from '../../app/SpaceContext'
import { useTasks } from '../../hooks/data'
import { useToday } from '../../hooks/useToday'
import { useConfirm } from '../../ui/Confirm'
import { Page, PageHeader, Reveal } from '../../ui/Page'
import { Button } from '../../ui/Button'
import { Card, EmptyState, ProgressRing, Segmented, SkeletonRows } from '../../ui/Display'
import { Input, SearchInput, Select } from '../../ui/Form'
import { TaskRow } from './TaskRow'
import { TaskForm } from './TaskForm'
import { completionSet, useTaskActions } from './taskActions'
import { addDays, dateLabel, diffDays } from '../../lib/dates'
import { doneKey, isTaskDue, nextTaskDate, taskOccurrence } from '../../lib/recurrence'

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 }

export default function TasksPage() {
  const { space, title, userId, nameOf } = useSpace()
  const today = useToday()
  const { data, isLoading } = useTasks(space)
  const { toggle, save, remove } = useTaskActions()
  const confirm = useConfirm()
  const [view, setView] = useState('today')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('due')
  const [assignee, setAssignee] = useState('')
  const [editing, setEditing] = useState(null)
  const [quick, setQuick] = useState('')

  const done = useMemo(() => completionSet(data), [data])
  const tasks = data?.tasks || []
  const isDone = (t, date = today) => done.has(doneKey(t.id, taskOccurrence(t, date)))

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = tasks.filter((t) => !q || t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q))
    if (assignee) list = list.filter((t) => (assignee === 'me' ? t.assigned_to === userId : assignee === 'none' ? !t.assigned_to : t.assigned_to === assignee))
    const sorter = (a, b) =>
      sort === 'priority'
        ? PRIORITY_RANK[a.task.priority] - PRIORITY_RANK[b.task.priority] || a.date.localeCompare(b.date)
        : sort === 'title'
          ? a.task.title.localeCompare(b.task.title)
          : a.date.localeCompare(b.date) || (a.task.time || '99').localeCompare(b.task.time || '99')
    const entry = (t, date) => ({ task: t, date, done: isDone(t, date) })
    const oneOff = (t) => !t.repeat || t.repeat === 'none'

    if (view === 'today') {
      const items = list.filter((t) => isTaskDue(t, today)).map((t) => entry(t, oneOff(t) ? t.due_on : today))
      const open = items.filter((i) => !i.done).sort(sorter)
      const closed = items.filter((i) => i.done)
      return [
        { label: null, items: open },
        { label: closed.length ? `Completed · ${closed.length}` : null, items: closed },
      ]
    }
    if (view === 'upcoming') {
      const until = addDays(today, 30)
      const items = list
        .map((t) => entry(t, oneOff(t) ? t.due_on : nextTaskDate(t, addDays(today, 1))))
        .filter((i) => i.date && i.date > today && i.date <= until && !i.done && i.task.repeat !== 'daily')
        .sort(sorter)
      const by = new Map()
      for (const i of items) {
        const n = diffDays(today, i.date)
        const label = n === 1 ? 'Tomorrow' : n < 7 ? dateLabel(i.date, { weekday: 'long', day: 'numeric', month: 'short' }) : n < 14 ? 'Next week' : 'Later this month'
        if (!by.has(label)) by.set(label, [])
        by.get(label).push(i)
      }
      return [...by.entries()].map(([label, items]) => ({ label, items }))
    }
    if (view === 'overdue') {
      return [{ label: null, items: list.filter((t) => oneOff(t) && t.due_on < today).map((t) => entry(t, t.due_on)).filter((i) => !i.done).sort(sorter) }]
    }
    if (view === 'done') {
      return [{ label: null, items: list.map((t) => entry(t, oneOff(t) ? t.due_on : today)).filter((i) => i.done).sort(sorter) }]
    }
    // all
    const recurring = list.filter((t) => !oneOff(t)).map((t) => entry(t, isTaskDue(t, today) ? today : nextTaskDate(t, today) || t.due_on)).sort(sorter)
    const open = list.filter(oneOff).map((t) => entry(t, t.due_on)).filter((i) => !i.done).sort(sorter)
    const closed = list.filter(oneOff).map((t) => entry(t, t.due_on)).filter((i) => i.done)
    return [
      { label: open.length ? 'Open' : null, items: open },
      { label: recurring.length ? 'Routines' : null, items: recurring },
      { label: closed.length ? 'Completed' : null, items: closed },
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, done, view, query, sort, assignee, today, userId])

  const todayItems = tasks.filter((t) => isTaskDue(t, today))
  const todayDone = todayItems.filter((t) => isDone(t)).length
  const overdueCount = tasks.filter((t) => (!t.repeat || t.repeat === 'none') && t.due_on < today && !isDone(t, t.due_on)).length
  const total = groups.reduce((n, g) => n + g.items.length, 0)

  async function onDelete(task) {
    const ok = await confirm({ title: 'Delete task?', body: `“${task.title}” and its history will be removed for everyone in this space.`, confirmLabel: 'Delete', tone: 'danger' })
    if (ok) remove.mutate(task.id)
  }

  function quickAdd(e) {
    e.preventDefault()
    if (!quick.trim()) return
    save.mutate(
      { values: { title: quick, description: '', due_on: view === 'upcoming' ? addDays(today, 1) : today, time: null, repeat: 'none', priority: 'medium', category: space.type === 'office' ? 'Work' : space.isPersonal ? 'Personal' : 'Home', assigned_to: null } },
      { onSuccess: () => setQuick('') },
    )
  }

  const views = [
    { value: 'today', label: 'Today', count: todayItems.length - todayDone || undefined },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'overdue', label: 'Overdue', count: overdueCount || undefined },
    { value: 'all', label: 'All' },
    { value: 'done', label: 'Done' },
  ]

  return (
    <Page>
      <PageHeader
        eyebrow={space.name}
        title={title('tasks')}
        description={space.type === 'office' ? 'Deadlines and work for the whole team.' : space.isPersonal ? 'Your to-dos and routines.' : `Shared with everyone in ${space.name}.`}
        actions={
          <Button icon={Plus} onClick={() => setEditing({})}>
            New task
          </Button>
        }
      />

      <div className="tasks-layout">
        <div className="stack" style={{ gap: 14, minWidth: 0 }}>
          <Reveal className="toolbar">
            <Segmented layoutId="task-view" label="Task view" value={view} onChange={setView} options={views} />
          </Reveal>
          <Reveal className="toolbar">
            <SearchInput value={query} onChange={setQuery} placeholder="Search tasks" />
            {!space.isPersonal && (
              <div style={{ width: 170 }}>
                <Select value={assignee} onChange={(e) => setAssignee(e.target.value)} aria-label="Filter by person">
                  <option value="">Everyone</option>
                  <option value="me">Assigned to me</option>
                  <option value="none">Unassigned</option>
                </Select>
              </div>
            )}
            <div style={{ width: 150 }}>
              <Select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort tasks">
                <option value="due">By due date</option>
                <option value="priority">By priority</option>
                <option value="title">A–Z</option>
              </Select>
            </div>
          </Reveal>

          <Reveal as="section">
            <Card className="card-list">
              <form className="inline-add" onSubmit={quickAdd}>
                <Plus size={18} className="inline-add-icon" aria-hidden />
                <Input value={quick} onChange={(e) => setQuick(e.target.value)} placeholder={view === 'upcoming' ? 'Add a task for tomorrow…' : 'Add a task for today…'} aria-label="Quick add task" maxLength={180} />
                {quick && (
                  <Button type="submit" size="sm" loading={save.isPending}>
                    Add
                  </Button>
                )}
              </form>
              {isLoading ? (
                <SkeletonRows rows={5} />
              ) : total === 0 ? (
                <EmptyState
                  icon={view === 'today' ? CircleCheck : ListChecks}
                  title={query ? 'No matching tasks' : view === 'today' ? 'Nothing due today' : view === 'overdue' ? 'Nothing overdue' : view === 'done' ? 'Nothing completed yet' : 'No tasks here yet'}
                  body={query ? 'Try a different search.' : view === 'today' ? 'Enjoy the calm, or plan something for later.' : 'Tasks you add will show up here.'}
                />
              ) : (
                groups.map(
                  (g, gi) =>
                    g.items.length > 0 && (
                      <div key={g.label || gi} className="task-group">
                        {g.label && <p className="group-label">{g.label}</p>}
                        <div className="list">
                          <AnimatePresence initial={false}>
                            {g.items.map(({ task, date, done: isDoneNow }) => (
                              <TaskRow
                                key={`${task.id}-${date}`}
                                task={task}
                                done={isDoneNow}
                                today={today}
                                nameOf={nameOf}
                                overdue={date < today}
                                showDate={view !== 'today' || task.due_on < today}
                                onToggle={(v) => toggle.mutate({ task, occurrence: taskOccurrence(task, date), done: v })}
                                onEdit={() => setEditing(task)}
                                onDelete={() => onDelete(task)}
                              />
                            ))}
                          </AnimatePresence>
                        </div>
                      </div>
                    ),
                )
              )}
            </Card>
          </Reveal>
        </div>

        <Reveal as="aside" className="tasks-aside">
          <Card>
            <div className="today-summary">
              <ProgressRing value={todayItems.length ? todayDone / todayItems.length : 0} size={84} stroke={8}>
                <span className="ring-big">{todayItems.length ? Math.round((todayDone / todayItems.length) * 100) : 0}%</span>
              </ProgressRing>
              <div>
                <p className="eyebrow">Today</p>
                <h3>
                  {todayDone} of {todayItems.length} done
                </h3>
                <p className="subtle">{todayItems.length - todayDone === 0 ? (todayItems.length ? 'All clear — nice work.' : 'A free day.') : `${todayItems.length - todayDone} to go`}</p>
              </div>
            </div>
            {overdueCount > 0 && (
              <button type="button" className="aside-alert" onClick={() => setView('overdue')}>
                {overdueCount} overdue {overdueCount === 1 ? 'task' : 'tasks'} — review
              </button>
            )}
            <div className="notice" style={{ marginTop: 14 }}>
              <Sparkles size={16} />
              <span>
                {space.type === 'office'
                  ? 'Tip: mark urgent work as High priority — it shows first on the dashboard.'
                  : 'Tip: use “Every day” for routines. They reappear automatically and keep their history.'}
              </span>
            </div>
          </Card>
        </Reveal>
      </div>

      <TaskForm
        open={!!editing}
        task={editing?.id ? editing : null}
        onClose={() => setEditing(null)}
        saving={save.isPending}
        onSave={(values) => save.mutate({ values, id: editing?.id }, { onSuccess: () => setEditing(null) })}
      />
    </Page>
  )
}
