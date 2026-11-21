import { useSpace } from '../../app/SpaceContext'
import { keys, useAction } from '../../hooks/data'
import { deleteHabit, saveHabit, setHabitDone } from '../../services/routines'
import { addDays } from '../../lib/dates'

export function useHabitActions() {
  const { space, userId } = useSpace()
  const key = keys.habits(space.id)
  const toggle = useAction(({ habit, day, done }) => setHabitDone(habit.id, userId, day, done), {
    invalidate: [key],
    optimistic: {
      key,
      update: (old, { habit, day, done }) =>
        old && {
          ...old,
          checks: done ? [...old.checks, { habit_id: habit.id, user_id: userId, done_on: day }] : old.checks.filter((c) => !(c.habit_id === habit.id && c.user_id === userId && c.done_on === day)),
        },
    },
  })
  const save = useAction(({ title, id }) => saveHabit(space.id, userId, title, id), { invalidate: [key], success: (_d, { id }) => (id ? 'Habit updated' : 'Habit added') })
  const remove = useAction((id) => deleteHabit(space.id, id), { invalidate: [key], success: 'Habit deleted' })
  return { toggle, save, remove }
}

/** Streak & monthly stats for the current user (V1 rules: streak counts back from today/yesterday). */
export function habitStats(habitId, checks, userId, today) {
  const mine = new Set(checks.filter((c) => c.habit_id === habitId && c.user_id === userId).map((c) => c.done_on))
  const doneToday = mine.has(today)
  let cursor = doneToday ? today : addDays(today, -1)
  let streak = 0
  while (streak < 90 && mine.has(cursor)) {
    streak++
    cursor = addDays(cursor, -1)
  }
  const monthStart = `${today.slice(0, 7)}-01`
  const daysSoFar = Number(today.slice(-2))
  const monthDone = [...mine].filter((d) => d >= monthStart && d <= today).length
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)).map((d) => ({ date: d, done: mine.has(d) }))
  return { doneToday, streak, monthDone, daysSoFar, rate: daysSoFar ? monthDone / daysSoFar : 0, last7, has: (d) => mine.has(d) }
}
