import { useState } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { Flame, Pencil, Plus, Repeat2, Trash2 } from 'lucide-react'
import { useSpace } from '../../app/SpaceContext'
import { useHabits } from '../../hooks/data'
import { useToday } from '../../hooks/useToday'
import { Page, PageHeader, Reveal } from '../../ui/Page'
import { Button } from '../../ui/Button'
import { AvatarStack, Card, CheckCircle, EmptyState, ProgressBar, Skeleton } from '../../ui/Display'
import { Field, Input } from '../../ui/Form'
import { Menu } from '../../ui/Menu'
import { Sheet } from '../../ui/Sheet'
import { useConfirm } from '../../ui/Confirm'
import { dateLabel, weekdayShort } from '../../lib/dates'
import { habitStats, useHabitActions } from './habitActions'
import { ease } from '../../motion'

const IDEAS = ['Drink 8 glasses of water', 'Walk 30 minutes', 'Read 20 pages', 'Meditate 10 minutes', 'No sugar', 'Sleep before 11']

export default function HabitsPage() {
  const { space, title, userId, members } = useSpace()
  const today = useToday()
  const { data, isLoading } = useHabits(space)
  const { toggle, save, remove } = useHabitActions()
  const confirm = useConfirm()
  const [editing, setEditing] = useState(null)
  const habits = data?.habits || []
  const checks = data?.checks || []
  const doneToday = habits.filter((h) => habitStats(h.id, checks, userId, today).doneToday).length

  return (
    <Page className="page-narrow">
      <PageHeader
        eyebrow={space.name}
        title={title('habits')}
        description={space.isPersonal ? 'Small routines, done daily, add up.' : 'Everyone tracks their own progress; you can see who showed up today.'}
        actions={
          <Button icon={Plus} onClick={() => setEditing({})}>
            New habit
          </Button>
        }
      />
      {habits.length > 0 && (
        <Reveal className="habit-summary">
          <span className="habit-big">
            {doneToday}/{habits.length}
          </span>
          <span className="muted">done today{doneToday === habits.length ? ' — perfect day ✨' : ''}</span>
        </Reveal>
      )}
      {isLoading ? (
        <Card>
          <Skeleton height={90} />
        </Card>
      ) : habits.length === 0 ? (
        <Card>
          <EmptyState
            icon={Repeat2}
            title="Start with one tiny habit"
            body="Pick something you can do even on a busy day."
            action={
              <div className="chips" style={{ justifyContent: 'center' }}>
                {IDEAS.map((idea) => (
                  <button key={idea} type="button" className="chip" onClick={() => save.mutate({ title: idea })}>
                    <Plus size={13} /> {idea}
                  </button>
                ))}
              </div>
            }
          />
        </Card>
      ) : (
        <div className="habit-list">
          <AnimatePresence initial={false}>
            {habits.map((h, i) => {
              const s = habitStats(h.id, checks, userId, today)
              const others = checks.filter((c) => c.habit_id === h.id && c.done_on === today && c.user_id !== userId).map((c) => members.find((p) => p.id === c.user_id)).filter(Boolean)
              return (
                <m.article key={h.id} layout className={`habit-card ${s.doneToday ? 'is-done' : ''}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { duration: 0.32, ease, delay: i * 0.04 } }} exit={{ opacity: 0, scale: 0.97 }}>
                  <div className="habit-main">
                    <CheckCircle size={34} checked={s.doneToday} onChange={(v) => toggle.mutate({ habit: h, day: today, done: v })} label={`${h.title} — ${s.doneToday ? 'undo today' : 'done today'}`} />
                    <div className="habit-text">
                      <h3>{h.title}</h3>
                      <p className="list-row-meta">
                        <span className={s.streak ? 'streak' : ''}>
                          <Flame size={13} /> {s.streak}-day streak
                        </span>
                        <span>
                          {s.monthDone}/{s.daysSoFar} days this month
                        </span>
                      </p>
                    </div>
                    <Menu
                      label={`Actions for ${h.title}`}
                      items={[
                        { label: 'Rename', icon: Pencil, onClick: () => setEditing(h) },
                        {
                          label: 'Delete',
                          icon: Trash2,
                          tone: 'danger',
                          onClick: async () => {
                            if (await confirm({ title: 'Delete habit?', body: `“${h.title}” and its history will be removed${space.isPersonal ? '' : ' for everyone'}.`, confirmLabel: 'Delete', tone: 'danger' })) remove.mutate(h.id)
                          },
                        },
                      ]}
                    />
                  </div>
                  <div className="habit-week" aria-label="Last 7 days">
                    {s.last7.map((d) => (
                      <button
                        key={d.date}
                        type="button"
                        className={`habit-day ${d.done ? 'is-done' : ''} ${d.date === today ? 'is-today' : ''}`}
                        onClick={() => toggle.mutate({ habit: h, day: d.date, done: !d.done })}
                        aria-label={`${dateLabel(d.date, { weekday: 'long', day: 'numeric', month: 'short' })}: ${d.done ? 'done' : 'not done'}`}
                        aria-pressed={d.done}
                      >
                        <small>{weekdayShort(d.date).slice(0, 2)}</small>
                        <span>{Number(d.date.slice(-2))}</span>
                      </button>
                    ))}
                  </div>
                  <div className="habit-foot">
                    <ProgressBar value={s.rate} height={6} tone={s.rate >= 0.8 ? 'success' : 'accent'} label="This month" />
                    {!space.isPersonal && (
                      <span className="habit-who">
                        {others.length ? (
                          <>
                            <AvatarStack people={others} size={22} /> also did it today
                          </>
                        ) : (
                          <span className="subtle">No one else yet today</span>
                        )}
                      </span>
                    )}
                  </div>
                </m.article>
              )
            })}
          </AnimatePresence>
        </div>
      )}
      <HabitForm open={!!editing} habit={editing?.id ? editing : null} onClose={() => setEditing(null)} saving={save.isPending} onSave={(t) => save.mutate({ title: t, id: editing?.id }, { onSuccess: () => setEditing(null) })} />
    </Page>
  )
}

function HabitForm({ open, habit, onClose, onSave, saving }) {
  const [value, setValue] = useState('')
  const [lastKey, setLastKey] = useState(null)
  const k = open ? habit?.id || 'new' : null
  if (k !== lastKey) {
    setLastKey(k)
    setValue(habit?.title || '')
  }
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={habit ? 'Rename habit' : 'New habit'}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="habit-form" loading={saving} disabled={!value.trim()}>
            {habit ? 'Save' : 'Add habit'}
          </Button>
        </>
      }
    >
      <form
        id="habit-form"
        onSubmit={(e) => {
          e.preventDefault()
          if (value.trim()) onSave(value)
        }}
      >
        <Field label="Habit" hint="Keep it small and specific.">
          <Input value={value} onChange={(e) => setValue(e.target.value)} maxLength={100} placeholder="e.g. Walk after dinner" data-autofocus />
        </Field>
      </form>
    </Sheet>
  )
}
