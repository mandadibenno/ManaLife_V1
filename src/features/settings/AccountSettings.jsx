import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Database, Flower2, HeartPulse, LogOut, Monitor, Moon, Palette, RotateCcw, ShieldCheck, Sun, UserRound } from 'lucide-react'
import { useAuth, displayNameOf } from '../../hooks/auth'
import { useTheme } from '../../hooks/theme'
import { useWorkspace } from '../../hooks/workspace'
import { cycleTrackingEnabled } from '../../app/SpaceContext'
import { Page, PageHeader, Reveal } from '../../ui/Page'
import { Button } from '../../ui/Button'
import { Avatar, Badge, Card, CardHeader, Segmented } from '../../ui/Display'
import { Field, Input, Select, Switch } from '../../ui/Form'
import { useToast } from '../../ui/Toast'
import { useConfirm } from '../../ui/Confirm'
import { signOut, updateDisplayName, updateMetadata } from '../../services/profile'
import { db } from '../../lib/supabase'

export default function AccountSettings() {
  return (
    <Page className="page-narrow">
      <PageHeader eyebrow="Account" title="You & ManaLife" description="Your profile and preferences follow you across every space." />
      <div className="settings-stack">
        <Reveal>
          <ProfileCard />
        </Reveal>
        <Reveal>
          <HealthCard />
        </Reveal>
        <Reveal>
          <AppearanceCard />
        </Reveal>
        <Reveal>
          <AccountCard />
        </Reveal>
      </div>
    </Page>
  )
}

function ProfileCard() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const toast = useToast()
  const [name, setName] = useState(displayNameOf(user))
  const [busy, setBusy] = useState(false)
  async function save(e) {
    e.preventDefault()
    setBusy(true)
    try {
      await updateDisplayName(user.id, name)
      await qc.invalidateQueries({ queryKey: ['members'] })
      toast.success('Name updated everywhere')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Card className="settings-card">
      <CardHeader icon={UserRound} title="Profile" />
      <form className="profile-row" onSubmit={save}>
        <Avatar id={user.id} name={name} size={56} />
        <Field label="Display name" hint="This is how you appear to people in your shared spaces." className="spacer">
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={70} />
        </Field>
        <Button type="submit" variant="secondary" loading={busy} disabled={!name.trim() || name.trim() === displayNameOf(user)}>
          Save
        </Button>
      </form>
    </Card>
  )
}

function HealthCard() {
  const { user } = useAuth()
  const toast = useToast()
  const md = user.user_metadata || {}
  const [busy, setBusy] = useState(false)
  async function set(data, message) {
    setBusy(true)
    try {
      await updateMetadata(data)
      toast.success(message)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Card className="settings-card">
      <CardHeader icon={HeartPulse} title="Health features" subtitle="Medicines and cycle data are tied to your account, never to a shared space." />
      <div className="form">
        <Field label="Gender" hint="Used only to suggest relevant health features.">
          <Select value={md.gender || ''} disabled={busy} onChange={(e) => set({ gender: e.target.value || null }, 'Profile saved')}>
            <option value="">Not set</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </Select>
        </Field>
        <Switch
          label="Cycle Tracker in My Space"
          description="Private. You can share read-only access with a partner in a couple or family space."
          checked={cycleTrackingEnabled(user)}
          disabled={busy}
          onChange={(on) => set({ cycle_tracking: on }, on ? 'Cycle Tracker turned on' : 'Cycle Tracker hidden')}
        />
      </div>
      <div className="notice" style={{ marginTop: 12 }}>
        <Flower2 size={16} />
        <span>Hiding the Cycle Tracker keeps your records — turning it back on shows them again.</span>
      </div>
    </Card>
  )
}

function AppearanceCard() {
  const { preference, setPreference } = useTheme()
  return (
    <Card className="settings-card">
      <CardHeader icon={Palette} title="Appearance" subtitle="Each space keeps its own colour. Choose light, dark or follow your device." />
      <Segmented
        layoutId="theme-seg"
        label="Theme"
        value={preference}
        onChange={setPreference}
        options={[
          { value: 'system', label: <><Monitor size={14} /> System</> },
          { value: 'light', label: <><Sun size={14} /> Light</> },
          { value: 'dark', label: <><Moon size={14} /> Dark</> },
        ]}
      />
    </Card>
  )
}

function AccountCard() {
  const { user, demo } = useAuth()
  const ws = useWorkspace()
  const confirm = useConfirm()
  const qc = useQueryClient()
  return (
    <Card className="settings-card">
      <CardHeader icon={ShieldCheck} title="Account & privacy" />
      <div className="kv">
        <span>Signed in as</span>
        <strong>{demo ? 'Demo user' : user.email}</strong>
      </div>
      <div className="kv">
        <span>Spaces</span>
        <strong>
          {ws.personal ? '1 private · ' : ''}
          {ws.shared.length} shared
        </strong>
      </div>
      <div className="kv">
        <span>
          <Database size={14} /> Database
        </span>
        <span>{ws.v2 ? <Badge tone="success">ManaLife 2.0 ready</Badge> : <Badge tone="warning">Update available</Badge>}</span>
      </div>
      {!ws.v2 && !demo && (
        <div className="notice notice-warning" style={{ margin: '8px 0 14px' }}>
          <Database size={16} />
          <span>
            My Space, Couple spaces, custom colours and member removal need migration <code>001_spaces_v2.sql</code>. Everything else works now. See README.
          </span>
        </div>
      )}
      <div className="row-wrap" style={{ marginTop: 14 }}>
        {demo && (
          <Button
            variant="secondary"
            icon={RotateCcw}
            onClick={async () => {
              if (!(await confirm({ title: 'Reset demo data?', body: 'All demo changes on this device will be replaced with fresh sample data.', confirmLabel: 'Reset' }))) return
              db().reset?.()
              qc.clear()
              window.location.reload()
            }}
          >
            Reset demo data
          </Button>
        )}
        <Button
          variant="danger-soft"
          icon={LogOut}
          onClick={async () => {
            if (await confirm({ title: demo ? 'Exit the demo?' : 'Sign out?', confirmLabel: demo ? 'Exit demo' : 'Sign out' })) await signOut()
          }}
        >
          {demo ? 'Exit demo' : 'Sign out'}
        </Button>
      </div>
    </Card>
  )
}
