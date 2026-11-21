import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, m } from 'motion/react'
import { Copy, Link2, MessageCircle, Share2, UserCheck, UserX, Users } from 'lucide-react'
import { useSpace } from '../../app/SpaceContext'
import { keys } from '../../hooks/data'
import { decideJoin, getInvite, listPendingJoins } from '../../services/spaces'
import { Button } from '../../ui/Button'
import { Avatar, Card, CardHeader } from '../../ui/Display'
import { useToast } from '../../ui/Toast'
import { useAuth } from '../../hooks/auth'
import { listItem } from '../../motion'

// Invite links keep V1's format (/#join=TOKEN) so old and new links both work.
function appBaseUrl() {
  const configured = import.meta.env.VITE_PUBLIC_APP_URL
  if (configured) return configured.replace(/\/$/, '')
  const host = window.location.hostname
  // Native apps (Capacitor serves from https://localhost) and local dev share the public site link.
  if (host === 'localhost' || host === '127.0.0.1') return 'https://app.pramodbenno.in'
  return `${window.location.origin}${window.location.pathname.replace(/\/$/, '')}`
}

/** Meet-style invitations: share a link or code; people wait until the owner admits them. */
export function InvitePanel() {
  const { space } = useSpace()
  const { demo, user } = useAuth()
  const qc = useQueryClient()
  const toast = useToast()
  const [invite, setInvite] = useState(null)
  const [busy, setBusy] = useState(false)
  const [deciding, setDeciding] = useState('')

  const pending = useQuery({
    queryKey: keys.joins(space.id),
    queryFn: () => listPendingJoins(space.id),
    refetchInterval: 12_000,
    refetchOnWindowFocus: true,
  })

  const link = invite ? `${appBaseUrl()}/#join=${encodeURIComponent(invite.token)}` : ''
  const message = invite ? `Join "${space.name}" on ManaLife:\n${link}\n\nSign in and tap “Ask to join”. I'll let you in.` : ''

  async function make() {
    setBusy(true)
    try {
      setInvite(await getInvite(space.id))
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function copy(text, label) {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} copied`)
    } catch {
      window.prompt('Copy this:', text)
    }
  }

  async function share() {
    try {
      await navigator.share({ title: `Join ${space.name}`, text: message })
    } catch {
      /* user cancelled */
    }
  }

  async function decide(req, approve) {
    setDeciding(req.id)
    try {
      await decideJoin(req.id, approve)
      qc.setQueryData(keys.joins(space.id), (old) => (old || []).filter((r) => r.id !== req.id))
      if (approve) {
        await qc.invalidateQueries({ queryKey: keys.members(space.id) })
        await qc.invalidateQueries({ queryKey: ['spaces', user.id] })
      }
      toast.success(approve ? `${req.name || 'They'} joined ${space.name}` : 'Request declined')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeciding('')
    }
  }

  const requests = pending.data || []

  return (
    <Card id="invite" className="settings-card">
      <CardHeader icon={Link2} title="Invite people" subtitle="Share a link or code. People ask to join, and you choose who gets in." />
      {!invite ? (
        <Button icon={Link2} onClick={make} loading={busy}>
          Get invite link
        </Button>
      ) : (
        <m.div className="invite-box" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <div className="invite-code">
            <small>Space code</small>
            <strong className="tnum">{invite.code}</strong>
          </div>
          <div className="invite-link truncate" title={link}>
            {link}
          </div>
          <div className="row-wrap">
            <Button size="sm" icon={Copy} onClick={() => copy(link, 'Link')}>
              Copy link
            </Button>
            <Button size="sm" variant="secondary" icon={Copy} onClick={() => copy(invite.code, 'Code')}>
              Copy code
            </Button>
            {typeof navigator.share === 'function' && (
              <Button size="sm" variant="secondary" icon={Share2} onClick={share}>
                Share
              </Button>
            )}
            <Button size="sm" variant="secondary" icon={MessageCircle} onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')}>
              WhatsApp
            </Button>
          </div>
          <p className="field-hint">Valid for 30 days. Nobody joins without your approval.{demo ? ' (Demo: links are not real.)' : ''}</p>
        </m.div>
      )}

      <div className="waiting">
        <p className="section-title">
          <Users size={15} /> Waiting room {requests.length > 0 && <span className="badge badge-accent">{requests.length}</span>}
        </p>
        {requests.length === 0 ? (
          <p className="subtle">No one is waiting. New requests appear here automatically.</p>
        ) : (
          <div className="list">
            <AnimatePresence initial={false}>
              {requests.map((r) => (
                <m.div key={r.id} className="list-row" layout {...listItem}>
                  <Avatar id={r.id} name={r.name || r.email || 'Guest'} size={36} />
                  <div className="list-row-main">
                    <span className="list-row-title">{r.name || 'Someone'}</span>
                    <span className="list-row-meta">{r.email || 'Signed-in ManaLife user'}</span>
                  </div>
                  <div className="row" style={{ gap: 6 }}>
                    <Button size="sm" variant="secondary" icon={UserX} disabled={!!deciding} onClick={() => decide(r, false)}>
                      Decline
                    </Button>
                    <Button size="sm" icon={UserCheck} loading={deciding === r.id} disabled={!!deciding} onClick={() => decide(r, true)}>
                      Admit
                    </Button>
                  </div>
                </m.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </Card>
  )
}
