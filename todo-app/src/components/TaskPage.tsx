'use client'
import { useState, useRef } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Task } from './AppShell'
import { getShowsAs, getUrgencyColor } from '@/lib/utils'
import { SUBJECT_COLORS } from './AppShell'
import NotesPanel from './NotesPanel'
import DatePicker from './DatePicker'
import MoveTaskMenu from './MoveTaskMenu'

const PROGRESS_OPTIONS = ['0%', '20%', '50%', '70%', '100%']
const PROGRESS_COLORS: Record<string, string> = {
  '0%': 'prog-0', '20%': 'prog-20', '50%': 'prog-50', '70%': 'prog-70', '100%': 'prog-100'
}

export default function TaskPage({ title, section, color, tasks, updateTask, addTask, archiveTask, deleteTask, moveTask, user }: {
  title: string
  section: string
  color?: string
  tasks: Task[]
  updateTask: (id: string, updates: Partial<Task>) => void
  addTask: (section: string, subsection?: string) => void
  archiveTask: (id: string) => void
  deleteTask: (id: string) => void
  moveTask: (id: string, section: string, subsection?: string) => void
  user: User
}) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [sortBy, setSortBy] = useState<'position' | 'date'>('position')
  const [showMoveMenu, setShowMoveMenu] = useState<string | null>(null)
  const [showDatePicker, setShowDatePicker] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const draggedId = useRef<string | null>(null)

  const sectionTasks = tasks
    .filter(t => t.section === section)
    .sort((a, b) => {
      if (sortBy === 'date') {
        if (!a.due_date && !b.due_date) return a.position - b.position
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return a.due_date.localeCompare(b.due_date)
      }
      return a.position - b.position
    })

  const handleDragStart = (e: React.DragEvent, id: string) => {
    draggedId.current = id
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedId.current || draggedId.current === targetId) return
    const fromIdx = sectionTasks.findIndex(t => t.id === draggedId.current)
    const toIdx = sectionTasks.findIndex(t => t.id === targetId)
    if (fromIdx === -1 || toIdx === -1) return
    const reordered = [...sectionTasks]
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)
    reordered.forEach((t, i) => updateTask(t.id, { position: i }))
    setDragOver(null)
    draggedId.current = null
  }

  return (
    <div className="section-card animate-fade-in">
      {/* Header */}
      <div className="section-header" style={{ background: color ? `${color}40` : undefined }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {color && <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />}
          <span style={{ fontSize: 13, fontWeight: 600, color: '#993556', fontFamily: 'Playfair Display, serif' }}>{title}</span>
          <span style={{ fontSize: 11, color: '#B5476A', background: 'rgba(180,70,106,0.1)', borderRadius: 20, padding: '1px 8px' }}>
            {sectionTasks.length} tasks
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => setSortBy(s => s === 'position' ? 'date' : 'position')}
            style={{ background: 'rgba(180,70,106,0.1)', border: 'none', color: '#993556', borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}
          >
            {sortBy === 'date' ? '↕ Custom' : '📅 Sort by date'}
          </button>
          <button
            onClick={() => addTask(section)}
            style={{ background: 'rgba(180,70,106,0.1)', border: 'none', color: '#993556', borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}
          >
            + Add task
          </button>
        </div>
      </div>

      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr 120px 90px 80px 70px 60px', gap: 6, padding: '5px 10px', borderBottom: '1px solid #FDE8F0', background: '#FBEAF0' }}>
        {['', 'Task', 'Notes', 'Due Date', 'Shows As', 'Progress', ''].map((h, i) => (
          <span key={i} style={{ fontSize: 10, fontWeight: 600, color: '#B5476A' }}>{h}</span>
        ))}
      </div>

      {/* Task rows */}
      {sectionTasks.map((task, idx) => {
        const urgency = getUrgencyColor(task.due_date, task.reminder_days)
        const showsAs = getShowsAs(task.due_date)
        const rowBg = urgency === 'red' ? '#FFCDD2' : urgency === 'orange' ? '#FFE0B2' : idx % 2 === 0 ? '#FFF5F8' : 'white'

        return (
          <div
            key={task.id}
            className="task-row"
            draggable
            onDragStart={e => handleDragStart(e, task.id)}
            onDragOver={e => { e.preventDefault(); setDragOver(task.id) }}
            onDragLeave={() => setDragOver(null)}
            onDrop={e => handleDrop(e, task.id)}
            style={{
              display: 'grid', gridTemplateColumns: '24px 1fr 120px 90px 80px 70px 60px',
              gap: 6, padding: '4px 10px', borderBottom: '1px solid #FDE8F0',
              alignItems: 'center', background: dragOver === task.id ? '#FDE8F0' : rowBg,
              transition: 'background 0.15s'
            }}
          >
            {/* Drag handle */}
            <div className="drag-handle" style={{ fontSize: 14, color: '#ccc', cursor: 'grab' }}>⠿</div>

            {/* Task name */}
            <input
              value={task.task}
              onChange={e => updateTask(task.id, { task: e.target.value })}
              placeholder="Add task..."
              style={{ border: 'none', background: 'transparent', fontSize: 12, color: '#333', width: '100%', outline: 'none', fontFamily: 'DM Sans, sans-serif' }}
            />

            {/* Notes (click to expand) */}
            <div
              onClick={() => setSelectedTask(task)}
              style={{ fontSize: 11, color: '#999', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              title="Click to expand notes"
            >
              {task.notes ? task.notes.substring(0, 20) + '...' : <span style={{ color: '#ddd' }}>+ notes</span>}
            </div>

            {/* Due date */}
            <div style={{ position: 'relative' }}>
              <input
                type="date"
                value={task.due_date || ''}
                onChange={e => updateTask(task.id, { due_date: e.target.value || null })}
                style={{ border: 'none', background: 'transparent', fontSize: 11, color: '#555', width: '100%', outline: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
              />
            </div>

            {/* Shows As */}
            <div style={{ fontSize: 11, fontStyle: 'italic', color: '#7D5A00', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {showsAs}
            </div>

            {/* Progress */}
            <select
              value={task.progress}
              onChange={e => updateTask(task.id, { progress: e.target.value })}
              className={PROGRESS_COLORS[task.progress]}
              style={{ border: 'none', borderRadius: 20, padding: '2px 4px', fontSize: 10, cursor: 'pointer', outline: 'none', fontFamily: 'DM Sans, sans-serif', width: '100%' }}
            >
              {PROGRESS_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            {/* Actions */}
            <div className="row-actions" style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
              {/* Move */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowMoveMenu(showMoveMenu === task.id ? null : task.id)}
                  title="Move to section"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#ccc', padding: 2 }}
                >↗</button>
                {showMoveMenu === task.id && (
                  <MoveTaskMenu
                    currentSection={section}
                    onMove={(s, sub) => { moveTask(task.id, s, sub); setShowMoveMenu(null) }}
                    onClose={() => setShowMoveMenu(null)}
                  />
                )}
              </div>
              {/* Archive / check */}
              <button
                onClick={() => archiveTask(task.id)}
                title="Mark as done & archive"
                style={{ background: 'none', border: '1px solid #ddd', cursor: 'pointer', fontSize: 10, color: '#ccc', padding: '1px 3px', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >✓</button>
            </div>
          </div>
        )
      })}

      {/* Add row */}
      <div
        onClick={() => addTask(section)}
        style={{ padding: '6px 12px', fontSize: 11, color: '#B5476A', cursor: 'pointer', opacity: 0.6, display: 'flex', alignItems: 'center', gap: 4 }}
        onMouseOver={e => (e.currentTarget.style.opacity = '1')}
        onMouseOut={e => (e.currentTarget.style.opacity = '0.6')}
      >
        + Add task
      </div>

      {/* Notes panel */}
      {selectedTask && (
        <NotesPanel
          task={selectedTask}
          onUpdate={(updates) => { updateTask(selectedTask.id, updates); setSelectedTask(t => t ? { ...t, ...updates } : null) }}
          onClose={() => setSelectedTask(null)}
          onArchive={() => { archiveTask(selectedTask.id); setSelectedTask(null) }}
          onDelete={() => { deleteTask(selectedTask.id); setSelectedTask(null) }}
        />
      )}
    </div>
  )
}
