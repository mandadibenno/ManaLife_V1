export function isoDate(date = new Date()) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
export function addDays(iso, days) {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate()+days)
  return isoDate(d)
}
export function dateLabel(iso, opts={month:'short',day:'numeric'}) {
  if (!iso) return 'No date'
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-IN',opts)
}
export function fullDate(iso) { return dateLabel(iso,{weekday:'long',month:'long',day:'numeric'}) }
export function money(value) { return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(value)||0) }
export function shortName(text='') { return text.trim().split(/\s+/)[0] || 'You' }
export function isTaskDue(task, date=isoDate()) {
  if (!task.due_on || task.due_on > date) return false
  if (task.repeat === 'none') return true  // overdue one-off tasks remain visible until complete
  if (task.repeat === 'daily') return true
  const anchor = new Date(task.due_on+'T12:00:00'), current = new Date(date+'T12:00:00')
  if (task.repeat === 'weekly') return Math.round((current-anchor)/86400000)%7 === 0
  if (task.repeat === 'monthly') {
    const daysInMonth = new Date(current.getFullYear(),current.getMonth()+1,0).getDate()
    return current.getDate() === Math.min(anchor.getDate(),daysInMonth)
  }
  return false
}
export function taskOccurrence(task, date=isoDate()) { return task.repeat==='none'?task.due_on:date }
export function billOccurrence(bill,date=isoDate()) {
  if (bill.repeat !== 'monthly') return bill.due_on
  const original = new Date(bill.due_on+'T12:00:00')
  const current = new Date(date+'T12:00:00')
  const day = Math.min(original.getDate(),new Date(current.getFullYear(),current.getMonth()+1,0).getDate())
  let due = isoDate(new Date(current.getFullYear(),current.getMonth(),day,12))
  if(due < date) due=isoDate(new Date(current.getFullYear(),current.getMonth()+1,Math.min(original.getDate(),new Date(current.getFullYear(),current.getMonth()+2,0).getDate()),12))
  return due < bill.due_on ? bill.due_on : due
}
export const uid = () => typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`
