export class AppError extends Error {
  constructor(message, code = 'unknown', cause) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.cause = cause
  }
}

/** Turn Supabase / PostgREST / network errors into friendly, typed AppErrors. */
export function normalizeError(err) {
  if (!err) return new AppError('Something went wrong.')
  if (err instanceof AppError) return err
  const code = err.code || ''
  const msg = String(err.message || err.error_description || err || '')

  if (code === 'PGRST202' || /could not find the function/i.test(msg)) {
    return new AppError('This feature needs a database update.', 'missing_function', err)
  }
  if (code === 'PGRST205' || code === '42P01' || /could not find the table|relation .* does not exist/i.test(msg)) {
    return new AppError('This feature needs a database update.', 'missing_table', err)
  }
  if (code === '42703' || /column .* does not exist/i.test(msg)) {
    return new AppError('This feature needs a database update.', 'missing_column', err)
  }
  if (code === '23505') return new AppError('That already exists.', 'duplicate', err)
  if (code === '42501' || /row-level security|permission denied/i.test(msg)) {
    return new AppError("You don't have permission to do that in this space.", 'forbidden', err)
  }
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(msg)) {
    return new AppError("Can't reach ManaLife right now. Check your connection and try again.", 'offline', err)
  }
  if (/jwt expired|invalid jwt/i.test(msg)) {
    return new AppError('Your session expired. Please sign in again.', 'auth', err)
  }
  return new AppError(msg || 'Something went wrong.', code || 'unknown', err)
}

export function unwrap(result) {
  if (result?.error) throw normalizeError(result.error)
  return result?.data
}

export const isMissingFeature = (err) =>
  ['missing_function', 'missing_table', 'missing_column'].includes(err?.code)
