import { memo } from 'react'
import { m } from 'motion/react'
import { CalendarDays, Clock3, Pencil, Repeat2, Trash2, UserRound } from 'lucide-react'
import { CheckCircle } from '../../ui/Display'
import { Menu } from '../../ui/Menu'
import { relativeDay, timeLabel } from '../../lib/dates'
import { shortName } from '../../lib/format'
import { REPEAT_LABEL } from './taskActions'
import { listItem } from '../../motion'

export const TaskRow = memo(function TaskRow({ task, done, today, nameOf, onToggle, onEdit, onDelete, compact = false, showDate = true, overdue = false }) {
  const who = task.assigned_to ? nameOf?.(task.assigned_to) : null
  const recurring = task.repeat && task.repeat !== 'none'
  return (
    <m.div layout="position" className={`list-row task-row ${done ? 'is-done' : ''}`} {...listItem}>
      <CheckCircle checked={done} onChange={onToggle} label={done ? `Mark “${task.title}” not done` : `Mark “${task.title}” done`} />
      <div className="list-row-main" onClick={onEdit} role={onEdit ? 'button' : undefined} tabIndex={onEdit ? 0 : undefined} onKeyDown={(e) => onEdit && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onEdit())}>
        <span className="list-row-title">{task.title}</span>
        <span className="list-row-meta">
          {showDate && (
            <span className={overdue && !done ? 'is-overdue' : ''}>
              <CalendarDays size={12} />
              {recurring ? REPEAT_LABEL[task.repeat] : relativeDay(task.due_on, today)}
            </span>
          )}
          {task.time && (
            <span>
              <Clock3 size={12} />
              {timeLabel(task.time)}
            </span>
          )}
          {recurring && showDate === false && (
            <span>
              <Repeat2 size={12} />
              {REPEAT_LABEL[task.repeat]}
            </span>
          )}
          {who && (
            <span>
              <UserRound size={12} />
              {shortName(who)}
            </span>
          )}
          {!compact && task.category && <span>{task.category}</span>}
        </span>
      </div>
      {task.priority === 'high' && <span className="prio prio-high" title="High priority" aria-label="High priority" />}
      {!compact && (onEdit || onDelete) && (
        <div className="list-row-actions reveal">
          <Menu
            label={`Actions for ${task.title}`}
            items={[onEdit && { label: 'Edit', icon: Pencil, onClick: onEdit }, onDelete && { label: 'Delete', icon: Trash2, tone: 'danger', onClick: onDelete }]}
          />
        </div>
      )}
    </m.div>
  )
})
