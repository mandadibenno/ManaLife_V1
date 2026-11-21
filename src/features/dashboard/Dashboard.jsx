import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { m } from 'motion/react'
import { ArrowDown, ArrowUp, CalendarDays, Heart, ListChecks, Lock, ReceiptText, SlidersHorizontal, UserPlus } from 'lucide-react'
import { useSpace } from '../../app/SpaceContext'
import { useToday } from '../../hooks/useToday'
import { Page } from '../../ui/Page'
import { Button } from '../../ui/Button'
import { Avatar, AvatarStack } from '../../ui/Display'
import { Sheet } from '../../ui/Sheet'
import { Switch } from '../../ui/Form'
import { useToast } from '../../ui/Toast'
import { updateMetadata } from '../../services/profile'
import { fullDate, greeting, timeLabel } from '../../lib/dates'
import { shortName } from '../../lib/format'
import { displayNameOf } from '../../hooks/auth'
import { MODULES } from '../../config/modules'
import { fadeUp, stagger } from '../../motion'
import { useReminders } from '../reminders/useReminders'
import { TasksWidget } from './widgets/TasksWidget'
import { BillsWidget, ExpensesWidget } from './widgets/MoneyWidgets'
import { CalendarWidget, MealsWidget, RemindersWidget } from './widgets/PlanWidgets'
import { GroceriesWidget, HabitsWidget } from './widgets/HomeWidgets'
import { CycleWidget, MedicinesWidget } from './widgets/HealthWidgets'
import { DocumentsWidget, MembersWidget } from './widgets/SpaceWidgets'

const WIDGETS = {
  tasks: TasksWidget,
  calendar: CalendarWidget,
  expenses: ExpensesWidget,
  bills: BillsWidget,
  groceries: GroceriesWidget,
  habits: HabitsWidget,
  meals: MealsWidget,
  medicines: MedicinesWidget,
  periods: CycleWidget,
  reminders: RemindersWidget,
  documents: DocumentsWidget,
  members: MembersWidget,
}
const SMALL = new Set(['periods', 'documents', 'members', 'meals'])

/** Bento sizing: lead widget is large; rows of three; no ragged last row. */
function sizesFor(keys) {
  const sizes = keys.map(() => 'md')
  if (!keys.length) return sizes
  sizes[0] = 'lg'
  const rest = keys.length - 2
  if (keys.length === 1) sizes[0] = 'xl'
  else if (rest > 0 && rest % 3 === 1) {
    if (rest === 1) sizes[keys.length - 1] = 'xl'
    else {
      sizes[keys.length - 4] = 'lg'
      sizes[keys.length - 1] = 'lg'
    }
  } else if (rest > 0 && rest % 3 === 2) {
    const i = keys.length - 2
    sizes[SMALL.has(keys[i]) ? i + 1 : i] = 'lg'
  }
  return sizes
}

function useDashboardLayout() {
  const { space, has, type, user } = useSpace()
  const available = [...Object.keys(WIDGETS).filter((k) => k !== 'members' && has(k)), ...(space.isPersonal ? [] : ['members'])]
  const base = (space.cards.length ? space.cards : type.widgets).filter((k) => available.includes(k))
  const defaults = [...base, ...(has('periods') && !base.includes('periods') ? ['periods'] : []), ...(space.isPersonal ? [] : ['members'])]
  const pref = user.user_metadata?.ml_dash?.[space.id]
  let order
  let hidden
  if (pref?.order) {
    order = [...pref.order.filter((k) => available.includes(k)), ...available.filter((k) => !pref.order.includes(k))]
    hidden = new Set([...(pref.hidden || []), ...available.filter((k) => !pref.order.includes(k) && !defaults.includes(k))])
  } else {
    order = [...defaults, ...available.filter((k) => !defaults.includes(k))]
    hidden = new Set(available.filter((k) => !defaults.includes(k)))
  }
  return { order, hidden, visible: order.filter((k) => !hidden.has(k)), defaults }
}

export default function Dashboard() {
  const { space } = useSpace()
  const today = useToday()
  const layout = useDashboardLayout()
  const [customizing, setCustomizing] = useState(false)
  const sizes = sizesFor(layout.visible)

  return (
    <Page className="dashboard">
      <Hero today={today} onCustomize={() => setCustomizing(true)} />
      <m.div className="bento" variants={stagger(0.05, 0.08)} initial="hidden" animate="show" key={space.id}>
        {layout.visible.map((key, i) => {
          const Widget = WIDGETS[key]
          return <Widget key={key} size={sizes[i]} today={today} />
        })}
      </m.div>
      {layout.visible.length === 0 && (
        <div className="dash-empty">
          <p>Your dashboard is empty.</p>
          <Button variant="soft" icon={SlidersHorizontal} onClick={() => setCustomizing(true)}>
            Choose widgets
          </Button>
        </div>
      )}
      <CustomizeSheet open={customizing} onClose={() => setCustomizing(false)} layout={layout} />
    </Page>
  )
}

function Hero({ today, onCustomize }) {
  const { space, type, user, members, basePath, userId, has } = useSpace()
  const { items } = useReminders({ horizon: 7 })
  const name = shortName(displayNameOf(user))
  const others = members.filter((p) => p.id !== userId)

  const chips = useMemo(() => {
    const out = []
    const late = items.filter((i) => i.kind === 'task' && i.status === 'overdue').length
    const due = items.filter((i) => i.kind === 'task' && i.status === 'today').length
    if (late) out.push({ icon: ListChecks, label: `${late} overdue task${late > 1 ? 's' : ''}`, to: `${basePath}/tasks`, tone: 'danger' })
    if (has('tasks') && (due || !late)) out.push({ icon: ListChecks, label: due ? `${due} task${due > 1 ? 's' : ''} for today` : 'No tasks due today', to: `${basePath}/tasks` })
    const todayEvent = items.find((i) => i.kind === 'event' && i.status === 'today')
    if (todayEvent) out.push({ icon: CalendarDays, label: `${todayEvent.title}${todayEvent.time ? ` · ${timeLabel(todayEvent.time)}` : ''}`, to: `${basePath}/calendar` })
    const bills = items.filter((i) => i.kind === 'bill').length
    if (bills) out.push({ icon: ReceiptText, label: `${bills} bill${bills > 1 ? 's' : ''} due soon`, to: `${basePath}/bills`, tone: items.some((i) => i.kind === 'bill' && i.status === 'overdue') ? 'danger' : undefined })
    return out.slice(0, 3)
  }, [items, basePath, has])

  const title =
    space.type === 'couple' && others.length === 1 ? (
      <>
        {greeting()}, {name} <em>&amp;</em> {shortName(others[0].display_name)}
      </>
    ) : (
      <>
        {greeting()}, <em>{name}</em>
      </>
    )

  return (
    <m.section className={`hero hero-${space.type}`} variants={fadeUp}>
      <div className="hero-glow" aria-hidden />
      <div className="hero-main">
        <p className="eyebrow">{fullDate(today)}</p>
        <h1 className="display hero-title">{title}</h1>
        <p className="hero-line">{type.heroLine}</p>
        {chips.length > 0 && (
          <div className="hero-chips">
            {chips.map((c) => (
              <Link key={c.label} to={c.to} className={`hero-chip ${c.tone ? `is-${c.tone}` : ''}`}>
                <c.icon size={14} aria-hidden />
                {c.label}
              </Link>
            ))}
          </div>
        )}
      </div>
      <div className="hero-side">
        {space.isPersonal ? (
          <span className="hero-private">
            <Lock size={14} /> Only you can see this
          </span>
        ) : space.type === 'couple' && others.length === 1 ? (
          <span className="hero-couple" aria-label={`${name} and ${others[0].display_name}`}>
            <Avatar id={userId} name={displayNameOf(user)} size={44} ring />
            <Heart size={16} className="hero-heart" fill="currentColor" />
            <Avatar id={others[0].id} name={others[0].display_name} size={44} ring />
          </span>
        ) : (
          <Link to={`${basePath}/settings`} className="hero-people">
            <AvatarStack people={members} max={5} size={34} />
            <span>
              {members.length} {members.length === 1 ? 'member' : 'members'}
            </span>
          </Link>
        )}
        <div className="row" style={{ gap: 6 }}>
          {!space.isPersonal && space.isOwner && (
            <Button as={Link} to={`${basePath}/settings#invite`} variant="secondary" size="sm" icon={UserPlus}>
              Invite
            </Button>
          )}
          <Button variant="secondary" size="sm" icon={SlidersHorizontal} onClick={onCustomize}>
            Customize
          </Button>
        </div>
      </div>
    </m.section>
  )
}

function CustomizeSheet({ open, onClose, layout }) {
  const { space, user, title } = useSpace()
  const toast = useToast()
  const [order, setOrder] = useState(layout.order)
  const [hidden, setHidden] = useState(layout.hidden)
  const [busy, setBusy] = useState(false)

  const [lastOpen, setLastOpen] = useState(false)
  if (open && !lastOpen) {
    setOrder(layout.order)
    setHidden(new Set(layout.hidden))
  }
  if (open !== lastOpen) setLastOpen(open)

  const move = (i, d) =>
    setOrder((o) => {
      const next = [...o]
      ;[next[i], next[i + d]] = [next[i + d], next[i]]
      return next
    })

  async function save(reset = false) {
    setBusy(true)
    try {
      const all = { ...(user.user_metadata?.ml_dash || {}) }
      if (reset) delete all[space.id]
      else all[space.id] = { order, hidden: [...hidden] }
      await updateMetadata({ ml_dash: all })
      toast.success(reset ? 'Dashboard reset' : 'Dashboard updated')
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Customize dashboard"
      description="Choose and order the cards you see here. Only affects your view."
      initialFocus={false}
      footer={
        <>
          <Button variant="ghost" onClick={() => save(true)} disabled={busy}>
            Reset
          </Button>
          <Button onClick={() => save(false)} loading={busy}>
            Save
          </Button>
        </>
      }
    >
      <div className="customize-list">
        {order.map((key, i) => {
          const Icon = key === 'members' ? null : MODULES[key]?.icon
          return (
            <div key={key} className={`customize-row ${hidden.has(key) ? 'is-off' : ''}`}>
              <span className="customize-icon">{Icon ? <Icon size={16} /> : <Avatar name="People" size={22} />}</span>
              <div className="customize-switch">
                <Switch
                  label={key === 'members' ? 'People' : title(key)}
                  checked={!hidden.has(key)}
                  onChange={(on) =>
                    setHidden((h) => {
                      const next = new Set(h)
                      if (on) next.delete(key)
                      else next.add(key)
                      return next
                    })
                  }
                />
              </div>
              <button type="button" className="icon-btn icon-btn-sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${key} up`}>
                <ArrowUp size={15} />
              </button>
              <button type="button" className="icon-btn icon-btn-sm" disabled={i === order.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${key} down`}>
                <ArrowDown size={15} />
              </button>
            </div>
          )
        })}
      </div>
      {!space.isPersonal && <p className="field-hint" style={{ marginTop: 12 }}>Features available here are chosen by the space owner in Space settings.</p>}
    </Sheet>
  )
}
