'use client'
import { useState, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Task, Progress } from '@/lib/types'
import { getShowsAs, getDaysUntil, getProgressColor } from '@/lib/showsAs'
import NotesPanel from './NotesPanel'

const PROGRESS_OPTIONS: Progress[] = ['0%', '20%', '50%', '70%', '100%']

const SECTIONS = [
  { id: 'todays-tasks', name: "Today's Tasks" },
  { id: 'asap', name: 'ASAP' },
  { id: 'math', name: 'Math' },
  { id: 'english', name: 'English' },
  { id: 'chinese', name: 'Chinese' },
  { id: 'economics', name: 'Economics' },
  { id: 'bm', name: 'Business Management' },
  { id: 'biology', name: 'Biology' },
  { id: 'tok', name: 'TOK' },
  { id: 'ee', name: 'EE' },
  { id: 'cas', name: 'CAS' },
  { id: 'sat', name: 'SAT' },
  { id: 'lirae', name: 'Lirae' },
  { id: 'competition-1', name: 'Competition 1' },
  { id: 'competition-2', name: 'Competition 2' },
  { id: 'competition-3', name: 'Competition 3' },
  { id: 'other-activities', name: 'Other Activities' },
  { id: 'common-app', name: 'Common App' },
  { id: 'essays', name: 'Essays' },
  { id: 'others', name: 'Others' },
]

const PROGRESS_STYLES: Record<Progress, { bg: string; text: string }> = {
  '0%':   { bg: 'var(--morandi-pink)',  text: 'var(--morandi-pink-text)' },
  '20%':  { bg: 'var(--morandi-sand)',  text: 'var(--morandi-sand-text)' },
  '50%':  { bg: 'var(--morandi-blue)',  text: 'var(--morandi-blue-text)' },
  '70%':  { bg: 'var(--morandi-mauve)', text: 'var(--morandi-mauve-text)' },
  '100%': { bg: 'var(--morandi-sage)',  text: 'var(--morandi-sage-text)' },
}

interface TaskRowProps {
  task: Task
  onUpdate: (id: string, updates: Partial<Task>) => void
  onArchive: (id: string) => void
  onMove: (id: string, sectionId: string) => void
  currentSectionId: string
}

export default function TaskRow({ task, onUpdate, onArchive, onMove, currentSectionId }: TaskRowProps) {
  const [showNotes, setShowNotes] = useState(false)
  const [showMove, setShowMove] = useState(false)
  const [showReminder, setShowReminder] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  const days = getDaysUntil(task.due_date)
  const showsAs = getShowsAs(task.due_date)
  const reminderThreshold = task.reminder_days ?? 2
  const isUrgent = days !== null && days >= 0 && days <= reminderThreshold
  const hasNotes = !!(task.notes || (task.checklist && task.checklist.length > 0))
  const progressStyle = PROGRESS_STYLES[task.progress] || PROGRESS_STYLES['0%']

  const rowBg = isUrgent ? 'var(--urgent-today-bg)' : undefined

  // ===== MOBILE =====
  if (isMobile) {
    return (
      <>
        <div ref={setNodeRef} style={{ ...style, background: rowBg }} className="px-3 py-3 border-b" style2={{ borderColor: 'var(--divider)' }}>
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => onArchive(task.id)}
              className="w-6 h-6 rounded-full border-2 flex-shrink-0 transition-colors"
              style={{ borderColor: 'var(--morandi-pink-text)' }} />
            <input value={task.task} onChange={e => onUpdate(task.id, { task: e.target.value })}
              placeholder="Task..." className="flex-1 bg-transparent text-base outline-none min-w-0"
              style={{ color: 'var(--text-primary)' }} />
          </div>
          <div className="flex items-center gap-2 pl-9">
            <input type="date" value={task.due_date || ''} onChange={e => onUpdate(task.id, { due_date: e.target.value || null })}
              className="text-xs bg-transparent outline-none flex-shrink-0" style={{ color: 'var(--text-secondary)' }} />
            <span className="text-xs italic flex-shrink-0" style={{ color: isUrgent ? 'var(--urgent-today-text)' : 'var(--morandi-sand-text)' }}>
              {showsAs}
            </span>
            <select value={task.progress} onChange={e => onUpdate(task.id, { progress: e.target.value as Progress })}
              className="text-xs px-2 py-1 rounded-full border-0 outline-none cursor-pointer flex-shrink-0"
              style={{ background: progressStyle.bg, color: progressStyle.text }}>
              {PROGRESS_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <div className="flex items-center gap-2 ml-auto">
              <button onClick={() => setShowNotes(s => !s)}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: hasNotes ? 'var(--morandi-pink-text)' : 'var(--text-muted)' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              </button>
              <div className="relative">
                <button onClick={() => setShowMove(s => !s)} className="text-pink-300 p-1.5 rounded-lg"
                  style={{ color: 'var(--text-muted)' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/>
                    <line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/>
                  </svg>
                </button>
                {showMove && (
                  <div className="absolute right-0 top-8 rounded-xl shadow-xl border w-48 z-50 max-h-48 overflow-y-auto"
                    style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
                    <p className="text-xs font-medium px-3 pt-2 pb-1" style={{ color: 'var(--morandi-pink-text)' }}>Move to...</p>
                    {SECTIONS.filter(s => s.id !== currentSectionId).map(s => (
                      <button key={s.id} onClick={() => { onMove(task.id, s.id); setShowMove(false) }}
                        className="w-full text-left px-3 py-2 text-sm transition-colors hover:bg-pink-50"
                        style={{ color: 'var(--text-primary)' }}>{s.name}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        {showNotes && <NotesPanel task={task} onUpdate={onUpdate} onClose={() => setShowNotes(false)} />}
      </>
    )
  }

  // ===== DESKTOP =====
  return (
    <>
      <div ref={setNodeRef} style={{ ...style, background: rowBg }}
        className="flex items-center gap-2 px-3 py-2 border-b group transition-colors hover:bg-pink-50/20"
        style2={{ borderColor: 'var(--divider)' }}>
        {/* Drag handle */}
        <button {...attributes} {...listeners}
          className="drag-handle flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: 'var(--text-muted)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="7" r="1.5"/><circle cx="15" cy="7" r="1.5"/>
            <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
            <circle cx="9" cy="17" r="1.5"/><circle cx="15" cy="17" r="1.5"/>
          </svg>
        </button>

        {/* Check */}
        <button onClick={() => onArchive(task.id)}
          className="w-4 h-4 rounded-full border flex-shrink-0 transition-colors hover:bg-pink-50"
          style={{ borderColor: 'var(--morandi-pink-text)' }} />

        {/* Task name */}
        <input value={task.task} onChange={e => onUpdate(task.id, { task: e.target.value })}
          placeholder="Task..." className="flex-1 bg-transparent text-sm outline-none min-w-0"
          style={{ color: 'var(--text-primary)' }} />

        {/* Due date */}
        <input type="date" value={task.due_date || ''} onChange={e => onUpdate(task.id, { due_date: e.target.value || null })}
          className="text-xs bg-transparent outline-none w-28 flex-shrink-0"
          style={{ color: 'var(--text-secondary)' }} />

        {/* Shows As */}
        <span className="text-xs italic w-20 flex-shrink-0"
          style={{ color: isUrgent ? 'var(--urgent-today-text)' : 'var(--morandi-sand-text)' }}>
          {showsAs}
        </span>

        {/* Progress */}
        <select value={task.progress} onChange={e => onUpdate(task.id, { progress: e.target.value as Progress })}
          className="text-xs px-2 py-1 rounded-full border-0 outline-none cursor-pointer flex-shrink-0 w-20"
          style={{ background: progressStyle.bg, color: progressStyle.text }}>
          {PROGRESS_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Reminder */}
          <div className="relative">
            <button onClick={() => setShowReminder(s => !s)}
              className="p-1 transition-colors"
              style={{ color: task.reminder_days != null ? 'var(--morandi-pink-text)' : 'var(--text-muted)', opacity: task.reminder_days != null ? 1 : 0, }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = task.reminder_days != null ? '1' : '0'}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </button>
            {showReminder && (
              <div className="absolute right-0 top-6 rounded-xl shadow-xl border p-3 z-50 w-48"
                style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--morandi-pink-text)' }}>Remind me when...</p>
                <div className="flex items-center gap-2">
                  <input type="number" min="1" max="60" value={task.reminder_days ?? ''}
                    placeholder="2"
                    onChange={e => onUpdate(task.id, { reminder_days: e.target.value === '' ? null : parseInt(e.target.value) })}
                    className="w-14 text-sm px-2 py-1 rounded-lg outline-none"
                    style={{ border: '0.5px solid var(--card-border)', color: 'var(--text-primary)' }} />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>days before</span>
                </div>
                <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>Default: 2 days</p>
                <button onClick={() => setShowReminder(false)}
                  className="mt-2 w-full text-xs py-1 rounded-lg text-white" style={{ background: 'var(--morandi-pink-text)' }}>Done</button>
              </div>
            )}
          </div>

          {/* Notes */}
          <button onClick={() => setShowNotes(s => !s)}
            className="p-1 transition-colors"
            style={{ color: hasNotes ? 'var(--morandi-pink-text)' : 'var(--text-muted)', opacity: hasNotes ? 1 : 0 }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = hasNotes ? '1' : '0'}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </button>

          {/* Move */}
          <div className="relative">
            <button onClick={() => setShowMove(s => !s)}
              className="p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: 'var(--text-muted)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/>
                <line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/>
              </svg>
            </button>
            {showMove && (
              <div className="absolute right-0 top-6 rounded-xl shadow-xl border w-48 z-50 max-h-48 overflow-y-auto"
                style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
                <p className="text-xs font-medium px-3 pt-2 pb-1" style={{ color: 'var(--morandi-pink-text)' }}>Move to...</p>
                {SECTIONS.filter(s => s.id !== currentSectionId).map(s => (
                  <button key={s.id} onClick={() => { onMove(task.id, s.id); setShowMove(false) }}
                    className="w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-pink-50"
                    style={{ color: 'var(--text-primary)' }}>{s.name}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {showNotes && <NotesPanel task={task} onUpdate={onUpdate} onClose={() => setShowNotes(false)} />}
    </>
  )
}
