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
  const rowBg = isUrgent ? 'bg-red-50 border-l-2 border-red-300' : ''

  const hasNotes = !!(task.notes || (task.checklist && task.checklist.length > 0))

  const handleCheck = () => { onArchive(task.id) }

  if (isMobile) {
    return (
      <>
        <div
          ref={setNodeRef}
          style={style}
          className={`px-3 py-3 border-b border-pink-50 ${rowBg}`}
        >
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={handleCheck}
              className="w-6 h-6 rounded-full border-2 border-pink-300 hover:border-pink-500 hover:bg-pink-100 flex-shrink-0 transition-colors"
            />
            <input
              value={task.task}
              onChange={e => onUpdate(task.id, { task: e.target.value })}
              placeholder="Task..."
              className="flex-1 bg-transparent text-base text-gray-700 outline-none placeholder-pink-200 min-w-0"
            />
          </div>

          <div className="flex items-center gap-2 pl-9">
            <input
              type="date"
              value={task.due_date || ''}
              onChange={e => onUpdate(task.id, { due_date: e.target.value || null })}
              className="text-xs text-gray-500 bg-transparent outline-none flex-shrink-0"
            />
            <span className={`text-xs italic flex-shrink-0 ${isUrgent ? 'text-red-500 font-medium' : 'text-amber-600'}`}>
              {showsAs}
            </span>
            <select
              value={task.progress}
              onChange={e => onUpdate(task.id, { progress: e.target.value as Progress })}
              className={`text-xs px-2 py-1 rounded-full border-0 outline-none cursor-pointer flex-shrink-0 ${getProgressColor(task.progress)}`}
            >
              {PROGRESS_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => setShowNotes(s => !s)}
                className={`p-1.5 rounded-lg transition-colors ${hasNotes ? 'text-pink-500' : 'text-pink-300'}`}
                title="Notes"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              </button>

              <div className="relative">
                <button onClick={() => setShowMove(s => !s)} className="text-pink-300 p-1.5 rounded-lg" title="Move to...">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/>
                  </svg>
                </button>
                {showMove && (
                  <div className="absolute right-0 top-8 bg-white rounded-xl shadow-xl border border-pink-100 w-48 z-50 max-h-48 overflow-y-auto">
                    <p className="text-xs font-semibold text-pink-500 px-3 pt-2 pb-1">Move to...</p>
                    {SECTIONS.filter(s => s.id !== currentSectionId).map(s => (
                      <button
                        key={s.id}
                        onClick={() => { onMove(task.id, s.id); setShowMove(false) }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-pink-50 transition-colors"
                      >{s.name}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        {showNotes && (
          <NotesPanel task={task} onUpdate={onUpdate} onClose={() => setShowNotes(false)} />
        )}
      </>
    )
  }

  // Desktop layout
  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`flex items-center gap-2 px-3 py-2 border-b border-pink-50 hover:bg-pink-50/50 group transition-colors ${rowBg}`}
      >
        <button {...attributes} {...listeners} className="drag-handle text-pink-200 hover:text-pink-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="7" r="1.5"/><circle cx="15" cy="7" r="1.5"/>
            <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
            <circle cx="9" cy="17" r="1.5"/><circle cx="15" cy="17" r="1.5"/>
          </svg>
        </button>

        <button onClick={handleCheck} className="w-4 h-4 rounded-full border border-pink-300 hover:border-pink-500 hover:bg-pink-100 flex-shrink-0 transition-colors" />

        <input
          value={task.task}
          onChange={e => onUpdate(task.id, { task: e.target.value })}
          placeholder="Task..."
          className="flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder-pink-200 min-w-0"
        />

        <input
          type="date"
          value={task.due_date || ''}
          onChange={e => onUpdate(task.id, { due_date: e.target.value || null })}
          className="text-xs text-gray-500 bg-transparent outline-none w-28 flex-shrink-0"
        />

        <span className={`text-xs italic w-20 flex-shrink-0 ${isUrgent ? 'text-red-500 font-medium' : 'text-amber-600'}`}>
          {showsAs}
        </span>

        <select
          value={task.progress}
          onChange={e => onUpdate(task.id, { progress: e.target.value as Progress })}
          className={`text-xs px-2 py-1 rounded-full border-0 outline-none cursor-pointer flex-shrink-0 ${getProgressColor(task.progress)}`}
        >
          {PROGRESS_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <div className="flex items-center gap-1 flex-shrink-0">
          <div className="relative">
            <button
              onClick={() => setShowReminder(s => !s)}
              className={`p-1 transition-colors ${task.reminder_days != null ? 'text-pink-500' : 'text-pink-300 hover:text-pink-500 opacity-0 group-hover:opacity-100'}`}
              title={task.reminder_days != null ? `Remind ${task.reminder_days} days before` : 'Set reminder'}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </button>
            {showReminder && (
              <div className="absolute right-0 top-6 bg-white rounded-xl shadow-xl border border-pink-100 p-3 z-50 w-48">
                <p className="text-xs font-semibold text-pink-500 mb-2">⏰ Remind me when...</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={task.reminder_days ?? ''}
                    placeholder="2"
                    onChange={e => {
                      const val = e.target.value === '' ? null : parseInt(e.target.value)
                      onUpdate(task.id, { reminder_days: val })
                    }}
                    className="w-14 text-sm border border-pink-200 rounded-lg px-2 py-1 outline-none focus:border-pink-400"
                  />
                  <span className="text-xs text-gray-500">days before due</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">Leave empty for default (2 days)</p>
                <button
                  onClick={() => setShowReminder(false)}
                  className="mt-2 w-full text-xs bg-pink-500 text-white rounded-lg py-1 hover:bg-pink-600 transition-colors"
                >Done</button>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowNotes(s => !s)}
            className={`p-1 transition-colors ${hasNotes ? 'text-pink-500' : 'text-pink-300 hover:text-pink-500 opacity-0 group-hover:opacity-100'}`}
            title="Notes"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </button>

          <div className="relative">
            <button onClick={() => setShowMove(s => !s)} className="text-pink-300 hover:text-pink-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity" title="Move to...">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/>
              </svg>
            </button>
            {showMove && (
              <div className="absolute right-0 top-6 bg-white rounded-xl shadow-xl border border-pink-100 w-48 z-50 animate-slideIn max-h-48 overflow-y-auto">
                <p className="text-xs font-semibold text-pink-500 px-3 pt-2 pb-1">Move to...</p>
                {SECTIONS.filter(s => s.id !== currentSectionId).map(s => (
                  <button
                    key={s.id}
                    onClick={() => { onMove(task.id, s.id); setShowMove(false) }}
                    className="w-full text-left px-3 py-1.5 text-xs text-gray-600 hover:bg-pink-50 transition-colors"
                  >{s.name}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {showNotes && (
        <NotesPanel task={task} onUpdate={onUpdate} onClose={() => setShowNotes(false)} />
      )}
    </>
  )
}
