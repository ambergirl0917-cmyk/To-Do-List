export type Progress = '0%' | '20%' | '50%' | '70%' | '100%'

export interface Task {
  id: string
  user_id: string
  section_id: string
  task: string
  notes: string
  due_date: string | null
  progress: Progress
  position: number
  subject_tag: string | null
  reminder_days: number | null
  is_recurring: boolean
  recur_interval: string | null
  is_archived: boolean
  checklist: ChecklistItem[]
  created_at: string
  updated_at: string
}

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

export interface Section {
  id: string
  user_id: string
  name: string
  page: string
  position: number
  color: string | null
  parent_id: string | null
}

export interface WeeklySlot {
  id: string
  user_id: string
  date: string
  title: string
  category: string
  color: string
  duration_minutes: number
  block_type: string
  quantity: number | null
  checklist: ChecklistItem[]
  is_done: boolean
  position: number
}

export interface Deadline {
  id: string
  user_id: string
  subject: string
  task: string
  due_date: string | null
  priority: 'High' | 'Medium' | 'Low'
  status: 'Not Started' | 'In Progress' | 'Done'
  position: number
  reminder_days: number | null
}
