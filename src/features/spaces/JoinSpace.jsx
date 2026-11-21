import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { m } from 'motion/react'
import { ArrowRight, Clock3, DoorOpen, Link2, XCircle } from 'lucide-react'
import { Page, PageHeader } from '../../ui/Page'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Display'
import { Field, Input } from '../../ui/Form'
import { useToast } from '../../ui/Toast'
import { useAuth } from '../../hooks/auth'
import { cancelJoin, joinStatus, requestJoin } from '../../services/spaces'
import { readSession, writeSession } from '../../lib/storage'

const PENDING_INVITE_KEY = 'manalife-meet-invite'

/** Ask to join a space with a link or code, then wait for the owner to admit you (V1 flow). */
export default function JoinSpace() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const toast = useToast()
  const [code, setCode] = useState(() => readSession(PENDING_INVITE_KEY) || '')
  const [status, setStatus] = useState('') // '' | pending | rejected
  const [roomName, setRoomName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fromLink = useRef(Boolean(readSession(PENDING_INVITE_KEY)))

  async function enter(roomId) {
    writeSession(PENDING_INVITE_KEY, null)
    await qc.invalidateQueries({ queryKey: ['spaces', user.id] })
    await qc.refetchQueries({ queryKey: ['spaces', user.id] })
    toast.success("You're in!")
    navigate(`/space/${roomId}`, { replace: true })
  }

  async function ask(e) {
    e?.preventDefault()
    if (!code.trim()) return setError('Paste the code or link you received')
    const token = extractToken(code)
    setBusy(true)
    setError('')
    try {
      const data = await requestJoin(token)
      setRoomName(data?.room_name || '')
      if (data?.status === 'approved' && data.room_id) await enter(data.room_id)
      else setStatus(data?.status || 'pending')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  // Auto-request when arriving from an invite link (same as V1).
  useEffect(() => {
    if (fromLink.current && code) {
      fromLink.current = false
      ask()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (status !== 'pending') return undefined
    let live = true
    const poll = async () => {
      try {
        const data = await joinStatus(extractToken(code))
        if (!live) return
        if (data?.status === 'approved' && data.room_id) enter(data.room_id)
        else if (data?.status === 'rejected') setStatus('rejected')
      } catch (err) {
        if (live) setError(err.message)
      }
    }
    const timer = window.setInterval(poll, 5000)
    const onFocus = () => document.visibilityState === 'visible' && poll()
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      live = false
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onFocus)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, code])

  async function cancel() {
    if (status === 'pending') {
      try {
        await cancelJoin(extractToken(code))
      } catch (err) {
        return toast.error(err.message)
      }
    }
    writeSession(PENDING_INVITE_KEY, null)
    navigate('/', { replace: true })
  }

  return (
    <Page className="page-narrow">
      <PageHeader eyebrow="Join" title="Join a space" description="Use the link or code someone shared with you. The owner admits you before you can see anything." />
      <Card className="join-card">
        {status === 'pending' ? (
          <m.div className="join-wait" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
            <span className="join-pulse">
              <Clock3 size={26} />
            </span>
            <h2>Waiting for the owner…</h2>
            <p className="muted">{roomName ? `You asked to join ${roomName}.` : 'Your request was sent.'} You'll go straight in once they tap Admit.</p>
            <div className="row-wrap" style={{ justifyContent: 'center' }}>
              <Button variant="secondary" icon={DoorOpen} onClick={cancel}>
                Leave waiting room
              </Button>
            </div>
          </m.div>
        ) : status === 'rejected' ? (
          <div className="join-wait">
            <span className="join-pulse is-danger">
              <XCircle size={26} />
            </span>
            <h2>Request declined</h2>
            <p className="muted">The owner didn't admit this request. Ask them for a new invitation if this was a mistake.</p>
            <Button variant="secondary" onClick={cancel}>
              Back home
            </Button>
          </div>
        ) : (
          <form className="form" onSubmit={ask}>
            <Field label="Invite link or code" error={error}>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Paste the link or code" autoComplete="off" spellCheck={false} autoFocus />
            </Field>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={cancel}>
                Cancel
              </Button>
              <Button type="submit" iconRight={ArrowRight} loading={busy}>
                Ask to join
              </Button>
            </div>
          </form>
        )}
        {error && status === 'pending' && <p className="field-error">{error}</p>}
      </Card>
      <p className="field-hint" style={{ textAlign: 'center', marginTop: 16, display: 'flex', gap: 6, justifyContent: 'center' }}>
        <Link2 size={14} /> Links look like …/#join=… — you can paste the whole link.
      </p>
    </Page>
  )
}

/** Accept a full invite URL, a "#join=" fragment, or a bare code/token. */
export function extractToken(input) {
  const v = input.trim()
  const m = v.match(/[#?&]join=([^&\s]+)/)
  return m ? decodeURIComponent(m[1]) : v
}
