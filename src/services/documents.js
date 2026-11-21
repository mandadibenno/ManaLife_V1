// Documents vault (migration 002). Files live in the private 'space-documents' bucket under
// <space_id>/..., and both the table and the bucket are protected by membership RLS.
import { db } from '../lib/supabase'
import { unwrap, normalizeError, isMissingFeature } from '../lib/errors'
import { uid } from '../lib/format'

const BUCKET = 'space-documents'
export const MAX_BYTES = 20 * 1024 * 1024
export const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.heic,.txt,.doc,.docx,.xls,.xlsx'
export const DOC_CATEGORIES = ['ID', 'Insurance', 'Medical', 'Finance', 'Property', 'Vehicle', 'Education', 'Work', 'Other']

export async function listDocuments(spaceId) {
  return unwrap(await db().from('space_documents').select('*').eq('household_id', spaceId).order('created_at', { ascending: false })) || []
}

/** Is the documents feature installed? (table exists) */
export async function documentsAvailable(spaceId) {
  const res = await db().from('space_documents').select('id').eq('household_id', spaceId).limit(1)
  if (!res.error) return true
  const err = normalizeError(res.error)
  if (isMissingFeature(err)) return false
  throw err
}

export async function uploadDocument(spaceId, userId, file, meta) {
  if (file.size > MAX_BYTES) throw new Error('Files can be up to 20 MB.')
  const safeName = file.name.replace(/[^\w.-]+/g, '_').slice(-120)
  const path = `${spaceId}/${uid()}-${safeName}`
  const up = await db().storage.from(BUCKET).upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false })
  if (up.error) throw normalizeError(up.error)
  const res = await db().from('space_documents').insert({
    household_id: spaceId,
    uploaded_by: userId,
    title: meta.title.trim(),
    category: meta.category,
    notes: (meta.notes || '').trim(),
    expires_on: meta.expires_on || null,
    storage_path: path,
    file_name: file.name.slice(0, 255),
    mime_type: file.type || 'application/octet-stream',
    size_bytes: file.size,
  }).select().single()
  if (res.error) {
    await db().storage.from(BUCKET).remove([path]) // don't leave an orphaned file
    throw normalizeError(res.error)
  }
  return res.data
}

export async function updateDocument(spaceId, id, meta) {
  return unwrap(
    await db().from('space_documents').update({ title: meta.title.trim(), category: meta.category, notes: (meta.notes || '').trim(), expires_on: meta.expires_on || null }).eq('id', id).eq('household_id', spaceId).select().single(),
  )
}

export async function documentUrl(path) {
  const res = await db().storage.from(BUCKET).createSignedUrl(path, 60)
  if (res.error) throw normalizeError(res.error)
  return res.data.signedUrl
}

export async function deleteDocument(spaceId, doc) {
  const rm = await db().storage.from(BUCKET).remove([doc.storage_path])
  if (rm.error) throw normalizeError(rm.error)
  unwrap(await db().from('space_documents').delete().eq('id', doc.id).eq('household_id', spaceId))
}

/** Remove every stored file of a space (used before deleting the space). Safe if feature absent. */
export async function purgeSpaceDocuments(spaceId) {
  const res = await db().from('space_documents').select('storage_path').eq('household_id', spaceId)
  if (res.error) {
    if (isMissingFeature(normalizeError(res.error))) return
    throw normalizeError(res.error)
  }
  const paths = (res.data || []).map((d) => d.storage_path)
  for (let i = 0; i < paths.length; i += 100) {
    const rm = await db().storage.from(BUCKET).remove(paths.slice(i, i + 100))
    if (rm.error) throw normalizeError(rm.error)
  }
}
