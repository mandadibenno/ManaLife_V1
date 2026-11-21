import { describe, expect, it } from 'vitest'
import { billStates } from '../features/bills/billActions'
import { habitStats } from '../features/habits/habitActions'
import { cycleStats, dosesFor } from '../services/health'
import { nutrition } from '../services/routines'
import { extractToken } from '../features/spaces/JoinSpace'
import { normalizeError } from '../lib/errors'
import { toSpace } from '../config/spaceTypes'
import { enabledModules } from '../hooks/workspace'

describe('bills', () => {
  const today = '2026-11-21'
  const monthly = { id: 'b1', title: 'Rent', amount: 1000, due_on: '2026-06-03', repeat: 'monthly' }
  const future = { id: 'b2', title: 'Net', amount: 500, due_on: '2026-06-25', repeat: 'monthly' }
  it('flags this month’s unpaid cycle as overdue', () => {
    const [s] = billStates({ bills: [monthly], payments: [] }, today)
    expect(s).toMatchObject({ occurrence: '2026-11-03', paid: false, overdue: true })
  })
  it('moves to next month once this cycle is paid', () => {
    const [s] = billStates({ bills: [monthly], payments: [{ bill_id: 'b1', occurrence_on: '2026-11-03' }] }, today)
    expect(s).toMatchObject({ occurrence: '2026-12-03', paid: false, overdue: false, lastPaid: '2026-11-03' })
  })
  it('upcoming bills are not overdue', () => {
    const [s] = billStates({ bills: [future], payments: [] }, today)
    expect(s).toMatchObject({ occurrence: '2026-11-25', overdue: false })
  })
})

describe('habits', () => {
  it('counts a streak back from today (or yesterday if not yet done)', () => {
    const checks = ['2026-11-18', '2026-11-19', '2026-11-20'].map((d) => ({ habit_id: 'h', user_id: 'u', done_on: d }))
    expect(habitStats('h', checks, 'u', '2026-11-21')).toMatchObject({ doneToday: false, streak: 3 })
    expect(habitStats('h', [...checks, { habit_id: 'h', user_id: 'u', done_on: '2026-11-21' }], 'u', '2026-11-21').streak).toBe(4)
    expect(habitStats('h', checks, 'someone-else', '2026-11-21').streak).toBe(0)
  })
})

describe('cycle', () => {
  it('averages valid cycles and predicts the next start', () => {
    const entries = [
      { start_date: '2026-08-01', end_date: '2026-08-05' },
      { start_date: '2026-08-29', end_date: '2026-09-02' },
      { start_date: '2026-09-26', end_date: '2026-09-30' },
    ]
    const s = cycleStats(entries, '2026-10-10')
    expect(s.averageCycle).toBe(28)
    expect(s.averageDuration).toBe(5)
    expect(s.nextExpected).toBe('2026-10-24')
    expect(s.cycleDay).toBe(15)
    expect(s.daysUntil).toBe(14)
  })
  it('ignores implausible gaps (V1 rule: 15–90 days)', () => {
    const s = cycleStats([{ start_date: '2026-01-01' }, { start_date: '2026-01-05' }], '2026-02-01')
    expect(s.averageCycle).toBeNull()
  })
})

describe('medicines', () => {
  it('schedules active doses within their date range, sorted by time', () => {
    const meds = [
      { id: 'a', is_active: true, start_date: '2026-11-01', end_date: null, schedule_times: ['20:00:00', '08:00'] },
      { id: 'b', is_active: false, start_date: '2026-11-01', end_date: null, schedule_times: ['09:00'] },
      { id: 'c', is_active: true, start_date: '2026-11-25', end_date: null, schedule_times: ['07:00'] },
    ]
    expect(dosesFor(meds, '2026-11-21').map((d) => `${d.medicine.id}@${d.time}`)).toEqual(['a@08:00', 'a@20:00'])
  })
})

describe('meals', () => {
  it('computes nutrition from per-100g values', () => {
    expect(nutrition([{ grams: 200, kcal: 130, protein: 2.7, carbs: 28.2, fat: 0.3 }])).toEqual({ kcal: 260, protein: 5.4, carbs: 56.4, fat: 0.6 })
  })
})

describe('invites', () => {
  it('accepts a full link, a fragment or a bare code', () => {
    expect(extractToken('https://app.pramodbenno.in/#join=abc%2D123')).toBe('abc-123')
    expect(extractToken('#join=tok')).toBe('tok')
    expect(extractToken('  ML-AB12-CD34 ')).toBe('ML-AB12-CD34')
  })
})

describe('errors', () => {
  it('maps database errors to friendly codes', () => {
    expect(normalizeError({ code: 'PGRST202', message: 'Could not find the function public.create_space' }).code).toBe('missing_function')
    expect(normalizeError({ code: '42P01', message: 'relation "space_documents" does not exist' }).code).toBe('missing_table')
    expect(normalizeError({ code: '42501', message: 'new row violates row-level security policy' }).code).toBe('forbidden')
    expect(normalizeError(new TypeError('Failed to fetch')).code).toBe('offline')
  })
})

describe('spaces', () => {
  it('treats legacy rooms without a type as family and fills default features', () => {
    const s = toSpace({ id: 'r', name: 'Our Home', created_by: 'u', room_type: null, enabled_modules: null, overview_modules: null }, 'owner')
    expect(s.type).toBe('family')
    expect(s.isOwner).toBe(true)
    expect(enabledModules(s)).toContain('groceries')
  })
  it('never exposes personal-only modules in shared spaces', () => {
    const s = toSpace({ id: 'r', name: 'X', room_type: 'friends', enabled_modules: ['tasks', 'medicines', 'periods'] }, 'member')
    expect(enabledModules(s)).toEqual(['tasks'])
  })
})
