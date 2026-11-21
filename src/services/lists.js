// Groceries, bills and events — the remaining V1 "store.js" tables.
import { db } from '../lib/supabase'
import { unwrap } from '../lib/errors'

// ---- Groceries ----
export async function listGroceries(spaceId) {
  return unwrap(await db().from('groceries').select('*').eq('household_id', spaceId).order('created_at', { ascending: false })) || []
}

export async function addGrocery(spaceId, userId, { name, quantity = '' }) {
  return unwrap(await db().from('groceries').insert({ household_id: spaceId, added_by: userId, name: name.trim(), quantity: quantity.trim(), checked: false }).select().single())
}

export async function addGroceries(spaceId, userId, items) {
  if (!items.length) return []
  return unwrap(await db().from('groceries').insert(items.map((i) => ({ household_id: spaceId, added_by: userId, name: i.name.trim(), quantity: (i.quantity || '').trim(), checked: false }))).select())
}

export async function updateGrocery(spaceId, id, values) {
  const row = {}
  if ('name' in values) row.name = values.name.trim()
  if ('quantity' in values) row.quantity = (values.quantity || '').trim()
  if ('checked' in values) row.checked = Boolean(values.checked)
  return unwrap(await db().from('groceries').update(row).eq('id', id).eq('household_id', spaceId).select().single())
}

export async function deleteGroceries(spaceId, ids) {
  if (!ids.length) return
  unwrap(await db().from('groceries').delete().in('id', ids).eq('household_id', spaceId))
}

// ---- Bills ----
export async function listBills(spaceId) {
  const bills = unwrap(await db().from('bills').select('*').eq('household_id', spaceId).order('due_on')) || []
  const ids = bills.map((b) => b.id)
  const payments = ids.length ? unwrap(await db().from('bill_payments').select('*').in('bill_id', ids)) || [] : []
  return { bills, payments }
}

export async function saveBill(spaceId, userId, values, id) {
  const row = {
    title: values.title.trim(),
    amount: Number(values.amount) || 0,
    category: values.category,
    due_on: values.due_on,
    repeat: values.repeat,
  }
  if (id) return unwrap(await db().from('bills').update(row).eq('id', id).eq('household_id', spaceId).select().single())
  return unwrap(await db().from('bills').insert({ ...row, household_id: spaceId, owner_id: userId }).select().single())
}

export async function deleteBill(spaceId, id) {
  unwrap(await db().from('bills').delete().eq('id', id).eq('household_id', spaceId))
}

export async function setBillPaid(billId, occurrence, paid, userId) {
  if (paid) {
    const res = await db().from('bill_payments').insert({ bill_id: billId, occurrence_on: occurrence, completed_by: userId })
    if (res.error && res.error.code !== '23505') unwrap(res)
  } else {
    unwrap(await db().from('bill_payments').delete().eq('bill_id', billId).eq('occurrence_on', occurrence))
  }
}

// ---- Events ----
export async function listEvents(spaceId) {
  return unwrap(await db().from('events').select('*').eq('household_id', spaceId).order('event_date')) || []
}

export async function saveEvent(spaceId, userId, values, id) {
  const row = { title: values.title.trim(), event_date: values.event_date, time: values.time || null, category: values.category }
  if (id) return unwrap(await db().from('events').update(row).eq('id', id).eq('household_id', spaceId).select().single())
  return unwrap(await db().from('events').insert({ ...row, household_id: spaceId, owner_id: userId }).select().single())
}

export async function deleteEvent(spaceId, id) {
  unwrap(await db().from('events').delete().eq('id', id).eq('household_id', spaceId))
}
