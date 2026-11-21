import { describe, expect, it } from 'vitest'
import { createDemoClient } from '../lib/demo/demoClient'

describe('demo client (Supabase-compatible subset)', () => {
  it('filters, orders and limits like PostgREST', async () => {
    const db = createDemoClient()
    db.reset()
    const { data } = await db.from('tasks').select('*').eq('household_id', 'sp-home').order('title').limit(2)
    expect(data).toHaveLength(2)
    expect(data[0].title <= data[1].title).toBe(true)
    expect(data.every((t) => t.household_id === 'sp-home')).toBe(true)
  })

  it('enforces unique completions and supports upsert', async () => {
    const db = createDemoClient()
    db.reset()
    const row = { task_id: 'x', occurrence_on: '2026-11-21', completed_by: 'demo-me' }
    expect((await db.from('task_completions').insert(row)).error).toBeNull()
    expect((await db.from('task_completions').insert(row)).error.code).toBe('23505')
    await db.from('household_budgets').upsert({ household_id: 'sp-home', budget_month: '2026-11-01', monthly_limit: 1 }, { onConflict: 'household_id,budget_month' })
    await db.from('household_budgets').upsert({ household_id: 'sp-home', budget_month: '2026-11-01', monthly_limit: 2 }, { onConflict: 'household_id,budget_month' })
    const { data } = await db.from('household_budgets').select('*').eq('household_id', 'sp-home').eq('budget_month', '2026-11-01')
    expect(data).toHaveLength(1)
    expect(data[0].monthly_limit).toBe(2)
  })

  it('cascades deletes and keeps one personal space', async () => {
    const db = createDemoClient()
    db.reset()
    const a = await db.rpc('ensure_personal_space')
    const b = await db.rpc('ensure_personal_space')
    expect(a.data).toBe(b.data)
    const id = (await db.rpc('create_space', { p_name: 'Test', p_room_type: 'friends', p_enabled: ['tasks'], p_cards: ['tasks'] })).data
    await db.from('tasks').insert({ household_id: id, title: 'T', due_on: '2026-11-21', owner_id: 'demo-me' })
    expect((await db.rpc('delete_room_safely', { p_room: id, p_confirm_name: 'Test' })).error).toBeNull()
    expect((await db.from('tasks').select('*').eq('household_id', id)).data).toHaveLength(0)
  })

  it('reports unknown RPCs the way PostgREST does', async () => {
    const db = createDemoClient()
    const { error } = await db.rpc('does_not_exist')
    expect(error.code).toBe('PGRST202')
  })
})
