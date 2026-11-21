import { db } from '../lib/supabase'
import { unwrap } from '../lib/errors'
import { monthRange } from '../lib/dates'

export const EXPENSE_CATEGORIES = ['Groceries', 'Food', 'Shopping', 'Transport', 'Health', 'Bills', 'Entertainment', 'Other']

export async function listExpenses(spaceId, month) {
  const { start, end } = monthRange(month)
  return (
    unwrap(
      await db().from('expenses').select('*').eq('household_id', spaceId).gte('spent_on', start).lt('spent_on', end).order('spent_on', { ascending: false }),
    ) || []
  )
}

export async function getBudget(spaceId, month) {
  const row = unwrap(await db().from('household_budgets').select('monthly_limit').eq('household_id', spaceId).eq('budget_month', `${month}-01`).maybeSingle())
  return row?.monthly_limit == null ? null : Number(row.monthly_limit)
}

export async function setBudget(spaceId, userId, month, limit) {
  unwrap(
    await db().from('household_budgets').upsert(
      { household_id: spaceId, budget_month: `${month}-01`, monthly_limit: Number(limit), updated_by: userId },
      { onConflict: 'household_id,budget_month' },
    ),
  )
}

export async function saveExpense(spaceId, userId, values, id) {
  const row = {
    amount: Number(values.amount),
    category: values.category,
    expense_type: values.expense_type || 'essential',
    spent_on: values.spent_on,
    note: (values.note || '').trim(),
  }
  if (id) return unwrap(await db().from('expenses').update(row).eq('id', id).eq('household_id', spaceId).select().single())
  return unwrap(await db().from('expenses').insert({ ...row, household_id: spaceId, created_by: userId }).select().single())
}

export async function deleteExpense(spaceId, id) {
  unwrap(await db().from('expenses').delete().eq('id', id).eq('household_id', spaceId))
}
