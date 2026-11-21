# ManaLife 2.0 — Audit, Product Plan & Architecture

_Your Life. Your People. Your Space._

This document records what was found in ManaLife V1 (commit `2a414a7`), the problems this
redesign fixes, the new product structure, and the decisions behind the new codebase.
It is the reference for reviewing the `redesign/manalife-2` branch.

---

## 1. What I found

### 1.1 Project shape

| Area | V1 state |
|---|---|
| UI code | One 7,369-line `src/App.jsx` holding every screen, form, modal and data call |
| Styling | `styles.css` (1,915 lines) **plus** hundreds of inline `style={{…}}` objects with hard-coded colours in Expenses, Habits, Meals, Medicines, Periods and all room panels |
| Data layer | `store.js` (tasks, groceries, bills, events) + direct `supabase.from(...)` calls scattered through components |
| Navigation | A `section` string in state. No URLs, so no deep links, browser back, or Android back-button support |
| Bundle | A single 593 KB JS chunk (168 KB gzip), no code splitting |
| Sync | Several independent `setInterval` loops (20 s data, 20 s habits, 15 s period access, 12 s join requests, 5 s join status) |
| Tests / lint | None |

### 1.2 Supabase: the schema in the repo is out of date ⚠️

`supabase/schema.sql` only describes the original 2-person household (tasks, groceries, bills,
events). The live app depends on database objects that **are not in the repository**:

- Tables: `expenses`, `household_budgets`, `habits`, `habit_checks`, `meal_plans`, `medications`,
  `medicine_logs`, `period_entries`, `period_shares`
- Columns on `households`: `room_type`, `enabled_modules`, `overview_modules`
- RPCs: `create_room`, `update_room_configuration`, `leave_room`, `transfer_room_ownership`,
  `delete_room_safely`, `get_room_join_invite`, `list_pending_room_joins`, `decide_room_join`,
  `request_room_join`, `my_room_join_status`, `cancel_room_join`
- The `unique` constraint on `household_members.user_id` must have been dropped (users have
  several rooms), and owner allow-listing appears to have been relaxed.

So the RLS policies protecting medicines, period data and expenses **cannot be reviewed from the
repo**. `supabase/introspect.sql` (added in this branch) is a read-only query that exports the
live tables, policies and functions so they can be committed and reviewed.

### 1.3 What works well (preserved)

- Real security boundary in Postgres: membership-checked RLS, `SECURITY DEFINER` helpers kept in
  a non-exposed `private` schema, invoker wrappers for RPCs, identity-protection triggers.
- Meet-style joining: shareable link/code, waiting room, owner **Admit / Reject**, 30-day invites,
  no email needed. The older email-bound invite flow was deliberately removed; it stays removed.
- Recurring tasks with per-occurrence completion; monthly bills with per-occurrence payments.
- Private health data: medicines and period entries are keyed by `user_id`, not by room.
- Read-only, revocable period sharing with a chosen partner.
- Ownership transfer, leave room and delete-with-confirmation.
- Meal planner with nutrition estimates and "add ingredients to groceries".
- PWA + Capacitor builds; GitHub Pages deploy.

### 1.4 Bugs and incomplete features

| # | Problem | Impact |
|---|---|---|
| B1 | `PeriodTracker` is declared **inside** `App()`, so it is a new component type on every render. Every toast and every 20-second poll unmounts it, wiping an open form and re-fetching. | Data entry lost while typing |
| B2 | Your **own** period tracker only appears when the *active room* is a "family" room. A woman whose active room is a friends room cannot reach her own private data. | Personal data hidden behind an unrelated shared context |
| B3 | "Period Tracker" is always in the menu, but renders an **empty page** for users without access (no gender set, male without share, non-family room). | Blank screen |
| B4 | `today` is computed once at module load. A PWA left open past midnight keeps showing yesterday's tasks, habits and doses. | Wrong day |
| B5 | `loadRemote` fetches `task_completions` and `bill_payments` with **no filter**, returning every completion from every room the user belongs to on every 20-second poll. | Grows without bound; slow on phones |
| B6 | Every checkbox tap re-fetches all six tables and shows a "Saved successfully" toast. No optimistic update. | Laggy, noisy |
| B7 | Mobile bottom nav only exposes Home/Tasks/Groceries/Bills/Calendar. Expenses, habits, meals, medicines and settings need the hamburger. | Poor mobile reach |
| B8 | "Reminders" and "Family Documents" are selectable room features but are placeholder pages ("coming soon"). | Dead ends |
| B9 | Expenses, habits and meals use Supabase directly. In demo mode Expenses errors out. | Demo inconsistent |
| B10 | `window.confirm` / `window.prompt` used for destructive actions; unreliable in some WebViews. | Mobile UX |
| B11 | Meal planner grid has `min-width: 1240px` and expenses chart `min-width: 750px`. | Horizontal scrolling on phones |
| B12 | Dead code: `InvitePanel`, `loadHousehold`, `createFamily`, `joinFamily`, `inviteFamily` (email-invite era). | Confusion |
| B13 | Leaving a room does not (as far as the client shows) revoke `period_shares` granted to/from that member in that room. | Possible stale health-data permission (to verify in DB) |
| B14 | No way to edit your display name; profile only stores gender. | Missing basic |
| B15 | No password reset. | Lockouts |

### 1.5 Product / UX problems

- **Everything is "family"**: copy, icons, hero ("household members"), privacy tile ("Just your
  family"), settings ("Household settings"), onboarding ("Start a new family").
- **No personal space**: you must create or join a room before you can use anything.
- **No sense of context**: every room shows the same green hero and the same cards. The
  "Couple Room" for period sharing is internally `room_type = 'family'`, which is confusing.
- Dashboard cards are mostly counters; "Expenses: View", "Habits: Open", "Reminders: Soon" are
  decorative.
- Forms are long and modal-heavy; there is no quick add.
- Design is inconsistent: three different button styles, ad-hoc greens, mixed fonts loaded from
  Google Fonts at runtime (breaks offline / native).

---

## 2. New product structure

```
ManaLife
├── My Space (personal, always present, private by database design)
│   └── Tasks · Spending · Bills · Calendar · Habits · Meals · Shopping · Medicines
│       · Cycle · Reminders · Documents
└── Shared Spaces (created or joined)
    ├── Couple   — plans, to-dos, shared expenses, bills, reminders (+ cycle sharing)
    ├── Family   — household tasks, groceries, bills, meals, calendar, vault
    ├── Friends  — plans, group expenses, tasks
    ├── Office   — deadlines, schedule, team tasks, team expenses
    └── Custom   — any name, icon, colour and feature set
```

### How "My Space" works (and why it is private)

A personal space is a normal row in `households` with `room_type = 'personal'` and exactly one
member. Every feature table already filters by `household_id` + membership RLS, so personal data
is protected by **the same policies** that protect shared data. No table changes are needed.

The migration adds database-level guarantees:
- a trigger refuses any second member in a personal space (even via the invite RPCs),
- personal spaces cannot be converted to/from shared types,
- one personal space per user (unique partial index),
- `ensure_personal_space()` creates it on first sign-in.

If the migration has not been run, the app still works exactly as before with shared spaces
only, and shows a short notice in settings.

### Space-aware experience

Each space type defines (in `src/config/spaceTypes.js`):
- accent colour + icon, transitioned smoothly when switching,
- vocabulary ("Our To-dos" in a couple space, "Household Tasks" in family, "Team Tasks" in office),
- default feature set and default dashboard widgets,
- dashboard hero and widget priority (e.g. Office leads with deadlines, Family with groceries).

### Existing vs new functionality

**Improved existing features:** tasks, groceries, bills, expenses + budget, calendar, habits,
meal planner, medicines, period tracker + sharing, rooms (create, customise, invite, waiting room,
transfer, leave, delete), auth, settings, demo mode.

**New in this branch:**
- Personal space (needs migration 001)
- Couple space type (needs migration 001)
- Space icon/colour customisation (needs migration 001)
- Remove a member (owner) (needs migration 001)
- Automatic revocation of cycle sharing when someone leaves or is removed (migration 001)
- Documents vault with private Storage bucket (needs migration 002)
- Reminders hub: one agenda built from overdue/upcoming tasks, bills, events, doses and refills
  (no DB change; in-app only — push notifications still need a server)
- Quick add (Ctrl/Cmd+K or the + button) for tasks, expenses, groceries and events
- Per-user dashboard customisation (show/hide/reorder widgets)
- Light / dark / system theme
- Search, filters and sorting in list modules; CSV export of expenses
- Edit display name; password reset
- URL routing with working back button and deep links

**Recommended later (not built):** push notifications (needs a server + Capacitor plugin),
split-bill balances for friends spaces (needs an `expense_splits` table), realtime sync via
Supabase Realtime (needs publication changes), offline editing.

---

## 3. Architecture

```
src/
├── app/            App shell, providers, router, layouts, error boundary
├── config/         modules registry, space types, env
├── lib/            supabase client, demo client, dates, money, recurrence, ids, storage
├── services/       one file per domain; the only place that talks to Supabase
├── hooks/          auth, spaces, theme, today, media queries, query helpers
├── motion/         Motion presets + reduced-motion aware wrappers
├── ui/             design-system components (Button, Card, Sheet, Field, Toast…)
├── features/       auth · onboarding · dashboard · spaces · tasks · groceries · bills · expenses
│                   · calendar · habits · meals · medicines · cycle · reminders · documents
│                   · settings · quick-add
└── styles/         tokens.css (light/dark), base.css, layout.css
```

Key choices:
- **React Router (hash mode)** — works on GitHub Pages and inside Capacitor with no server
  rewrites; old `/#join=TOKEN` links are still captured.
- **TanStack Query** — one cache for all data, focus/interval refetch replaces the ad-hoc polling
  loops, optimistic updates for checkboxes, automatic retry on flaky networks.
- **Motion (LazyMotion + `m`)** — ~17 KB animation runtime; honours `prefers-reduced-motion`.
- **Demo client** — a small local implementation of the Supabase query builder, so demo mode
  exercises the exact same service code as production.
- **Lazy-loaded feature routes** — each module is its own chunk.
- **Fonts bundled** (`@fontsource`) instead of Google Fonts at runtime, so native/offline builds
  render correctly.
- Plain CSS with design tokens; no CSS framework.

---

## 4. Design system

- **Type:** Inter (UI) + Instrument Serif (expressive headings), bundled.
- **Colour:** warm neutral base, per-space accent (`--accent`) registered with `@property` so
  switching spaces animates the theme. Full dark palette.
- **Shape:** 8 / 12 / 16 / 22 / 28 px radii; layered soft shadows; 1 px hairline borders.
- **Layout:** 12-column bento grid → 6 columns on tablet → single/two columns on phones.
- **Motion:** 160–260 ms, spring for press/layout, fades for content; stagger on dashboards;
  shared-layout indicators for nav; sheets on mobile, dialogs on desktop.
- **Accessibility:** visible focus rings, focus-trapped dialogs, Esc to close, 44 px touch targets,
  `aria-live` toasts, reduced-motion support, AA contrast in both themes.

---

## 5. Database changes (`supabase/migrations/`)

| File | Purpose | Required for |
|---|---|---|
| `001_spaces_v2.sql` | personal + couple types, personal-space guards, `ensure_personal_space`, `create_space`, `update_space`, `remove_space_member`, icon/accent columns, cycle-share cleanup trigger | My Space, Couple, appearance, member removal |
| `002_documents.sql` | `space_documents` table + private `space-documents` bucket with membership RLS | Documents |

Both are transactional, additive (no data is deleted or rewritten), and keep every existing RPC
working. Run `supabase/introspect.sql` first and keep its output — it is your schema backup.

---

## 6. Verification performed

| Check | Result |
|---|---|
| `npm run lint` (ESLint + React Hooks rules) | Clean |
| `npm test`: 28 unit tests, incl. **exact parity with V1** task/bill recurrence over 400 days | Pass |
| `npm run build` (web + PWA) and `npm run build:mobile` (no service worker) | Pass |
| Every screen in all 5 demo spaces at 1440 px, 390 px and in dark mode: no console errors, no horizontal overflow on phones | Pass |
| 16 end-to-end flows (quick add, optimistic completion, space switching and accent, create wizard, invite link format, admit from waiting room, dashboard customisation, type-to-confirm delete, old `/#join=` links, mobile More sheet and bottom-sheet quick add) | Pass |
| Migrations on local PostgreSQL 16 with a Supabase shim, V1 `schema.sql` and simulated V2 drift; `enabled_modules` as both `text[]` and `jsonb`; applied twice; 15 privacy/guard rejections asserted as real users under RLS | Pass |
| WCAG AA contrast for text and every accent, light and dark | Pass |
| Sign-in screen against an unreachable server shows a friendly offline message | Pass |

**Not verified here:** the live Supabase project (its RLS and RPC source aren't in the repo; run
`introspect.sql`), real email/password-reset delivery, and the Android/iOS builds on devices.

Bugs found and fixed during verification: medicine names truncated on phones, the label not
linked to the password field, the mobile logo gradient blanked by a duplicate SVG id, and
`#join=` links opened while the app was running not reaching the join screen.
