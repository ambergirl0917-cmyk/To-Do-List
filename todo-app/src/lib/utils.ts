import { differenceInDays, format, isToday, isTomorrow } from 'date-fns'

export function getShowsAs(dateStr: string | null): string {
  if (!dateStr) return ''
  const date = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = differenceInDays(date, today)
  if (diff < 0) return 'Overdue'
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff <= 7) return format(date, 'EEEE')
  if (diff <= 14) return 'Next ' + format(date, 'EEEE')
  return format(date, 'MM/dd/yyyy')
}

export function getUrgencyColor(dateStr: string | null, reminderDays: number | null = null): 'red' | 'orange' | null {
  if (!dateStr) return null
  const date = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = differenceInDays(date, today)
  const redThreshold = reminderDays ?? 2
  const orangeThreshold = reminderDays ? reminderDays + 5 : 7
  if (diff >= 0 && diff <= redThreshold) return 'red'
  if (diff > redThreshold && diff <= orangeThreshold) return 'orange'
  return null
}
