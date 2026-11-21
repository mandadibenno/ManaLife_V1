import { useSpace } from '../../app/SpaceContext'
import { keys, useAction } from '../../hooks/data'
import { deleteMedicine, saveMedicine, setDose } from '../../services/health'

export function useMedicineActions(date) {
  const { userId } = useSpace()
  const dayKey = keys.doses(userId, date, date)
  const dose = useAction(({ medicine, time, status }) => setDose(userId, medicine.id, date, time, status), {
    invalidate: [['doses', userId], keys.recentDoses(userId)],
    optimistic: {
      key: dayKey,
      update: (old, { medicine, time, status }) => {
        const rest = (old || []).filter((l) => !(l.medication_id === medicine.id && String(l.dose_time).slice(0, 5) === time))
        return status ? [...rest, { medication_id: medicine.id, dose_date: date, dose_time: time, status }] : rest
      },
    },
  })
  const save = useAction(({ form, id }) => saveMedicine(userId, form, id), { invalidate: [keys.medicines(userId)], success: (_d, { id }) => (id ? 'Medicine updated' : 'Medicine added') })
  const remove = useAction((id) => deleteMedicine(userId, id), { invalidate: [keys.medicines(userId), ['doses', userId], keys.recentDoses(userId)], success: 'Medicine deleted' })
  return { dose, save, remove }
}
