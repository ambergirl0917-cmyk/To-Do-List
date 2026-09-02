'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Task, PlannerBlock, Progress } from '@/lib/types'
import { getShowsAs, getDaysUntil } from '@/lib/showsAs'

interface Props {
  user: User
  onTaskChange?: () => void
  searchQuery?: string
}

const PROGRESS_OPTIONS: Progress[] = ['0%', '20%', '50%', '70%', '100%']
const PROGRESS_STYLES: Record<Progress, { bg: string; text: string }> = {
  '0%':   { bg: '#FAE4EC', text: '#9A7080' },
  '20%':  { bg: '#F5EEE0', text: '#907860' },
  '50%':  { bg: '#D8E8F8', text: '#5878A0' },
  '70%':  { bg: '#DDD0E0', text: '#706080' },
  '100%': { bg: '#C8D8CC', text: '#507060' },
}

// ============ TIMER ============
interface TimerPreset { id: string; name: string; minutes: number }

function Timer() {
  const [presets, setPresets] = useState<TimerPreset[]>(() => {
    try { return JSON.parse(localStorage.getItem('timer_presets') || '[]') } catch { return [] }
  })
  const [activePreset, setActivePreset] = useState<TimerPreset | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const [newName, setNewName] = useState('')
  const [newMinutes, setNewMinutes] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(s => { if (s <= 1) { setRunning(false); return 0 } return s - 1 })
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running])

  const format = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const loadPreset = (p: TimerPreset) => { setActivePreset(p); setSecondsLeft(p.minutes * 60); setRunning(false) }
  const reset = () => { setRunning(false); setSecondsLeft(activePreset ? activePreset.minutes * 60 : 25 * 60) }

  const savePreset = () => {
    if (!newName.trim() || !newMinutes) return
    const preset: TimerPreset = { id: Date.now().toString(), name: newName.trim(), minutes: parseInt(newMinutes) }
    const updated = [...presets, preset]
    setPresets(updated)
    localStorage.setItem('timer_presets', JSON.stringify(updated))
    setNewName(''); setNewMinutes(''); setShowAdd(false)
  }

  const deletePreset = (id: string) => {
    const updated = presets.filter(p => p.id !== id)
    setPresets(updated)
    localStorage.setItem('timer_presets', JSON.stringify(updated))
    if (activePreset?.id === id) { setActivePreset(null); setSecondsLeft(25 * 60); setRunning(false) }
  }

  return (
    <div className="rounded-xl border p-4 flex flex-col" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Timer</span>
      </div>
      <div className="text-center mb-3">
        <div className="text-3xl font-medium tracking-widest" style={{ color: 'var(--text-primary)' }}>{format(secondsLeft)}</div>
        {activePreset && <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{activePreset.name}</div>}
      </div>
      <div className="flex justify-center gap-2 mb-3">
        <button onClick={() => setRunning(r => !r)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'var(--morandi-pink)' }}>
          <i className={`ti ${running ? 'ti-player-pause' : 'ti-player-play'}`} style={{ fontSize: '14px', color: 'var(--morandi-pink-text)' }} />
        </button>
        <button onClick={reset} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'var(--morandi-sand)' }}>
          <i className="ti ti-refresh" style={{ fontSize: '14px', color: 'var(--morandi-sand-text)' }} />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {presets.map(p => (
          <div key={p.id} className="flex items-center gap-1 rounded-lg px-2 py-1" style={{ background: activePreset?.id === p.id ? 'var(--morandi-pink)' : 'var(--morandi-sand)' }}>
            <button onClick={() => loadPreset(p)} className="text-xs" style={{ color: activePreset?.id === p.id ? 'var(--morandi-pink-text)' : 'var(--morandi-sand-text)' }}>{p.name} {p.minutes}m</button>
            <button onClick={() => deletePreset(p.id)} className="text-xs opacity-50 hover:opacity-100" style={{ color: 'var(--morandi-pink-text)' }}>×</button>
          </div>
        ))}
        <button onClick={() => setShowAdd(s => !s)} className="text-xs px-2 py-1 rounded-lg" style={{ background: 'var(--morandi-linen)', color: 'var(--morandi-linen-text)' }}>+ Add</button>
      </div>
      {showAdd && (
        <div className="flex gap-1.5">
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Name..." className="flex-1 text-xs px-2 py-1.5 rounded-lg outline-none" style={{ border: '0.5px solid var(--card-border)', color: 'var(--text-primary)' }} />
          <input value={newMinutes} onChange={e => setNewMinutes(e.target.value)} placeholder="Min" type="number" className="w-12 text-xs px-2 py-1.5 rounded-lg outline-none text-center" style={{ border: '0.5px solid var(--card-border)', color: 'var(--text-primary)' }} />
          <button onClick={savePreset} className="text-xs px-2 py-1.5 rounded-lg text-white" style={{ background: 'var(--morandi-pink-text)' }}>Save</button>
        </div>
      )}
    </div>
  )
}

// ============ CALENDAR ============
function MiniCalendar({ tasks, deadlines }: { tasks: Task[]; deadlines: any[] }) {
  const [currentMonth, setCurrentMonth] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() } })
  const [expandedDate, setExpandedDate] = useState<string | null>(null)
  const today = new Date().toISOString().split('T')[0]

  const getDaysInMonth = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days: (string | null)[] = Array(firstDay === 0 ? 6 : firstDay - 1).fill(null)
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
    }
    return days
  }

  const days = getDaysInMonth(currentMonth.year, currentMonth.month)
  const DAY_NAMES = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

  const getDeadlineCount = (dateStr: string) => deadlines.filter(d => d.due_date === dateStr).length
  const getTaskCount = (dateStr: string) => tasks.filter(t => t.due_date === dateStr && !t.is_archived).length
  const getItemsForDay = (dateStr: string) => ({
    deadlines: deadlines.filter(d => d.due_date === dateStr),
    tasks: tasks.filter(t => t.due_date === dateStr && !t.is_archived)
  })

  return (
    <div className="rounded-xl border p-4" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentMonth(m => { const nm = m.month - 1; return nm < 0 ? { year: m.year - 1, month: 11 } : { ...m, month: nm } })} className="text-sm" style={{ color: 'var(--text-muted)' }}>‹</button>
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            {new Date(currentMonth.year, currentMonth.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </span>
          <button onClick={() => setCurrentMonth(m => { const nm = m.month + 1; return nm > 11 ? { year: m.year + 1, month: 0 } : { ...m, month: nm } })} className="text-sm" style={{ color: 'var(--text-muted)' }}>›</button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center mb-1">
        {DAY_NAMES.map((d, i) => <span key={i} className="text-xs" style={{ color: 'var(--text-muted)' }}>{d}</span>)}
      </div>

      <div className="grid grid-cols-7 gap-px">
        {days.map((dateStr, i) => {
          if (!dateStr) return <div key={i} />
          const dCount = getDeadlineCount(dateStr)
          const tCount = getTaskCount(dateStr)
          const isToday = dateStr === today
          const isExpanded = expandedDate === dateStr
          const hasItems = dCount > 0 || tCount > 0

          return (
            <div key={dateStr} className="flex flex-col items-center">
              <button
                onClick={() => setExpandedDate(isExpanded ? null : dateStr)}
                className="flex flex-col items-center w-full py-0.5"
                style={{ cursor: hasItems ? 'pointer' : 'default' }}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: isToday ? 'var(--morandi-pink)' : 'transparent' }}>
                  <span className="text-xs" style={{ color: isToday ? 'var(--morandi-pink-text)' : 'var(--text-secondary)', fontWeight: isToday ? '600' : '400' }}>
                    {new Date(dateStr + 'T00:00:00').getDate()}
                  </span>
                </div>
                {hasItems && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dCount > 0 && (
                      <div className="w-3 h-3 rounded-full flex items-center justify-center" style={{ background: '#F9D0DC' }}>
                        <span style={{ fontSize: '7px', color: '#B87080', fontWeight: '700' }}>{dCount}</span>
                      </div>
                    )}
                    {tCount > 0 && (
                      <div className="w-3 h-3 rounded-full flex items-center justify-center" style={{ background: '#DDD0BC' }}>
                        <span style={{ fontSize: '7px', color: '#907860', fontWeight: '700' }}>{tCount}</span>
                      </div>
                    )}
                  </div>
                )}
              </button>

              {/* Expanded day inline */}
              {isExpanded && (
                <div className="col-span-7 w-full mt-1 rounded-lg p-2 text-left"
                  style={{ background: 'var(--morandi-pink)', position: 'absolute', left: 0, right: 0, zIndex: 10, margin: '0 16px', width: 'calc(100% - 32px)' }}>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--morandi-pink-text)' }}>
                    {new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                  {getItemsForDay(dateStr).deadlines.map((d: any) => (
                    <div key={d.id} className="text-xs py-0.5" style={{ color: 'var(--morandi-pink-text)' }}>
                      📅 {d.subject}: {d.task}
                    </div>
                  ))}
                  {getItemsForDay(dateStr).tasks.map((t: Task) => (
                    <div key={t.id} className="text-xs py-0.5" style={{ color: 'var(--morandi-sand-text)' }}>
                      ✓ {t.task}
                    </div>
                  ))}
                  <button onClick={() => setExpandedDate(null)} className="text-xs mt-1" style={{ color: 'var(--morandi-pink-text)', opacity: 0.6 }}>close</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex gap-3 mt-3 pt-3" style={{ borderTop: '0.5px solid var(--divider)' }}>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#F9D0DC' }} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Deadline</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#DDD0BC' }} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Task due</span>
        </div>
      </div>
    </div>
  )
}

// ============ QUICK NOTE ============
function QuickNote({ user }: { user: User }) {
  const editorRef = useRef<HTMLDivElement>(null)
  const saveTimeout = useRef<NodeJS.Timeout | null>(null)
  const [saved, setSaved] = useState(true)
  const [noteId, setNoteId] = useState<string | null>(null)

  useEffect(() => { loadNote() }, [user])

  const loadNote = async () => {
    const { data } = await supabase.from('quick_notes').select('*').eq('user_id', user.id).single()
    if (data && editorRef.current) {
      editorRef.current.innerHTML = data.content || ''
      setNoteId(data.id)
    }
  }

  const handleInput = () => {
    setSaved(false)
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(async () => {
      const content = editorRef.current?.innerHTML || ''
      if (noteId) {
        await supabase.from('quick_notes').update({ content, updated_at: new Date().toISOString() }).eq('id', noteId)
      } else {
        const { data } = await supabase.from('quick_notes').insert({ user_id: user.id, content }).select().single()
        if (data) setNoteId(data.id)
      }
      setSaved(true)
    }, 1000)
  }

  const format = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value)
    editorRef.current?.focus()
    handleInput()
  }

  const HIGHLIGHTS = [
    { color: '#FAE4EC', label: 'Pink' },
    { color: '#D8E8F8', label: 'Blue' },
    { color: '#C8D8CC', label: 'Sage' },
    { color: '#F5EEE0', label: 'Sand' },
  ]

  return (
    <div className="rounded-xl border flex flex-col" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between flex-shrink-0"
        style={{ background: 'var(--section-header)', borderColor: 'var(--divider)' }}>
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Quick note</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{saved ? 'saved' : 'saving...'}</span>
      </div>

      {/* Toolbar */}
      <div className="px-3 py-2 border-b flex items-center gap-1.5 flex-wrap flex-shrink-0"
        style={{ borderColor: 'var(--divider)' }}>
        <button onClick={() => format('bold')}
          className="px-2 py-1 rounded-md text-xs font-bold border transition-colors hover:bg-pink-50"
          style={{ borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}>B</button>
        <button onClick={() => format('insertUnorderedList')}
          className="px-2 py-1 rounded-md text-xs border transition-colors hover:bg-pink-50"
          style={{ borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}>• List</button>
        <button onClick={() => format('insertHTML', '<input type="checkbox" style="margin-right:6px;accent-color:#9A7080;"> ')}
          className="px-2 py-1 rounded-md text-xs border transition-colors hover:bg-pink-50"
          style={{ borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}>☑ Check</button>
        <div className="flex gap-1 ml-1">
          {HIGHLIGHTS.map(h => (
            <button key={h.color} onClick={() => format('hiliteColor', h.color)}
              className="w-4 h-4 rounded-full border transition-transform hover:scale-110"
              style={{ background: h.color, borderColor: 'var(--card-border)' }}
              title={`Highlight ${h.label}`} />
          ))}
          <button onClick={() => format('hiliteColor', 'transparent')}
            className="w-4 h-4 rounded-full border transition-transform hover:scale-110 flex items-center justify-center"
            style={{ borderColor: 'var(--card-border)', background: 'white' }}
            title="Remove highlight">
            <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>✕</span>
          </button>
        </div>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="flex-1 px-4 py-3 outline-none text-sm overflow-y-auto"
        style={{ color: 'var(--text-primary)', lineHeight: '1.7', minHeight: '140px', maxHeight: '220px' }}
        data-placeholder="Start typing your note..."
        suppressContentEditableWarning
      />

      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: var(--text-muted);
          pointer-events: none;
        }
        [contenteditable] ul { padding-left: 16px; margin: 4px 0; }
        [contenteditable] li { margin: 2px 0; }
      `}</style>
    </div>
  )
}

// ============ MAIN HOME PAGE ============
export default function HomePage({ user, onTaskChange }: Props) {
  const [todayTasks, setTodayTasks] = useState<Task[]>([])
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [allDeadlines, setAllDeadlines] = useState<any[]>([])
  const [plannerSlots, setPlannerSlots] = useState<PlannerBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [todayStats, setTodayStats] = useState({ total: 0, done: 0, deadlines: 0 })

  const todayStr = new Date().toISOString().split('T')[0]
  const todayDay = new Date().toLocaleDateString('en-US', { weekday: 'long' })

  useEffect(() => { fetchAll() }, [user])

  const fetchAll = async () => {
    const [tasksRes, deadlinesRes, plannerRes] = await Promise.all([
      supabase.from('tasks').select('*').eq('user_id', user.id).eq('is_archived', false),
      supabase.from('deadlines').select('*').eq('user_id', user.id).neq('status', 'Done'),
      supabase.from('summer_blocks').select('*').eq('user_id', user.id).order('position'),
    ])
    const tasks = tasksRes.data || []
    const deadlines = deadlinesRes.data || []
    const slots = plannerRes.data || []
    setAllTasks(tasks)
    setAllDeadlines(deadlines)
    setPlannerSlots(slots)
    const todayTaskList = tasks.filter(t => t.section_id === 'todays-tasks')
    setTodayTasks(todayTaskList)
    setTodayStats({
      total: todayTaskList.length,
      done: todayTaskList.filter(t => t.progress === '100%').length,
      deadlines: deadlines.filter(d => d.due_date === todayStr).length,
    })
    setLoading(false)
  }

  const updateTask = async (id: string, updates: Partial<Task>) => {
    setTodayTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
    setTodayStats(prev => ({
      ...prev,
      done: todayTasks.filter(t => (t.id === id ? { ...t, ...updates } : t).progress === '100%').length
    }))
    await supabase.from('tasks').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id)
    onTaskChange?.()
  }

  const removeFromToday = async (id: string) => {
    setTodayTasks(prev => prev.filter(t => t.id !== id))
    await supabase.from('tasks').update({ section_id: 'others', updated_at: new Date().toISOString() }).eq('id', id)
    onTaskChange?.()
  }

  const transferPlannerTask = async (slot: WeeklySlot) => {
    const { data } = await supabase.from('tasks').insert({
      user_id: user.id, section_id: 'todays-tasks', task: slot.task,
      notes: slot.notes || '', due_date: null, progress: slot.progress,
      position: todayTasks.length, is_archived: false, checklist: slot.checklist || [],
      reminder_days: null, is_recurring: false, recur_interval: null,
    }).select().single()
    if (data) { setTodayTasks(prev => [...prev, data]); onTaskChange?.() }
  }

  const transferAllPlannerTasks = async () => {
    for (const slot of todayPlannerSlots) await transferPlannerTask(slot)
  }

  const todayPlannerSlots = plannerSlots.filter(s => s.date === todayStr)

  if (loading) return <div className="flex items-center justify-center h-64 text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</div>

  return (
    <div className="space-y-4">
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css" />

      {/* STAT CARDS */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl p-4" style={{ background: '#FAE4EC' }}>
          <p className="text-xs mb-1 flex items-center gap-1" style={{ color: '#C490A0' }}>
            <i className="ti ti-check" style={{ fontSize: '11px' }} /> Today's tasks
          </p>
          <p className="text-2xl font-medium" style={{ color: '#9A7080' }}>{todayStats.total}</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: '#F5EEE0' }}>
          <p className="text-xs mb-1 flex items-center gap-1" style={{ color: '#C0AA88' }}>
            <i className="ti ti-calendar-event" style={{ fontSize: '11px' }} /> Deadlines today
          </p>
          <p className="text-2xl font-medium" style={{ color: '#907860' }}>{todayStats.deadlines}</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: '#D8E8F8' }}>
          <p className="text-xs mb-1 flex items-center gap-1" style={{ color: '#88A8C8' }}>
            <i className="ti ti-circle-check" style={{ fontSize: '11px' }} /> Done today
          </p>
          <p className="text-2xl font-medium" style={{ color: '#5878A0' }}>{todayStats.done}</p>
        </div>
      </div>

      {/* TODAY'S TASKS + QUICK NOTE */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
        {/* Today's tasks */}
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
          <div className="px-4 py-3 flex items-center justify-between"
            style={{ background: 'var(--section-header)', borderBottom: '0.5px solid var(--divider)' }}>
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Today's tasks</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{todayStats.done} / {todayStats.total} done</span>
          </div>
          {todayTasks.length === 0 && (
            <div className="px-4 py-6 text-center text-sm italic" style={{ color: 'var(--text-muted)' }}>No tasks for today yet</div>
          )}
          {todayTasks.map(task => {
            const isDone = task.progress === '100%'
            const days = getDaysUntil(task.due_date)
            const ps = PROGRESS_STYLES[task.progress] || PROGRESS_STYLES['0%']
            return (
              <div key={task.id} className="flex items-center gap-2 px-4 py-2.5 border-b"
                style={{ borderColor: 'var(--divider)', opacity: isDone ? 0.6 : 1, background: days !== null && days <= 2 && !isDone ? 'var(--urgent-today-bg)' : undefined }}>
                <button onClick={() => updateTask(task.id, { progress: isDone ? '0%' : '100%' })}
                  className="w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors"
                  style={{ borderColor: 'var(--morandi-pink-text)', background: isDone ? 'var(--morandi-pink-text)' : 'transparent' }}>
                  {isDone && <i className="ti ti-check" style={{ fontSize: '7px', color: 'white' }} />}
                </button>
                <span className="flex-1 text-sm min-w-0 truncate"
                  style={{ color: isDone ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: isDone ? 'line-through' : 'none' }}>
                  {task.task || 'Untitled'}
                </span>
                {task.due_date && (
                  <span className="text-xs flex-shrink-0"
                    style={{ color: days !== null && days <= 2 ? 'var(--urgent-today-text)' : 'var(--text-muted)' }}>
                    {getShowsAs(task.due_date)}
                  </span>
                )}
                {/* Progress dropdown */}
                <select value={task.progress}
                  onChange={e => updateTask(task.id, { progress: e.target.value as Progress })}
                  className="text-xs rounded-full border-0 outline-none cursor-pointer flex-shrink-0 px-1.5 py-0.5"
                  style={{ background: ps.bg, color: ps.text }}>
                  {PROGRESS_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <div className="w-4 flex-shrink-0 flex items-center justify-center">
                  {isDone && (
                    <button onClick={() => removeFromToday(task.id)} className="text-sm leading-none" style={{ color: 'var(--text-muted)' }}>×</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Quick Note */}
        <QuickNote user={user} />
      </div>

      {/* CALENDAR + TIMER */}
      <div className="grid grid-cols-2 gap-3">
        <MiniCalendar tasks={allTasks} deadlines={allDeadlines} />
        <Timer />
      </div>

      {/* TODAY'S PLANNER */}
      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
        <div className="px-4 py-3 flex items-center justify-between"
          style={{ background: 'var(--section-header)', borderBottom: '0.5px solid var(--divider)' }}>
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Today's planner</span>
          {todayPlannerSlots.length > 0 && (
            <button onClick={transferAllPlannerTasks}
              className="text-xs px-2.5 py-1 rounded-lg flex items-center gap-1"
              style={{ background: 'var(--morandi-pink)', color: 'var(--morandi-pink-text)' }}>
              <i className="ti ti-transfer" style={{ fontSize: '10px' }} /> Transfer all
            </button>
          )}
        </div>
        {todayPlannerSlots.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm italic" style={{ color: 'var(--text-muted)' }}>No planned tasks for today</div>
        ) : (
          todayPlannerSlots.map(slot => (
            <div key={slot.id} className="flex items-center gap-3 px-4 py-2.5 border-b" style={{ borderColor: 'var(--divider)' }}>
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--morandi-pink)' }} />
              <span className="text-sm flex-1 min-w-0 truncate" style={{ color: 'var(--text-primary)' }}>{slot.task || 'Untitled'}</span>
              {slot.time_slot && <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{slot.time_slot}</span>}
              <div className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'var(--morandi-pink)', color: 'var(--morandi-pink-text)' }}>{slot.progress}</div>
              <button onClick={() => transferPlannerTask(slot)}
                className="text-xs px-2 py-1 rounded-lg flex-shrink-0"
                style={{ border: '0.5px solid var(--morandi-pink-text)', color: 'var(--morandi-pink-text)' }}>
                → Today
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
