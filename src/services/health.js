// Personal health data. Medicines and period entries are keyed by user_id (not by space),
// exactly as in V1, so they are private regardless of which space is active.
import { db } from '../lib/supabase'
import { unwrap } from '../lib/errors'
import { addDays, diffDays, isoDate } from '../lib/dates'

// ---- Medicines ----
export async function listMedicines(userId) {
  return unwrap(await db().from('medications').select('*').eq('user_id', userId).order('created_at', { ascending: false })) || []
}

export async function listDoseLogs(userId, fromDate, toDate = fromDate) {
  return unwrap(await db().from('medicine_logs').select('*').eq('user_id', userId).gte('dose_date', fromDate).lte('dose_date', toDate)) || []
}

export async function recentDoseLogs(userId, limit = 30) {
  return unwrap(await db().from('medicine_logs').select('*').eq('user_id', userId).order('dose_date', { ascending: false }).order('marked_at', { ascending: false }).limit(limit)) || []
}

export async function saveMedicine(userId, form, id) {
  const row = {
    name: form.name.trim(),
    dose_label: (form.dose_label || '').trim(),
    schedule_times: [...form.schedule_times].map((t) => t.trim()).sort(),
    start_date: form.start_date,
    end_date: form.end_date || null,
    refill_on: form.refill_on || null,
    instructions: (form.instructions || '').trim(),
    is_active: Boolean(form.is_active),
  }
  if (id) return unwrap(await db().from('medications').update(row).eq('id', id).eq('user_id', userId).select().single())
  return unwrap(await db().from('medications').insert({ ...row, user_id: userId }).select().single())
}

export async function deleteMedicine(userId, id) {
  unwrap(await db().from('medications').delete().eq('id', id).eq('user_id', userId))
}

export async function setDose(userId, medicineId, date, time, status) {
  if (status) {
    unwrap(
      await db().from('medicine_logs').upsert(
        { medication_id: medicineId, user_id: userId, dose_date: date, dose_time: time, status, marked_at: new Date().toISOString() },
        { onConflict: 'medication_id,dose_date,dose_time' },
      ),
    )
  } else {
    unwrap(await db().from('medicine_logs').delete().eq('medication_id', medicineId).eq('user_id', userId).eq('dose_date', date).eq('dose_time', time))
  }
}

export function dosesFor(medicines, date) {
  return medicines
    .filter((m) => m.is_active && m.start_date <= date && (!m.end_date || m.end_date >= date))
    .flatMap((m) => (m.schedule_times || []).map((t) => ({ medicine: m, time: String(t).slice(0, 5) })))
    .sort((a, b) => a.time.localeCompare(b.time))
}

// ---- Cycle (period) tracking ----
export async function listPeriods(userId, limit = 48) {
  return unwrap(await db().from('period_entries').select('*').eq('user_id', userId).order('start_date', { ascending: false }).limit(limit)) || []
}

export async function savePeriod(userId, form, id) {
  const row = {
    start_date: form.start_date,
    end_date: form.end_date || null,
    flow: form.flow || null,
    symptoms: form.symptoms || [],
    notes: (form.notes || '').trim(),
  }
  if (id) return unwrap(await db().from('period_entries').update(row).eq('id', id).eq('user_id', userId).select().single())
  return unwrap(await db().from('period_entries').insert({ ...row, user_id: userId }).select().single())
}

export async function deletePeriod(userId, id) {
  unwrap(await db().from('period_entries').delete().eq('id', id).eq('user_id', userId))
}

/** Cycle statistics (V1 rules: cycles between 15 and 90 days count). */
export function cycleStats(entries, today = isoDate()) {
  const ordered = [...entries].sort((a, b) => a.start_date.localeCompare(b.start_date))
  const cycles = ordered.slice(1).map((e, i) => ({ date: e.start_date, days: diffDays(ordered[i].start_date, e.start_date) }))
  const valid = cycles.filter((c) => c.days >= 15 && c.days <= 90)
  const averageCycle = valid.length ? Math.round(valid.reduce((s, c) => s + c.days, 0) / valid.length) : null
  const durations = entries.filter((e) => e.end_date).map((e) => diffDays(e.start_date, e.end_date) + 1)
  const averageDuration = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null
  const latest = ordered[ordered.length - 1]
  const nextExpected = averageCycle && latest ? addDays(latest.start_date, averageCycle) : null
  const cycleDay = latest ? diffDays(latest.start_date, today) + 1 : null
  return { cycles: valid, averageCycle, averageDuration, latest, nextExpected, cycleDay, daysUntil: nextExpected ? diffDays(today, nextExpected) : null }
}

// ---- Sharing (read-only, revocable, per space) ----
export async function listMyShares(spaceId, userId) {
  return unwrap(await db().from('period_shares').select('id,viewer_id,created_at').eq('room_id', spaceId).eq('owner_id', userId).order('created_at', { ascending: false })) || []
}

export async function grantShare(spaceId, ownerId, viewerId) {
  unwrap(await db().from('period_shares').insert({ room_id: spaceId, owner_id: ownerId, viewer_id: viewerId }))
}

export async function revokeShare(spaceId, ownerId, shareId) {
  unwrap(await db().from('period_shares').delete().eq('id', shareId).eq('room_id', spaceId).eq('owner_id', ownerId))
}

/** Owners who granted the current user read access in this space. */
export async function sharedWithMe(spaceId, userId) {
  const rows = unwrap(await db().from('period_shares').select('owner_id').eq('room_id', spaceId).eq('viewer_id', userId)) || []
  return [...new Set(rows.map((r) => r.owner_id))]
}

export async function listSharedPeriods(ownerId) {
  return unwrap(await db().from('period_entries').select('start_date,end_date,flow,symptoms,notes').eq('user_id', ownerId).order('start_date', { ascending: false }).limit(24)) || []
}
