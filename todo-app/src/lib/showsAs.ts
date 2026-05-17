import { format, differenceInDays, isToday, isTomorrow, isPast } from 'date-fns'

export function getShowsAs(dateStr: string | null): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  // Use local date comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diff = differenceInDays(target, today)

  if (diff < 0) return 'Overdue'
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff <= 7) return format(date, 'EEEE') // e.g. "Monday"
  if (diff <= 14) return 'Next ' + format(date, 'EEEE') // e.g. "Next Monday"
  return format(date, 'MM/dd/yyyy')
}

export function getDaysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const date = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return differenceInDays(target, today)
}

export function isUrgent(task: { due_date: string | null, reminder_days: number | null }): boolean {
  if (!task.due_date) return false
  const days = getDaysUntil(task.due_date)
  if (days === null) return false
  const threshold = task.reminder_days ?? 2
  return days >= 0 && days <= threshold
}

export function getRowColor(daysUntil: number | null): string {
  if (daysUntil === null) return ''
  if (daysUntil < 0) return 'bg-red-100'
  if (daysUntil <= 2) return 'bg-red-100'
  return ''
}

export function getProgressColor(progress: string): string {
  switch (progress) {
    case '0%': return 'bg-gray-200 text-gray-600'
    case '20%': return 'bg-orange-100 text-orange-700'
    case '50%': return 'bg-yellow-100 text-yellow-700'
    case '70%': return 'bg-green-100 text-green-700'
    case '100%': return 'bg-green-200 text-green-800'
    default: return 'bg-gray-200 text-gray-600'
  }
}
