import { useSpace } from '../../app/SpaceContext'
import { keys, useAction } from '../../hooks/data'
import { deleteBill, saveBill, setBillPaid } from '../../services/lists'
import { billOccurrence, currentBillCycle, doneKey } from '../../lib/recurrence'
import { addDays } from '../../lib/dates'

export const BILL_CATEGORIES = ['Utilities', 'Rent', 'Internet', 'Subscription', 'Insurance', 'Loan', 'Education', 'Other']

export function useBillActions() {
  const { space, userId } = useSpace()
  const key = keys.bills(space.id)

  const setPaid = useAction(({ bill, occurrence, paid }) => setBillPaid(bill.id, occurrence, paid, userId), {
    invalidate: [key],
    optimistic: {
      key,
      update: (old, { bill, occurrence, paid }) =>
        old && {
          ...old,
          payments: paid
            ? [...old.payments, { bill_id: bill.id, occurrence_on: occurrence, completed_by: userId }]
            : old.payments.filter((p) => !(p.bill_id === bill.id && p.occurrence_on === occurrence)),
        },
    },
  })
  const save = useAction(({ values, id }) => saveBill(space.id, userId, values, id), { invalidate: [key], success: (_d, { id }) => (id ? 'Bill updated' : 'Bill added') })
  const remove = useAction((id) => deleteBill(space.id, id), { invalidate: [key], success: 'Bill deleted' })
  return { setPaid, save, remove }
}

/**
 * State of each bill for display: which occurrence to show, whether it's paid / overdue.
 * A monthly bill shows this month's cycle until it's paid, then moves to next month.
 */
export function billStates(data, today) {
  if (!data) return []
  const paid = new Set(data.payments.map((p) => doneKey(p.bill_id, p.occurrence_on)))
  return data.bills
    .map((bill) => {
      const cycle = currentBillCycle(bill, today)
      const cyclePaid = paid.has(doneKey(bill.id, cycle))
      let occurrence = cycle
      let isPaid = cyclePaid
      if (cyclePaid && bill.repeat === 'monthly') {
        const next = billOccurrence(bill, addDays(cycle, 1))
        if (next !== cycle) {
          occurrence = next
          isPaid = paid.has(doneKey(bill.id, next))
        }
      }
      const lastPaid = cyclePaid ? cycle : null
      return { bill, occurrence, paid: isPaid, overdue: !isPaid && occurrence < today, lastPaid }
    })
    .sort((a, b) => Number(a.paid) - Number(b.paid) || a.occurrence.localeCompare(b.occurrence))
}
