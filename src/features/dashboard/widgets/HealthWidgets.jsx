import { useMemo } from 'react'
import { Lock } from 'lucide-react'
import { useSpace } from '../../../app/SpaceContext'
import { useDoseLogs, useMedicines, usePeriods, useSharedPeriods } from '../../../hooks/data'
import { Badge, CheckCircle, ProgressRing } from '../../../ui/Display'
import { cycleStats, dosesFor } from '../../../services/health'
import { dateLabel, timeLabel } from '../../../lib/dates'
import { shortName } from '../../../lib/format'
import { useMedicineActions } from '../../medicines/medicineActions'
import { WidgetCard, WidgetEmpty, WidgetLoading } from './WidgetCard'

export function MedicinesWidget({ size, today }) {
  const { basePath, title, icon, userId } = useSpace()
  const meds = useMedicines(userId)
  const logs = useDoseLogs(userId, today)
  const { dose } = useMedicineActions(today)
  const doses = useMemo(() => dosesFor(meds.data || [], today), [meds.data, today])
  const status = (d) => (logs.data || []).find((l) => l.medication_id === d.medicine.id && String(l.dose_time).slice(0, 5) === d.time)?.status
  const taken = doses.filter((d) => status(d) === 'taken').length

  return (
    <WidgetCard to={`${basePath}/medicines`} title={title('medicines')} icon={icon('medicines')} size={size} aside={doses.length ? <Badge tone={taken === doses.length ? 'success' : 'neutral'}>{taken}/{doses.length} taken</Badge> : <Lock size={14} className="subtle" />}>
      {meds.isLoading ? (
        <WidgetLoading />
      ) : doses.length === 0 ? (
        <WidgetEmpty>No doses scheduled today.</WidgetEmpty>
      ) : (
        <div className="list list-compact">
          {doses.slice(0, 5).map((d) => {
            const st = status(d)
            return (
              <div key={`${d.medicine.id}-${d.time}`} className={`list-row ${st === 'taken' ? 'is-done' : ''}`}>
                <CheckCircle tone="success" checked={st === 'taken'} onChange={(v) => dose.mutate({ medicine: d.medicine, time: d.time, status: v ? 'taken' : null })} label={`${d.medicine.name} at ${timeLabel(d.time)}`} size={22} />
                <div className="list-row-main">
                  <span className="list-row-title">{d.medicine.name}</span>
                  <span className="list-row-meta">
                    <span>{timeLabel(d.time)}</span>
                    {d.medicine.dose_label && <span>{d.medicine.dose_label}</span>}
                    {st === 'skipped' && <span>Skipped</span>}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </WidgetCard>
  )
}

/** Own cycle in My Space; in couple/family spaces, the partner's shared (read-only) cycle. */
export function CycleWidget({ size, today }) {
  const { space, basePath, title, icon, userId, sharedCycleOwners, nameOf } = useSpace()
  const own = usePeriods(space.isPersonal ? userId : null)
  const ownerId = space.isPersonal ? null : sharedCycleOwners[0]
  const shared = useSharedPeriods(ownerId)
  const entries = space.isPersonal ? own.data : shared.data
  const loading = space.isPersonal ? own.isLoading : shared.isLoading
  const s = useMemo(() => cycleStats(entries || [], today), [entries, today])
  const label = space.isPersonal ? title('periods') : `${shortName(nameOf(ownerId))}'s cycle`

  return (
    <WidgetCard to={`${basePath}/periods`} title={label} icon={icon('periods')} size={size} aside={<Lock size={14} className="subtle" aria-label="Private" />}>
      {loading ? (
        <WidgetLoading rows={2} />
      ) : !s.latest ? (
        <WidgetEmpty>{space.isPersonal ? 'Log a period to see predictions.' : 'Nothing shared yet.'}</WidgetEmpty>
      ) : (
        <div className="cycle-mini">
          <ProgressRing value={s.averageCycle && s.cycleDay ? Math.min(1, s.cycleDay / s.averageCycle) : 0} size={72} stroke={7}>
            <span className="ring-small">Day</span>
            <span className="ring-big">{s.cycleDay}</span>
          </ProgressRing>
          <div>
            <p className="eyebrow">Next period</p>
            <h4>{s.nextExpected ? dateLabel(s.nextExpected, { weekday: 'short', day: 'numeric', month: 'short' }) : 'Need 2 logs'}</h4>
            <p className="subtle">{s.daysUntil != null ? (s.daysUntil > 0 ? `in ${s.daysUntil} days · estimate` : s.daysUntil === 0 ? 'expected today' : `${-s.daysUntil} days late · estimate`) : 'Estimates improve over time'}</p>
          </div>
        </div>
      )}
    </WidgetCard>
  )
}
