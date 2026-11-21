import { useState } from 'react'
import { Eye, Flower2, ShieldCheck } from 'lucide-react'
import { useSpace } from '../../app/SpaceContext'
import { keys, useAction, useMyShares } from '../../hooks/data'
import { grantShare, revokeShare } from '../../services/health'
import { Button } from '../../ui/Button'
import { Avatar, Card, CardHeader } from '../../ui/Display'
import { Select } from '../../ui/Form'
import { useConfirm } from '../../ui/Confirm'
import { useWorkspace } from '../../hooks/workspace'

/**
 * Read-only, revocable sharing of your own cycle data with one member of a couple/family space.
 * Same rules as V1: private by default; the viewer can never add, edit or delete.
 */
export function CycleSharePanel() {
  const { space, userId, members } = useSpace()
  const shares = useMyShares(space, userId)
  const confirm = useConfirm()
  const { v2 } = useWorkspace()
  const [viewer, setViewer] = useState('')
  const key = keys.shares(space.id, userId)
  const grant = useAction((id) => grantShare(space.id, userId, id), { invalidate: [key], success: 'View access granted', onSuccess: () => setViewer('') })
  const revoke = useAction((id) => revokeShare(space.id, userId, id), { invalidate: [key], success: 'Access revoked' })
  const others = members.filter((p) => p.id !== userId)
  const list = shares.data || []
  const available = others.filter((p) => !list.some((s) => s.viewer_id === p.id))

  return (
    <Card className="settings-card">
      <CardHeader icon={Flower2} title="Share my cycle tracker" subtitle="Private by default. Give one person read-only access in this space." />
      {list.length > 0 && (
        <div className="list" style={{ marginBottom: 12 }}>
          {list.map((s) => {
            const p = members.find((x) => x.id === s.viewer_id)
            return (
              <div key={s.id} className="list-row">
                <Avatar id={s.viewer_id} name={p?.display_name || 'Member'} size={32} />
                <div className="list-row-main">
                  <span className="list-row-title">{p?.display_name || 'Former member'}</span>
                  <span className="list-row-meta">
                    <span>
                      <Eye size={12} /> Can view, can't edit
                    </span>
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="danger-soft"
                  loading={revoke.isPending && revoke.variables === s.id}
                  onClick={async () => {
                    if (await confirm({ title: 'Stop sharing?', body: `${p?.display_name || 'This person'} will immediately lose access to your cycle data.`, confirmLabel: 'Revoke access', tone: 'danger' })) revoke.mutate(s.id)
                  }}
                >
                  Revoke
                </Button>
              </div>
            )
          })}
        </div>
      )}
      {others.length === 0 ? (
        <p className="subtle">Invite your partner to this space first.</p>
      ) : available.length > 0 ? (
        <div className="inline-add">
          <Select value={viewer} onChange={(e) => setViewer(e.target.value)} aria-label="Choose a person">
            <option value="">Choose a person…</option>
            {available.map((p) => (
              <option key={p.id} value={p.id}>
                {p.display_name}
              </option>
            ))}
          </Select>
          <Button disabled={!viewer} loading={grant.isPending} onClick={() => grant.mutate(viewer)}>
            Give view access
          </Button>
        </div>
      ) : null}
      <p className="field-hint" style={{ marginTop: 10, display: 'flex', gap: 6 }}>
        <ShieldCheck size={14} />
        {v2 ? 'Access ends automatically if either of you leaves this space.' : 'Revoke access here before removing someone from this space.'}
      </p>
    </Card>
  )
}
