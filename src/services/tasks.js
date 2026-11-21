import { db } from '../lib/supabase'
import { unwrap } from '../lib/errors'
import { addDays, isoDate } from '../lib/dates'

const CHUNK = 80

async function selectIn(tableName, column, ids, build = (q) => q) {
  const out = []
  for (let i = 0; i < ids.length; i += CHUNK) {
    const part = ids.slice(i, i + CHUNK)
    out.push(...(unwrap(await build(db().from(tableName).select('*').in(column, part))) || []))
  }
  return out
}

/**
 * Tasks of a space plus only the completions that matter:
 * every completion of one-off tasks (at most one each) and the last 120 days of recurring ones.
 * V1 downloaded every completion from every room on each poll.
 */
export async function listTasks(spaceId) {
  const tasks = unwrap(await db().from('tasks').select('*').eq('household_id', spaceId).order('due_on')) || []
  const oneOff = tasks.filter((t) => !t.repeat || t.repeat === 'none').map((t) => t.id)
  const recurring = tasks.filter((t) => t.repeat && t.repeat !== 'none').map((t) => t.id)
  const since = addDays(isoDate(), -120)
  const [a, b] = await Promise.all([
    selectIn('task_completions', 'task_id', oneOff),
    selectIn('task_completions', 'task_id', recurring, (q) => q.gte('occurrence_on', since)),
  ])
  return { tasks, completions: [...a, ...b] }
}

const TASK_FIELDS = ['title', 'description', 'category', 'priority', 'assigned_to', 'due_on', 'time', 'repeat']

export async function saveTask(spaceId, userId, values, id) {
  const row = Object.fromEntries(TASK_FIELDS.map((k) => [k, values[k]]))
  row.title = String(row.title || '').trim()
  row.description = String(row.description || '').trim()
  row.assigned_to = row.assigned_to || null
  row.time = row.time || null
  if (id) return unwrap(await db().from('tasks').update(row).eq('id', id).eq('household_id', spaceId).select().single())
  return unwrap(await db().from('tasks').insert({ ...row, household_id: spaceId, owner_id: userId }).select().single())
}

export async function deleteTask(spaceId, id) {
  unwrap(await db().from('tasks').delete().eq('id', id).eq('household_id', spaceId))
}

export async function setTaskDone(taskId, occurrence, done, userId) {
  if (done) {
    const res = await db().from('task_completions').insert({ task_id: taskId, occurrence_on: occurrence, completed_by: userId })
    if (res.error && res.error.code !== '23505') unwrap(res)
  } else {
    unwrap(await db().from('task_completions').delete().eq('task_id', taskId).eq('occurrence_on', occurrence))
  }
}
