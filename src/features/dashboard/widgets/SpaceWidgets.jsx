import { Link } from 'react-router-dom'
import { Crown, FileText, UserPlus, UsersRound } from 'lucide-react'
import { useSpace } from '../../../app/SpaceContext'
import { useDocsAvailable, useDocuments } from '../../../hooks/data'
import { Avatar, Badge } from '../../../ui/Display'
import { Button } from '../../../ui/Button'
import { dateLabel, diffDays } from '../../../lib/dates'
import { WidgetCard, WidgetEmpty, WidgetLoading } from './WidgetCard'

export function DocumentsWidget({ size, today }) {
  const { space, basePath, title, icon } = useSpace()
  const ok = useDocsAvailable(space)
  const docs = useDocuments(space, ok.data === true)
  const list = docs.data || []
  const expiring = list.filter((d) => d.expires_on && diffDays(today, d.expires_on) <= 30).sort((a, b) => a.expires_on.localeCompare(b.expires_on))

  return (
    <WidgetCard to={`${basePath}/documents`} title={title('documents')} icon={icon('documents')} size={size} aside={list.length ? <Badge>{list.length} files</Badge> : null}>
      {ok.isLoading || docs.isLoading ? (
        <WidgetLoading rows={2} />
      ) : ok.data === false ? (
        <WidgetEmpty>Needs a one-time database update.</WidgetEmpty>
      ) : expiring.length ? (
        <div className="list list-compact">
          {expiring.slice(0, 3).map((d) => (
            <div key={d.id} className="list-row">
              <span className="file-icon" aria-hidden>
                <FileText size={15} />
              </span>
              <div className="list-row-main">
                <span className="list-row-title">{d.title}</span>
                <span className="list-row-meta">
                  <span className={d.expires_on < today ? 'is-overdue' : 'is-warn'}>{d.expires_on < today ? 'Expired' : 'Expires'} {dateLabel(d.expires_on)}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <WidgetEmpty>{list.length ? 'Nothing expiring soon.' : 'Keep IDs, policies and records safe here.'}</WidgetEmpty>
      )}
    </WidgetCard>
  )
}

export function MembersWidget({ size }) {
  const { space, basePath, members, userId } = useSpace()
  return (
    <WidgetCard to={`${basePath}/settings`} title="People" icon={UsersRound} size={size} aside={<Badge>{members.length}</Badge>}>
      {members.length === 0 ? (
        <WidgetLoading rows={2} />
      ) : (
        <div className="people-list">
          {members.slice(0, 5).map((p) => (
            <div key={p.id} className="person">
              <Avatar id={p.id} name={p.display_name} size={30} />
              <span className="truncate">{p.id === userId ? `${p.display_name} (you)` : p.display_name}</span>
              {p.role === 'owner' && <Crown size={13} className="owner-crown" aria-label="Owner" />}
            </div>
          ))}
          {members.length > 5 && <p className="widget-more">+{members.length - 5} more</p>}
        </div>
      )}
      {space.isOwner && (
        <Button as={Link} to={`${basePath}/settings#invite`} variant="soft" size="sm" icon={UserPlus} full>
          Invite people
        </Button>
      )}
    </WidgetCard>
  )
}
