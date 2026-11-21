import { db } from '../lib/supabase'
import { normalizeError, unwrap, isMissingFeature } from '../lib/errors'
import { toSpace } from '../config/spaceTypes'

/** All spaces the user belongs to (personal + shared), with their role. */
export async function listSpaces(userId) {
  const memberships = unwrap(await db().from('household_members').select('household_id,role').eq('user_id', userId)) || []
  if (!memberships.length) return []
  const ids = [...new Set(memberships.map((m) => m.household_id))]
  // select('*') so the app keeps working before migration 001 adds icon/accent.
  const rows = unwrap(await db().from('households').select('*').in('id', ids)) || []
  const roleOf = new Map(memberships.map((m) => [m.household_id, m.role]))
  return rows.map((r) => toSpace(r, roleOf.get(r.id)))
}

/** Members of one space with display names. RLS only returns members of spaces you belong to. */
export async function listMembers(spaceId) {
  const rows = unwrap(await db().from('household_members').select('*').eq('household_id', spaceId)) || []
  const ids = rows.map((m) => m.user_id)
  const profiles = ids.length ? unwrap(await db().from('profiles').select('id,display_name').in('id', ids)) || [] : []
  const names = new Map(profiles.map((p) => [p.id, p.display_name]))
  return rows
    .map((m) => ({ id: m.user_id, role: m.role, joinedAt: m.joined_at, display_name: names.get(m.user_id) || 'Member' }))
    .sort((a, b) => (a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : a.display_name.localeCompare(b.display_name)))
}

/**
 * Returns the id of the user's personal space, creating it if needed.
 * Returns null when migration 001 has not been applied (feature unavailable).
 */
export async function ensurePersonalSpace() {
  const res = await db().rpc('ensure_personal_space')
  if (res.error) {
    const err = normalizeError(res.error)
    if (isMissingFeature(err)) return null
    throw err
  }
  return res.data
}

export async function createSpace({ name, type, enabled, cards, icon, accent }, { v2 = true } = {}) {
  if (v2) {
    const res = await db().rpc('create_space', { p_name: name.trim(), p_room_type: type, p_enabled: enabled, p_cards: cards, p_icon: icon || null, p_accent: accent || null })
    if (!res.error) return res.data
    const err = normalizeError(res.error)
    if (!isMissingFeature(err)) throw err
  }
  // V1 fallback (no couple type, icon or accent before migration 001).
  return unwrap(await db().rpc('create_room', { p_name: name.trim(), p_room_type: type === 'couple' ? 'family' : type, p_enabled: enabled, p_cards: cards }))
}

export async function updateSpace(space, { name, type, enabled, cards, icon, accent }, { v2 = true } = {}) {
  if (v2) {
    const res = await db().rpc('update_space', { p_room: space.id, p_name: name.trim(), p_room_type: type, p_enabled: enabled, p_cards: cards, p_icon: icon || null, p_accent: accent || null })
    if (!res.error) return
    const err = normalizeError(res.error)
    if (!isMissingFeature(err)) throw err
  }
  unwrap(await db().rpc('update_room_configuration', { p_room: space.id, p_name: name.trim(), p_room_type: type, p_enabled: enabled, p_cards: cards.filter((c) => enabled.includes(c)) }))
}

export async function leaveSpace(spaceId) {
  unwrap(await db().rpc('leave_room', { p_room: spaceId }))
}

export async function transferOwnership(spaceId, newOwnerId) {
  unwrap(await db().rpc('transfer_room_ownership', { p_room: spaceId, p_new_owner: newOwnerId }))
}

export async function removeMember(spaceId, userId) {
  unwrap(await db().rpc('remove_space_member', { p_room: spaceId, p_user: userId }))
}

export async function deleteSpace(space) {
  unwrap(await db().rpc('delete_room_safely', { p_room: space.id, p_confirm_name: space.name }))
}

// ---- Meet-style invitations (link / code + host approval) — unchanged backend ----

export async function getInvite(spaceId) {
  const data = unwrap(await db().rpc('get_room_join_invite', { p_room: spaceId }))
  if (!data?.token || !data?.code) throw new Error('No invite was returned. Please try again.')
  return data
}

export async function listPendingJoins(spaceId) {
  const data = unwrap(await db().rpc('list_pending_room_joins', { p_room: spaceId }))
  return Array.isArray(data) ? data : []
}

export async function decideJoin(requestId, approve) {
  unwrap(await db().rpc('decide_room_join', { p_request: requestId, p_approve: approve }))
}

export async function requestJoin(code) {
  return unwrap(await db().rpc('request_room_join', { p_code: code.trim() }))
}

export async function joinStatus(code) {
  return unwrap(await db().rpc('my_room_join_status', { p_code: code.trim() }))
}

export async function cancelJoin(code) {
  unwrap(await db().rpc('cancel_room_join', { p_code: code.trim() }))
}
