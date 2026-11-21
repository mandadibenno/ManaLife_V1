import { db } from '../lib/supabase'
import { unwrap, normalizeError } from '../lib/errors'

export async function updateDisplayName(userId, name) {
  const display_name = name.trim()
  if (!display_name || display_name.length > 70) throw new Error('Name must be 1 to 70 characters.')
  unwrap(await db().from('profiles').update({ display_name }).eq('id', userId))
  await updateMetadata({ display_name })
}

/** Store small, non-sensitive preferences in auth user metadata (syncs across devices). */
export async function updateMetadata(data) {
  const { error } = await db().auth.updateUser({ data })
  if (error) throw normalizeError(error)
}

export async function signIn(email, password) {
  const { error } = await db().auth.signInWithPassword({ email: email.trim(), password })
  if (error) throw normalizeError(error)
}

export async function signUp(email, password, displayName) {
  const { data, error } = await db().auth.signUp({ email: email.trim(), password, options: { data: { display_name: displayName.trim() } } })
  if (error) throw normalizeError(error)
  return data
}

export async function sendPasswordReset(email) {
  const redirectTo = `${window.location.origin}${window.location.pathname}`
  const { error } = await db().auth.resetPasswordForEmail(email.trim(), { redirectTo })
  if (error) throw normalizeError(error)
}

export async function setNewPassword(password) {
  const { error } = await db().auth.updateUser({ password })
  if (error) throw normalizeError(error)
}

export async function signOut() {
  await db().auth.signOut()
}
