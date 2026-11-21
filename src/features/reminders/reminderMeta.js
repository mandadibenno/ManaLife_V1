import { CalendarDays, FileWarning, ListChecks, Pill, ReceiptText, Repeat2, ShoppingBag } from 'lucide-react'

export const REMINDER_ICONS = {
  task: ListChecks,
  bill: ReceiptText,
  event: CalendarDays,
  dose: Pill,
  refill: ShoppingBag,
  document: FileWarning,
  habit: Repeat2,
}

export const REMINDER_LABELS = {
  task: 'Task',
  bill: 'Bill',
  event: 'Event',
  dose: 'Medicine',
  refill: 'Refill',
  document: 'Document',
  habit: 'Habit',
}
