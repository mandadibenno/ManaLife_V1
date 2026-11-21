// A small local stand-in for the Supabase JS client, used only by the demo.
// It implements the subset of the query builder, RPCs, auth and storage that ManaLife's
// services use, so the demo runs exactly the same application code as production.
// Data is kept in localStorage on this device only. It is NOT a security boundary.

import { readLocal, writeLocal } from '../storage'
import { uid } from '../format'
import { seed, DEMO_USER_ID } from './seed'

const STORE_KEY = 'manalife-demo-v2'
const META_KEY = 'manalife-demo-user-v2'

const UNIQUE = {
  task_completions: ['task_id', 'occurrence_on'],
  bill_payments: ['bill_id', 'occurrence_on'],
  household_budgets: ['household_id', 'budget_month'],
  medicine_logs: ['medication_id', 'dose_date', 'dose_time'],
  habit_checks: ['habit_id', 'user_id', 'done_on'],
}

const DEFAULTS = {
  tasks: { description: '', category: 'Home', priority: 'medium', assigned_to: null, time: null, repeat: 'none' },
  groceries: { quantity: '', checked: false },
  bills: { category: 'Other', repeat: 'monthly', amount: 0 },
  events: { time: null, category: 'Family' },
  space_documents: { category: 'Other', notes: '', expires_on: null },
}

const fail = (message, code = 'P0001') => ({ data: null, error: { message, code } })
const ok = (data) => ({ data, error: null })

export function createDemoClient() {
  let store = readLocal(STORE_KEY) || seed()
  const files = new Map()
  const listeners = new Set()
  const user = {
    id: DEMO_USER_ID,
    email: 'alex@example.com',
    user_metadata: { display_name: 'Alex Rao', gender: 'female', ...(readLocal(META_KEY) || {}) },
  }
  const session = { user, access_token: 'demo', expires_at: Date.now() / 1000 + 86400 }

  const persist = () => writeLocal(STORE_KEY, store)
  const table = (name) => (store[name] ||= [])
  const me = () => user.id
  const membersOf = (room) => table('household_members').filter((m) => m.household_id === room)
  const isOwner = (room) => membersOf(room).some((m) => m.user_id === me() && m.role === 'owner')
  const isMember = (room) => membersOf(room).some((m) => m.user_id === me())
  const room = (rid) => table('households').find((h) => h.id === rid)

  class Query {
    constructor(name) {
      this.name = name
      this.op = 'select'
      this.filters = []
      this.orders = []
      this.max = null
      this.mode = 'many'
      this.payload = null
      this.opts = {}
    }
    select() { return this }
    insert(rows) { this.op = 'insert'; this.payload = rows; return this }
    update(values) { this.op = 'update'; this.payload = values; return this }
    upsert(rows, opts = {}) { this.op = 'upsert'; this.payload = rows; this.opts = opts; return this }
    delete() { this.op = 'delete'; return this }
    eq(c, v) { this.filters.push((r) => r[c] === v); return this }
    neq(c, v) { this.filters.push((r) => r[c] !== v); return this }
    in(c, vs) { const s = new Set(vs); this.filters.push((r) => s.has(r[c])); return this }
    gte(c, v) { this.filters.push((r) => r[c] != null && r[c] >= v); return this }
    gt(c, v) { this.filters.push((r) => r[c] != null && r[c] > v); return this }
    lte(c, v) { this.filters.push((r) => r[c] != null && r[c] <= v); return this }
    lt(c, v) { this.filters.push((r) => r[c] != null && r[c] < v); return this }
    is(c, v) { this.filters.push((r) => (r[c] ?? null) === v); return this }
    ilike(c, pattern) {
      const re = new RegExp(`^${String(pattern).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*')}$`, 'i')
      this.filters.push((r) => re.test(String(r[c] ?? '')))
      return this
    }
    order(c, { ascending = true } = {}) { this.orders.push([c, ascending]); return this }
    limit(n) { this.max = n; return this }
    single() { this.mode = 'single'; return this }
    maybeSingle() { this.mode = 'maybe'; return this }
    then(resolve, reject) {
      return new Promise((r) => setTimeout(r, 60 + Math.random() * 90))
        .then(() => this.run())
        .then(resolve, reject)
    }
    match(r) { return this.filters.every((f) => f(r)) }
    shape(rows) {
      let out = rows.map((r) => ({ ...r }))
      for (const [c, asc] of [...this.orders].reverse()) {
        out.sort((a, b) => {
          const x = a[c] ?? ''
          const y = b[c] ?? ''
          return (x > y ? 1 : x < y ? -1 : 0) * (asc ? 1 : -1)
        })
      }
      if (this.max != null) out = out.slice(0, this.max)
      if (this.mode === 'single') return out.length === 1 ? ok(out[0]) : fail('JSON object requested, multiple (or no) rows returned', 'PGRST116')
      if (this.mode === 'maybe') return ok(out[0] ?? null)
      return ok(out)
    }
    conflict(row) {
      const keys = this.opts.onConflict ? this.opts.onConflict.split(',').map((s) => s.trim()) : UNIQUE[this.name]
      if (!keys) return null
      return table(this.name).find((r) => keys.every((k) => r[k] === row[k])) || null
    }
    run() {
      const rows = table(this.name)
      if (this.op === 'select') return this.shape(rows.filter((r) => this.match(r)))
      if (this.op === 'insert' || this.op === 'upsert') {
        const list = Array.isArray(this.payload) ? this.payload : [this.payload]
        const out = []
        for (const input of list) {
          const existing = this.conflict(input)
          if (existing) {
            if (this.op === 'insert') return fail('duplicate key value violates unique constraint', '23505')
            Object.assign(existing, input)
            out.push(existing)
            continue
          }
          const row = { id: uid(), created_at: new Date().toISOString(), ...(DEFAULTS[this.name] || {}), ...input }
          rows.push(row)
          out.push(row)
        }
        persist()
        return this.shape(out)
      }
      if (this.op === 'update') {
        const hit = rows.filter((r) => this.match(r))
        hit.forEach((r) => Object.assign(r, this.payload))
        persist()
        return this.shape(hit)
      }
      if (this.op === 'delete') {
        const hit = rows.filter((r) => this.match(r))
        store[this.name] = rows.filter((r) => !this.match(r))
        cascade(this.name, hit)
        persist()
        return this.shape(hit)
      }
      return fail('Unsupported operation')
    }
  }

  function cascade(name, removed) {
    const ids = new Set(removed.map((r) => r.id))
    const drop = (t, key) => { store[t] = table(t).filter((r) => !ids.has(r[key])) }
    if (name === 'tasks') drop('task_completions', 'task_id')
    if (name === 'bills') drop('bill_payments', 'bill_id')
    if (name === 'habits') drop('habit_checks', 'habit_id')
    if (name === 'medications') drop('medicine_logs', 'medication_id')
    if (name === 'households') {
      for (const t of ['household_members', 'tasks', 'groceries', 'bills', 'events', 'expenses', 'household_budgets', 'habits', 'meal_plans', 'space_documents']) {
        store[t] = table(t).filter((r) => !ids.has(r.household_id))
      }
      store.period_shares = table('period_shares').filter((r) => !ids.has(r.room_id))
    }
  }

  function addSpace({ name, type, enabled, cards, icon = null, accent = null }) {
    const row = { id: `sp-${uid().slice(0, 8)}`, name: name.trim(), room_type: type, created_by: me(), icon, accent, enabled_modules: enabled, overview_modules: (cards || []).filter((c) => enabled.includes(c)), created_at: new Date().toISOString() }
    table('households').push(row)
    table('household_members').push({ household_id: row.id, user_id: me(), role: 'owner', joined_at: row.created_at })
    persist()
    return row.id
  }

  const rpcs = {
    ensure_personal_space() {
      const found = table('households').find((h) => h.created_by === me() && h.room_type === 'personal')
      if (found) return ok(found.id)
      return ok(addSpace({ name: 'My Space', type: 'personal', enabled: ['tasks', 'expenses', 'bills', 'calendar', 'habits', 'groceries', 'meals', 'medicines', 'periods', 'reminders', 'documents'], cards: ['tasks', 'calendar', 'expenses', 'habits', 'medicines', 'reminders'] }))
    },
    create_space(a) {
      if (!['couple', 'family', 'friends', 'office', 'custom'].includes(a.p_room_type)) return fail('Choose a valid space type')
      if (!a.p_name?.trim()) return fail('Space name must be 1 to 100 characters')
      if (!a.p_enabled?.length) return fail('Select at least one feature')
      return ok(addSpace({ name: a.p_name, type: a.p_room_type, enabled: a.p_enabled, cards: a.p_cards, icon: a.p_icon, accent: a.p_accent }))
    },
    create_room(a) { return rpcs.create_space(a) },
    update_space(a) {
      if (!isOwner(a.p_room)) return fail('Only the owner of this space can change its settings')
      const r = room(a.p_room)
      if ((r.room_type === 'personal') !== (a.p_room_type === 'personal')) return fail('A personal space stays personal')
      Object.assign(r, { name: a.p_name.trim(), room_type: a.p_room_type, enabled_modules: a.p_enabled, overview_modules: (a.p_cards || []).filter((c) => a.p_enabled.includes(c)), icon: a.p_icon ?? r.icon, accent: a.p_accent ?? r.accent })
      persist()
      return ok(null)
    },
    update_room_configuration(a) { return rpcs.update_space(a) },
    leave_room({ p_room }) {
      if (isOwner(p_room)) return fail('Transfer ownership before leaving')
      store.household_members = table('household_members').filter((m) => !(m.household_id === p_room && m.user_id === me()))
      store.period_shares = table('period_shares').filter((s) => !(s.room_id === p_room && (s.viewer_id === me() || s.owner_id === me())))
      persist()
      return ok(null)
    },
    remove_space_member({ p_room, p_user }) {
      if (!isOwner(p_room)) return fail('Only the owner of this space can remove members')
      store.household_members = table('household_members').filter((m) => !(m.household_id === p_room && m.user_id === p_user))
      store.period_shares = table('period_shares').filter((s) => !(s.room_id === p_room && (s.viewer_id === p_user || s.owner_id === p_user)))
      table('tasks').forEach((t) => { if (t.household_id === p_room && t.assigned_to === p_user) t.assigned_to = null })
      persist()
      return ok(null)
    },
    transfer_room_ownership({ p_room, p_new_owner }) {
      if (!isOwner(p_room)) return fail('Only the owner can transfer ownership')
      membersOf(p_room).forEach((m) => { m.role = m.user_id === p_new_owner ? 'owner' : m.user_id === me() ? 'member' : m.role })
      persist()
      return ok(null)
    },
    delete_room_safely({ p_room, p_confirm_name }) {
      const r = room(p_room)
      if (!r || !isOwner(p_room)) return fail('Only the owner can delete this space')
      if (r.name !== p_confirm_name) return fail('Name does not match')
      store.households = table('households').filter((h) => h.id !== p_room)
      cascade('households', [r])
      persist()
      return ok(null)
    },
    get_room_join_invite({ p_room }) {
      if (!isOwner(p_room)) return fail('Only the owner can invite')
      let inv = table('_invites').find((i) => i.room_id === p_room)
      if (!inv) {
        inv = { room_id: p_room, token: `demo-${uid().slice(0, 12)}`, code: `ML-${uid().slice(0, 4).toUpperCase()}-${uid().slice(0, 4).toUpperCase()}` }
        table('_invites').push(inv)
        persist()
      }
      return ok({ ...inv })
    },
    list_pending_room_joins({ p_room }) {
      return ok(table('_join_requests').filter((r) => r.room_id === p_room && r.status === 'pending').map(({ id, name, email }) => ({ id, name, email })))
    },
    decide_room_join({ p_request, p_approve }) {
      const req = table('_join_requests').find((r) => r.id === p_request)
      if (!req) return fail('Request not found')
      req.status = p_approve ? 'approved' : 'rejected'
      if (p_approve) {
        if (!table('profiles').some((p) => p.id === req.user_id)) table('profiles').push({ id: req.user_id, display_name: req.name })
        table('household_members').push({ household_id: req.room_id, user_id: req.user_id, role: 'member', joined_at: new Date().toISOString() })
      }
      persist()
      return ok(null)
    },
    request_room_join({ p_code }) {
      const inv = table('_invites').find((i) => i.code === p_code || i.token === p_code)
      if (!inv) return fail('Invalid or expired invitation')
      const r = room(inv.room_id)
      if (isMember(inv.room_id)) return ok({ status: 'approved', room_id: inv.room_id, room_name: r?.name })
      return ok({ status: 'pending', room_name: r?.name })
    },
    my_room_join_status({ p_code }) {
      const inv = table('_invites').find((i) => i.code === p_code || i.token === p_code)
      if (!inv) return ok({ status: 'none' })
      return ok({ status: isMember(inv.room_id) ? 'approved' : 'pending', room_id: inv.room_id, room_name: room(inv.room_id)?.name })
    },
    cancel_room_join() { return ok(null) },
  }

  const emit = (event) => listeners.forEach((cb) => cb(event, event === 'SIGNED_OUT' ? null : { ...session, user: { ...user } }))

  return {
    __demo: true,
    from: (name) => new Query(name),
    rpc: async (name, args = {}) => {
      await new Promise((r) => setTimeout(r, 120))
      const fn = rpcs[name]
      return fn ? fn(args) : fail(`Could not find the function public.${name}`, 'PGRST202')
    },
    auth: {
      getSession: async () => ok({ session: { ...session, user: { ...user } } }),
      getUser: async () => ok({ user: { ...user } }),
      onAuthStateChange(cb) {
        listeners.add(cb)
        return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } }
      },
      async updateUser({ data }) {
        if (data) {
          user.user_metadata = { ...user.user_metadata, ...data }
          writeLocal(META_KEY, user.user_metadata)
        }
        emit('USER_UPDATED')
        return ok({ user: { ...user } })
      },
      async signOut() { emit('SIGNED_OUT'); return { error: null } },
      async signInWithPassword() { return fail('Not available in the demo') },
      async signUp() { return fail('Not available in the demo') },
      async resetPasswordForEmail() { return fail('Not available in the demo') },
    },
    storage: {
      from: () => ({
        async upload(path, file) { files.set(path, file); return ok({ path }) },
        async remove(paths) { paths.forEach((p) => files.delete(p)); return ok(paths) },
        async list(prefix) { return ok([...files.keys()].filter((k) => k.startsWith(`${prefix}/`)).map((k) => ({ name: k.slice(prefix.length + 1) }))) },
        async createSignedUrl(path) {
          const blob = files.get(path) || new Blob([`ManaLife demo file\n\n${path}\n\nUploads in the demo stay in memory on this device.`], { type: 'text/plain' })
          return ok({ signedUrl: URL.createObjectURL(blob) })
        },
      }),
    },
    reset() {
      store = seed()
      persist()
    },
  }
}
