import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Crown, DoorOpen, LayoutGrid, Lock, Palette, Trash2, UserMinus, UsersRound } from 'lucide-react'
import { useSpace, cycleTrackingEnabled } from '../../app/SpaceContext'
import { useWorkspace, enabledModules } from '../../hooks/workspace'
import { keys } from '../../hooks/data'
import { Page, PageHeader, Reveal } from '../../ui/Page'
import { Button } from '../../ui/Button'
import { Avatar, Badge, Card, CardHeader, SpaceIcon } from '../../ui/Display'
import { Field, Input, Select } from '../../ui/Form'
import { Menu } from '../../ui/Menu'
import { useToast } from '../../ui/Toast'
import { useConfirm } from '../../ui/Confirm'
import { SHARED_TYPE_KEYS, SPACE_TYPES } from '../../config/spaceTypes'
import { deleteSpace, leaveSpace, removeMember, transferOwnership, updateSpace } from '../../services/spaces'
import { purgeSpaceDocuments } from '../../services/documents'
import { AccentPicker, IconPicker, ModulePicker } from './SpacePickers'
import { InvitePanel } from './InvitePanel'
import { CycleSharePanel } from '../cycle/CycleSharePanel'

export default function SpaceSettings() {
  const { space, user } = useSpace()
  const location = useLocation()
  const shareCycle = !space.isPersonal && (space.type === 'couple' || space.type === 'family') && cycleTrackingEnabled(user)

  useEffect(() => {
    if (location.hash === '#invite') {
      const t = window.setTimeout(() => document.getElementById('invite')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 350)
      return () => window.clearTimeout(t)
    }
    return undefined
  }, [location.hash])

  return (
    <Page className="page-narrow">
      <PageHeader eyebrow={space.isPersonal ? 'Private space' : `${SPACE_TYPES[space.type].label} space`} title={space.isPersonal ? 'Customize My Space' : 'Space settings'} />
      <div className="settings-stack">
        <Reveal>
          <GeneralCard />
        </Reveal>
        {!space.isPersonal && (
          <Reveal>
            <MembersCard />
          </Reveal>
        )}
        {!space.isPersonal && space.isOwner && (
          <Reveal>
            <InvitePanel />
          </Reveal>
        )}
        {shareCycle && (
          <Reveal>
            <CycleSharePanel />
          </Reveal>
        )}
        {!space.isPersonal && (
          <Reveal>
            <DangerCard />
          </Reveal>
        )}
      </div>
    </Page>
  )
}

function GeneralCard() {
  const { space, user } = useSpace()
  const ws = useWorkspace()
  const qc = useQueryClient()
  const toast = useToast()
  const initial = () => ({ name: space.name, type: space.type, icon: space.icon, accent: space.accent, enabled: enabledModules(space), cards: space.cards.length ? space.cards : SPACE_TYPES[space.type].widgets })
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setForm(initial()), [space.id, space.name, space.type, space.icon, space.accent])
  const canEdit = space.isOwner
  const dirty = JSON.stringify(form) !== JSON.stringify(initial())

  async function save() {
    if (!form.name.trim()) return setError('Name is required')
    if (!form.enabled.length) return setError('Keep at least one feature on')
    setError('')
    setBusy(true)
    try {
      await updateSpace(space, form, { v2: ws.v2 })
      await qc.invalidateQueries({ queryKey: ['spaces', user.id] })
      toast.success('Space updated')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!canEdit) {
    return (
      <Card className="settings-card">
        <div className="space-summary">
          <SpaceIcon space={space} size={52} />
          <div>
            <h3>{space.name}</h3>
            <p className="subtle">
              {SPACE_TYPES[space.type].label} · {enabledModules(space).length} features
            </p>
          </div>
        </div>
        <p className="field-hint" style={{ marginTop: 12 }}>
          Only the owner can change this space's name, look and features. You can still arrange your own dashboard with “Customize” on the overview.
        </p>
      </Card>
    )
  }

  return (
    <>
      <Card className="settings-card">
        <CardHeader icon={Palette} title="Name & look" />
        <div className="form">
          <div className="name-preview">
            <SpaceIcon icon={form.icon} accent={form.accent} size={52} />
            <Field label="Name" error={error && !form.name.trim() ? error : ''} className="spacer">
              <Input value={form.name} maxLength={100} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </Field>
          </div>
          {!space.isPersonal && (
            <Field label="Type" hint="Changes vocabulary and default dashboard. Your data stays the same.">
              <Select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                {SHARED_TYPE_KEYS.filter((t) => ws.v2 || t !== 'couple').map((t) => (
                  <option key={t} value={t}>
                    {SPACE_TYPES[t].label}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          {ws.v2 && !space.isPersonal && (
            <>
              <Field label="Icon">
                <IconPicker value={form.icon} accent={form.accent} onChange={(icon) => setForm((f) => ({ ...f, icon }))} />
              </Field>
              <Field label="Colour">
                <AccentPicker value={form.accent} onChange={(accent) => setForm((f) => ({ ...f, accent }))} />
              </Field>
            </>
          )}
          {ws.v2 && space.isPersonal && (
            <Field label="Colour">
              <AccentPicker value={form.accent} onChange={(accent) => setForm((f) => ({ ...f, accent }))} />
            </Field>
          )}
        </div>
      </Card>
      <Card className="settings-card">
        <CardHeader icon={LayoutGrid} title="Features" subtitle={space.isPersonal ? 'What My Space includes.' : 'What everyone in this space can use. Hiding a feature never deletes its data.'} />
        <ModulePicker type={form.type} personal={space.isPersonal} enabled={form.enabled} cards={form.cards} onChange={(v) => setForm((f) => ({ ...f, ...v }))} />
        {space.isPersonal && (
          <p className="field-hint" style={{ marginTop: 10 }}>
            <Lock size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /> Cycle Tracker also needs to be switched on in Account → Health features.
          </p>
        )}
      </Card>
      {(dirty || error) && (
      <div className="sticky-save">
        {error && <span className="field-error">{error}</span>}
        <Button variant="ghost" disabled={!dirty || busy} onClick={() => setForm(initial())}>
          Discard
        </Button>
        <Button onClick={save} loading={busy} disabled={!dirty}>
          Save changes
        </Button>
      </div>
      )}
    </>
  )
}

function MembersCard() {
  const { space, members, userId, membersLoading } = useSpace()
  const ws = useWorkspace()
  const qc = useQueryClient()
  const toast = useToast()
  const confirm = useConfirm()

  async function run(fn, success) {
    try {
      await fn()
      await Promise.all([qc.invalidateQueries({ queryKey: keys.members(space.id) }), qc.invalidateQueries({ queryKey: ['spaces', userId] })])
      toast.success(success)
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <Card className="settings-card">
      <CardHeader icon={UsersRound} title="People" subtitle={`${members.length} ${members.length === 1 ? 'member' : 'members'} · everyone here can see this space's shared items`} />
      <div className="list">
        {(membersLoading ? [] : members).map((p) => (
          <div key={p.id} className="list-row">
            <Avatar id={p.id} name={p.display_name} size={38} />
            <div className="list-row-main">
              <span className="list-row-title">
                {p.display_name}
                {p.id === userId && <span className="subtle"> (you)</span>}
              </span>
              <span className="list-row-meta">{p.role === 'owner' ? 'Owner' : 'Member'}</span>
            </div>
            {p.role === 'owner' && <Badge tone="warning" icon={Crown}>Owner</Badge>}
            {space.isOwner && p.id !== userId && p.role !== 'owner' && (
              <Menu
                label={`Manage ${p.display_name}`}
                items={[
                  {
                    label: 'Make owner',
                    icon: Crown,
                    onClick: async () => {
                      const ok = await confirm({ title: `Make ${p.display_name} the owner?`, body: 'They will be able to manage members, settings and delete the space. You will become a regular member.', confirmLabel: 'Transfer ownership' })
                      if (ok) run(() => transferOwnership(space.id, p.id), `${p.display_name} is now the owner`)
                    },
                  },
                  ws.v2 && {
                    label: 'Remove from space',
                    icon: UserMinus,
                    tone: 'danger',
                    onClick: async () => {
                      const ok = await confirm({ title: `Remove ${p.display_name}?`, body: 'They will immediately lose access to everything in this space. Their tasks will be unassigned.', confirmLabel: 'Remove', tone: 'danger' })
                      if (ok) run(() => removeMember(space.id, p.id), `${p.display_name} was removed`)
                    },
                  },
                ]}
              />
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}

function DangerCard() {
  const { space, userId, has } = useSpace()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const [busy, setBusy] = useState('')

  async function leave() {
    const ok = await confirm({ title: `Leave ${space.name}?`, body: "You'll lose access to this space's shared items. Everyone else keeps them.", confirmLabel: 'Leave space', tone: 'danger' })
    if (!ok) return
    setBusy('leave')
    try {
      await leaveSpace(space.id)
      await qc.invalidateQueries({ queryKey: ['spaces', userId] })
      toast.success(`You left ${space.name}`)
      navigate('/', { replace: true })
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy('')
    }
  }

  async function remove() {
    const ok = await confirm({
      title: 'Delete this space permanently?',
      body: (
        <>
          Every shared task, list, bill, expense, event{has('documents') ? ', document' : ''} and plan in <strong>{space.name}</strong> will be deleted for all members. Personal health records are not affected. This can't be undone.
        </>
      ),
      confirmLabel: 'Delete forever',
      tone: 'danger',
      typeToConfirm: space.name,
    })
    if (!ok) return
    setBusy('delete')
    try {
      await purgeSpaceDocuments(space.id) // stored files don't cascade; remove them first
      await deleteSpace(space)
      qc.removeQueries({ predicate: (q) => q.queryKey.includes(space.id) })
      await qc.invalidateQueries({ queryKey: ['spaces', userId] })
      toast.success('Space deleted')
      navigate('/', { replace: true })
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy('')
    }
  }

  return (
    <Card className="settings-card danger-card">
      <CardHeader icon={DoorOpen} title={space.isOwner ? 'Delete space' : 'Leave space'} />
      {space.isOwner ? (
        <>
          <p className="muted" style={{ marginBottom: 12 }}>
            To leave a space you own, first make someone else the owner in People. Or delete it for everyone.
          </p>
          <Button variant="danger-soft" icon={Trash2} loading={busy === 'delete'} onClick={remove}>
            Delete {space.name}
          </Button>
        </>
      ) : (
        <>
          <p className="muted" style={{ marginBottom: 12 }}>
            Leave whenever you like. You can rejoin later with a new invite.
          </p>
          <Button variant="danger-soft" icon={DoorOpen} loading={busy === 'leave'} onClick={leave}>
            Leave {space.name}
          </Button>
        </>
      )}
    </Card>
  )
}
