'use client'
import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { PlannerBlock, ChecklistItem } from '@/lib/types'

const COLOR_OPTIONS = [
  { label: 'Pink', bg: '#FAE4EC', text: '#9A7080' },
  { label: 'Sand', bg: '#F5EEE0', text: '#907860' },
  { label: 'Blue', bg: '#D8E8F8', text: '#5878A0' },
  { label: 'Sage', bg: '#C8D8CC', text: '#507060' },
  { label: 'Mauve', bg: '#DDD0E0', text: '#706080' },
  { label: 'Gray', bg: '#E8E4E0', text: '#807878' },
]

function getTextColor(bg: string) {
  return COLOR_OPTIONS.find(c => c.bg === bg)?.text || '#807878'
}

interface Props { user: User }

function BlockEditModal({ block, onSave, onClose, onDelete }: {
  block: PlannerBlock
  onSave: (updates: Partial<PlannerBlock>) => void
  onClose: () => void
  onDelete: () => void
}) {
  const [title, setTitle] = useState(block.title)
  const [duration, setDuration] = useState(block.duration_minutes)
  const [color, setColor] = useState(block.color)
  const [date, setDate] = useState(block.date)
  const [newItem, setNewItem] = useState('')
  const [checklist, setChecklist] = useState<ChecklistItem[]>(block.checklist || [])

  const addChecklistItem = () => {
    if (!newItem.trim()) return
    setChecklist(prev => [...prev, { id: Date.now().toString(), text: newItem.trim(), done: false }])
    setNewItem('')
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="rounded-2xl shadow-2xl w-full max-w-md p-5" style={{ background: 'white' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Edit Block</h3>
          <button onClick={onClose} className="text-xl" style={{ color: 'var(--text-muted)' }}>&times;</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full mt-1 text-sm px-3 py-2 rounded-lg outline-none"
              style={{ border: '0.5px solid var(--card-border)', color: 'var(--text-primary)' }} />
          </div>
          <div>
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Duration (minutes)</label>
            <div className="flex items-center gap-2 mt-1">
              <button onClick={() => setDuration(d => Math.max(5, d - 5))} className="w-8 h-8 rounded-lg text-sm font-bold" style={{ background: 'var(--morandi-sand)', color: 'var(--morandi-sand-text)' }}>-</button>
              <input type="number" value={duration} onChange={e => setDuration(parseInt(e.target.value) || 0)}
                className="flex-1 text-sm px-3 py-2 rounded-lg outline-none text-center"
                style={{ border: '0.5px solid var(--card-border)', color: 'var(--text-primary)' }} />
              <button onClick={() => setDuration(d => d + 5)} className="w-8 h-8 rounded-lg text-sm font-bold" style={{ background: 'var(--morandi-sand)', color: 'var(--morandi-sand-text)' }}>+</button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Move to Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full mt-1 text-sm px-3 py-2 rounded-lg outline-none"
              style={{ border: '0.5px solid var(--card-border)', color: 'var(--text-primary)' }} />
          </div>
          <div>
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Color</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {COLOR_OPTIONS.map(c => (
                <button key={c.bg} onClick={() => setColor(c.bg)}
                  className="w-7 h-7 rounded-full border-2 transition-transform"
                  style={{ background: c.bg, borderColor: color === c.bg ? '#888' : 'transparent', transform: color === c.bg ? 'scale(1.1)' : 'scale(1)' }} />
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Checklist</label>
            <div className="space-y-1 mt-1 max-h-32 overflow-y-auto">
              {checklist.map(item => (
                <div key={item.id} className="flex items-center gap-2">
                  <span className="text-xs flex-1" style={{ color: 'var(--text-primary)' }}>{item.text}</span>
                  <button onClick={() => setChecklist(prev => prev.filter(i => i.id !== item.id))} className="text-sm" style={{ color: 'var(--morandi-pink-text)' }}>&times;</button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-1">
              <input value={newItem} onChange={e => setNewItem(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addChecklistItem()}
                placeholder="Add item..."
                className="flex-1 text-xs px-2 py-1.5 rounded-lg outline-none"
                style={{ border: '0.5px solid var(--card-border)', color: 'var(--text-primary)' }} />
              <button onClick={addChecklistItem} className="text-xs px-2 py-1.5 rounded-lg text-white" style={{ background: 'var(--morandi-pink-text)' }}>Add</button>
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={() => onSave({ title, duration_minutes: duration, color, date, checklist })}
            className="flex-1 text-sm py-2 rounded-lg text-white" style={{ background: 'var(--morandi-pink-text)' }}>Save</button>
          <button onClick={onDelete} className="text-sm px-4 py-2 rounded-lg" style={{ border: '0.5px solid #E8C0C0', color: '#C07070' }}>Delete</button>
        </div>
      </div>
    </div>
  )
}

function AddBlockModal({ date, userId, onSave, onClose }: {
  date: string
  userId: string
  onSave: (block: Omit<PlannerBlock, 'id'>) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState('')
  const [duration, setDuration] = useState(60)
  const [color, setColor] = useState('#FAE4EC')
  const [newItem, setNewItem] = useState('')
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])

  const addChecklistItem = () => {
    if (!newItem.trim()) return
    setChecklist(prev => [...prev, { id: Date.now().toString(), text: newItem.trim(), done: false }])
    setNewItem('')
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="rounded-2xl shadow-2xl w-full max-w-md p-5" style={{ background: 'white' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Add Block — {date}</h3>
          <button onClick={onClose} className="text-xl" style={{ color: 'var(--text-muted)' }}>&times;</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Block title..."
              className="w-full mt-1 text-sm px-3 py-2 rounded-lg outline-none"
              style={{ border: '0.5px solid var(--card-border)', color: 'var(--text-primary)' }} />
          </div>
          <div>
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Duration (minutes)</label>
            <div className="flex items-center gap-2 mt-1">
              <button onClick={() => setDuration(d => Math.max(5, d - 5))} className="w-8 h-8 rounded-lg text-sm font-bold" style={{ background: 'var(--morandi-sand)', color: 'var(--morandi-sand-text)' }}>-</button>
              <input type="number" value={duration} onChange={e => setDuration(parseInt(e.target.value) || 0)}
                className="flex-1 text-sm px-3 py-2 rounded-lg outline-none text-center"
                style={{ border: '0.5px solid var(--card-border)', color: 'var(--text-primary)' }} />
              <button onClick={() => setDuration(d => d + 5)} className="w-8 h-8 rounded-lg text-sm font-bold" style={{ background: 'var(--morandi-sand)', color: 'var(--morandi-sand-text)' }}>+</button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Color</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {COLOR_OPTIONS.map(c => (
                <button key={c.bg} onClick={() => setColor(c.bg)}
                  className="w-7 h-7 rounded-full border-2 transition-transform"
                  style={{ background: c.bg, borderColor: color === c.bg ? '#888' : 'transparent', transform: color === c.bg ? 'scale(1.1)' : 'scale(1)' }} />
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Checklist (optional)</label>
            <div className="space-y-1 mt-1">
              {checklist.map(item => (
                <div key={item.id} className="flex items-center gap-2">
                  <span className="text-xs flex-1" style={{ color: 'var(--text-primary)' }}>{item.text}</span>
                  <button onClick={() => setChecklist(prev => prev.filter(i => i.id !== item.id))} className="text-sm" style={{ color: 'var(--morandi-pink-text)' }}>&times;</button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-1">
              <input value={newItem} onChange={e => setNewItem(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addChecklistItem()}
                placeholder="Add item..."
                className="flex-1 text-xs px-2 py-1.5 rounded-lg outline-none"
                style={{ border: '0.5px solid var(--card-border)', color: 'var(--text-primary)' }} />
              <button onClick={addChecklistItem} className="text-xs px-2 py-1.5 rounded-lg text-white" style={{ background: 'var(--morandi-pink-text)' }}>Add</button>
            </div>
          </div>
        </div>
        <button onClick={() => {
          if (!title.trim()) return
          onSave({ user_id: userId, date, title, category: 'other', color, duration_minutes: duration, block_type: 'time', quantity: null, checklist, is_done: false, position: 999, notes: '' })
        }} className="w-full mt-4 text-sm py-2 rounded-lg text-white" style={{ background: 'var(--morandi-pink-text)' }}>Add Block</button>
      </div>
    </div>
  )
}

export default function WeeklyPlannerPage({ user }: Props) {
  const [blocks, setBlocks] = useState<PlannerBlock[]>([])
  const [view, setView] = useState<'month' | 'week' | 'day'>('week')
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const d = new Date()
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + diff)
    return d.toISOString().split('T')[0]
  })
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const [editingBlock, setEditingBlock] = useState<PlannerBlock | null>(null)
  const [addingToDate, setAddingToDate] = useState<string | null>(null)

  useEffect(() => { fetchBlocks() }, [user])

  const fetchBlocks = async () => {
    const { data } = await supabase.from('summer_blocks').select('*').eq('user_id', user.id).order('position')
    if (data) setBlocks(data)
  }

  const toggleBlock = async (id: string) => {
    const block = blocks.find(b => b.id === id)
    if (!block) return
    const newDone = !block.is_done
    const newChecklist = block.checklist?.map(i => ({ ...i, done: newDone })) || []
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, is_done: newDone, checklist: newChecklist } : b))
    await supabase.from('summer_blocks').update({ is_done: newDone, checklist: newChecklist }).eq('id', id)
  }

  const toggleChecklistItem = async (blockId: string, itemId: string) => {
    const block = blocks.find(b => b.id === blockId)
    if (!block) return
    const newChecklist = block.checklist.map(i => i.id === itemId ? { ...i, done: !i.done } : i)
    const allDone = newChecklist.every(i => i.done)
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, checklist: newChecklist, is_done: allDone } : b))
    await supabase.from('summer_blocks').update({ checklist: newChecklist, is_done: allDone }).eq('id', blockId)
  }

  const updateBlock = async (id: string, updates: Partial<PlannerBlock>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b))
    await supabase.from('summer_blocks').update(updates).eq('id', id)
    setEditingBlock(null)
  }

  const deleteBlock = async (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id))
    await supabase.from('summer_blocks').delete().eq('id', id)
    setEditingBlock(null)
  }

  const addBlock = async (block: Omit<PlannerBlock, 'id'>) => {
    const { data } = await supabase.from('summer_blocks').insert(block).select().single()
    if (data) setBlocks(prev => [...prev, data])
    setAddingToDate(null)
  }

  const todayBlocks = blocks.filter(b => b.date === selectedDate)
  const totalMins = todayBlocks.reduce((sum, b) => sum + b.duration_minutes, 0)
  const doneMins = todayBlocks.filter(b => b.is_done).reduce((sum, b) => sum + b.duration_minutes, 0)
  const progress = totalMins > 0 ? (doneMins / totalMins) * 100 : 0

  const getWeekDates = (startStr: string) => {
    const dates = []
    const start = new Date(startStr)
    for (let i = 0; i < 7; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      dates.push(d.toISOString().split('T')[0])
    }
    return dates
  }

  const weekDates = getWeekDates(currentWeekStart)
  const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  const getDaysInMonth = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days: (string | null)[] = Array(firstDay === 0 ? 6 : firstDay - 1).fill(null)
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
    }
    return days
  }

  const monthDays = getDaysInMonth(currentMonth.year, currentMonth.month)

  return (
    <div className="relative">
      {/* Progress bar */}
      <div className="sticky top-0 z-30 bg-white border-b px-4 py-3 shadow-sm" style={{ borderColor: 'var(--card-border)' }}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{Math.round(doneMins / 60 * 10) / 10}h / {Math.round(totalMins / 60 * 10) / 10}h</span>
        </div>
        <div className="w-full rounded-full h-2" style={{ background: 'var(--morandi-pink)' }}>
          <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: 'var(--morandi-pink-text)' }} />
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex rounded-lg p-0.5 gap-0.5" style={{ background: 'var(--morandi-pink)' }}>
            {(['month', 'week', 'day'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className="text-xs px-3 py-1 rounded-md transition-colors capitalize"
                style={{ background: view === v ? 'white' : 'transparent', color: view === v ? 'var(--morandi-pink-text)' : 'var(--morandi-pink-text)', fontWeight: view === v ? '500' : '400', opacity: view === v ? 1 : 0.7 }}>
                {v}
              </button>
            ))}
          </div>
          <button onClick={() => setAddingToDate(selectedDate)}
            className="text-xs px-3 py-1.5 rounded-lg text-white" style={{ background: 'var(--morandi-pink-text)' }}>+ Add</button>
        </div>
      </div>

      {/* MONTH VIEW */}
      {view === 'month' && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setCurrentMonth(m => { const nm = m.month - 1; return nm < 0 ? { year: m.year - 1, month: 11 } : { ...m, month: nm } })}
              className="p-1" style={{ color: 'var(--text-muted)' }}>◀</button>
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {new Date(currentMonth.year, currentMonth.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={() => setCurrentMonth(m => { const nm = m.month + 1; return nm > 11 ? { year: m.year + 1, month: 0 } : { ...m, month: nm } })}
              className="p-1" style={{ color: 'var(--text-muted)' }}>▶</button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAY_NAMES.map(d => <div key={d} className="text-center text-xs py-1" style={{ color: 'var(--text-muted)' }}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((dateStr, i) => {
              if (!dateStr) return <div key={i} />
              const dayBlocks = blocks.filter(b => b.date === dateStr)
              const undone = dayBlocks.filter(b => !b.is_done)
              const isSelected = dateStr === selectedDate
              const isToday = dateStr === new Date().toISOString().split('T')[0]
              return (
                <button key={dateStr} onClick={() => { setSelectedDate(dateStr); setView('day') }}
                  className="rounded-xl p-1 min-h-[60px] text-left border"
                  style={{ background: isToday ? 'var(--morandi-pink)' : 'white', borderColor: isSelected ? 'var(--morandi-pink-text)' : 'var(--card-border)' }}>
                  <span className="text-xs font-medium" style={{ color: isToday ? 'var(--morandi-pink-text)' : 'var(--text-secondary)' }}>
                    {new Date(dateStr + 'T00:00:00').getDate()}
                  </span>
                  <div className="flex flex-col gap-0.5 mt-0.5">
                    {undone.slice(0, 3).map(b => (
                      <div key={b.id} style={{ background: b.color }} className="rounded px-1">
                        <span style={{ color: getTextColor(b.color) }} className="text-[9px] truncate block">
                          {b.title.slice(0, 8)}{b.title.length > 8 ? '…' : ''}
                        </span>
                      </div>
                    ))}
                    {undone.length > 3 && <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>+{undone.length - 3}</span>}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* WEEK VIEW */}
      {view === 'week' && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => { const d = new Date(currentWeekStart); d.setDate(d.getDate() - 7); setCurrentWeekStart(d.toISOString().split('T')[0]) }}
              className="p-1" style={{ color: 'var(--text-muted)' }}>◀</button>
            <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
              {new Date(weekDates[0] + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –{' '}
              {new Date(weekDates[6] + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
            <button onClick={() => { const d = new Date(currentWeekStart); d.setDate(d.getDate() + 7); setCurrentWeekStart(d.toISOString().split('T')[0]) }}
              className="p-1" style={{ color: 'var(--text-muted)' }}>▶</button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {weekDates.map((dateStr, i) => {
              const dayBlocks = blocks.filter(b => b.date === dateStr)
              const undone = dayBlocks.filter(b => !b.is_done)
              const isSelected = dateStr === selectedDate
              const isToday = dateStr === new Date().toISOString().split('T')[0]
              return (
                <button key={dateStr} onClick={() => { setSelectedDate(dateStr); setView('day') }}
                  className="rounded-xl p-2 min-h-[100px] text-left border"
                  style={{ background: isToday ? 'var(--morandi-pink)' : 'white', borderColor: isSelected ? 'var(--morandi-pink-text)' : 'var(--card-border)' }}>
                  <div className="text-xs font-medium mb-1" style={{ color: isToday ? 'var(--morandi-pink-text)' : 'var(--text-secondary)' }}>
                    <div>{DAY_NAMES[i]}</div>
                    <div>{new Date(dateStr + 'T00:00:00').getDate()}</div>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {undone.slice(0, 4).map(b => (
                      <div key={b.id} style={{ background: b.color }} className="rounded px-1 py-0.5">
                        <span style={{ color: getTextColor(b.color) }} className="text-[9px] leading-tight block truncate">
                          {b.title.length > 10 ? b.title.slice(0, 10) + '…' : b.title}
                        </span>
                      </div>
                    ))}
                    {undone.length > 4 && <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>+{undone.length - 4}</span>}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* DAY VIEW */}
      {view === 'day' && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d.toISOString().split('T')[0]) }}
              className="p-1" style={{ color: 'var(--text-muted)' }}>◀</button>
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
            <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d.toISOString().split('T')[0]) }}
              className="p-1" style={{ color: 'var(--text-muted)' }}>▶</button>
          </div>
          <div className="space-y-2">
            {todayBlocks.length === 0 && (
              <div className="text-center text-sm italic py-8" style={{ color: 'var(--text-muted)' }}>No blocks for this day</div>
            )}
            {todayBlocks.map(block => {
              const textColor = getTextColor(block.color)
              const h = Math.floor(block.duration_minutes / 60)
              const m = block.duration_minutes % 60
              const dur = h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`
              return (
                <div key={block.id} style={{ background: block.color }} className={`rounded-xl p-3 ${block.is_done ? 'opacity-50' : ''}`}>
                  <div className="flex items-start gap-2">
                    <button onClick={() => toggleBlock(block.id)}
                      className="w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center"
                      style={{ borderColor: textColor, background: block.is_done ? textColor : 'transparent' }}>
                      {block.is_done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${block.is_done ? 'line-through' : ''}`} style={{ color: textColor }}>{block.title}</p>
                      <p className="text-xs opacity-60 mt-0.5" style={{ color: textColor }}>{dur}</p>
                      {block.checklist && block.checklist.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {block.checklist.map(item => (
                            <button key={item.id} onClick={() => toggleChecklistItem(block.id, item.id)}
                              className="flex items-center gap-2 w-full text-left">
                              <div className="w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                                style={{ borderColor: textColor, background: item.done ? textColor : 'transparent' }}>
                                {item.done && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                              </div>
                              <span className={`text-xs ${item.done ? 'line-through opacity-50' : ''}`} style={{ color: textColor }}>{item.text}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button onClick={() => setEditingBlock(block)} className="text-xs opacity-40 hover:opacity-70 p-1" style={{ color: textColor }}>✎</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {editingBlock && (
        <BlockEditModal block={editingBlock} onSave={u => updateBlock(editingBlock.id, u)} onClose={() => setEditingBlock(null)} onDelete={() => deleteBlock(editingBlock.id)} />
      )}
      {addingToDate && (
        <AddBlockModal date={addingToDate} userId={user.id} onSave={addBlock} onClose={() => setAddingToDate(null)} />
      )}
    </div>
  )
}
