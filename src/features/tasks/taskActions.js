import { useSpace } from '../../app/SpaceContext'
import { keys, useAction } from '../../hooks/data'
import { deleteTask, saveTask, setTaskDone } from '../../services/tasks'
import { doneKey } from '../../lib/recurrence'

export const TASK_CATEGORIES = ['Home', 'Personal', 'Work', 'Health', 'Wellness', 'Family', 'Planning', 'Other']
export const REPEAT_LABEL = { none: 'Once', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' }

/** Toggle / save / delete with optimistic updates so checkboxes feel instant. */
export function useTaskActions() {
  const { space, userId } = useSpace()
  const key = keys.tasks(space.id)

  const toggle = useAction(({ task, occurrence, done }) => setTaskDone(task.id, occurrence, done, userId), {
    invalidate: [key],
    optimistic: {
      key,
      update: (old, { task, occurrence, done }) =>
        old && {
          ...old,
          completions: done
            ? [...old.completions, { task_id: task.id, occurrence_on: occurrence, completed_by: userId }]
            : old.completions.filter((c) => !(c.task_id === task.id && c.occurrence_on === occurrence)),
        },
    },
  })

  const save = useAction(({ values, id }) => saveTask(space.id, userId, values, id), {
    invalidate: [key],
    success: (_d, { id }) => (id ? 'Task updated' : 'Task added'),
  })

  const remove = useAction((id) => deleteTask(space.id, id), {
    invalidate: [key],
    success: 'Task deleted',
    optimistic: { key, update: (old, id) => old && { ...old, tasks: old.tasks.filter((t) => t.id !== id) } },
  })

  return { toggle, save, remove }
}

export function completionSet(data) {
  return new Set((data?.completions || []).map((c) => doneKey(c.task_id, c.occurrence_on)))
}

export function completedBy(data, taskId, occurrence) {
  return data?.completions?.find((c) => c.task_id === taskId && c.occurrence_on === occurrence)?.completed_by
}
