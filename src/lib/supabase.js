import { createClient } from '@supabase/supabase-js'
import { AppError } from './errors'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/** True when the build has public Supabase settings. Never put secret keys in VITE_ variables. */
export const configured = Boolean(url && key)

/** Demo mode is a local sample-data sandbox, only offered when Supabase is not configured. */
export const demoAllowed = !configured && (import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO === 'true')

const realClient = configured
  ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null

let active = realClient
let demo = false

/** The active database client (real Supabase or the local demo implementation). */
export function db() {
  if (!active) throw new AppError('ManaLife is not connected to a database yet.', 'not_configured')
  return active
}

export const isDemo = () => demo

export async function startDemo() {
  const { createDemoClient } = await import('./demo/demoClient')
  active = createDemoClient()
  demo = true
  return active
}

export function stopDemo() {
  active = realClient
  demo = false
}
