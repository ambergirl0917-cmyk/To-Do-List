'use client'
import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { WeeklySlot, Progress, ChecklistItem } from '@/lib/types'

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
const PROGRESS_OPTIONS: Progress[] = ['0%','20%','50%','70%','100%']

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  sat: { bg: '#FAE4EC', text: '#9A7080' },
  college: { bg: '#D8E8F8', text: '#5878A0' },
  personal: { bg: '#DDD0E0', text: '#706080' },
  ibcore: { bg: '#C8D8CC', text: '#507060' },
  subject: { bg: '#F5EEE0', text: '#907860' },
  other: { bg: '#E8E4E0', text: '#807878' },
}

const CATEGORIES = [
  { id: 'sat', label: 'SAT' },
  { id: 'college', label: 'College' },
  { id: 'personal', label: 'Personal' },
  { id: 'ibcore', label: 'IB Core' },
  { id: 'subject', label: 'Subject Study' },
  { id: 'other', label: 'Other' },
]

function generateTimeOptions() {
  const times: string[] = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const period = h < 12 ? 'AM' : 'PM'
      const hour = h === 0 ? 12 : h > 12 ? h - 12 : h
      const min = m.toString().padStart(2, '0')
      times.push(`${hour}:${min} ${period}`)
    }
  }
  return times
}
const TIME_OPTIONS = generateTimeOptions()

interface Props { user: User; totalWeeks?: number }

function SlotNotesPanel({ slot, onUpdate, onClose }: {
  slot: WeeklySlot
  onUpdate: (id: string, updates: Partial<WeeklySlot>) => void
  onClose: () => void
}) {
  const [newItem, setNewItem] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const checklist: ChecklistItem[] = slot.checklist || []

  const addItem = () => {
    if (!newItem.trim()) return
    const item: ChecklistItem = { id: Date.now().toString(), text: newItem.trim(), done: false }
    onUpdate(slot.id, { checklist: [...checklist, item] })
    setNewItem('')
  }

  const toggleItem = (id: string) => {
    onUpdate(slot.id, { checklist: checklist.map(i => i.id === id ? { ...i, done: !i.done } : i) })
  }

  const deleteItem = (id: string) => {
    onUpdate(slot.id, { checklist: checklist.filter(i => i.id !== id) })
  }

  const saveEdit = () => {
    if (!editingId) return
    onUpdate(slot.id, { checklist: checklist.map(i => i.id === editingId ? { ...i, text: editingText } : i) })
    setEditingId(null)
  }

  return (
    <div className="rounded-xl px-4 py-3 mt-1 mb-2" style={{ background: 'var(--morandi-pink)', opacity: 0.8 }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium" style={{ color: 'var(--morandi-pink-text)' }}>Notes & Checklist</span>
        <button onClick={onClose} className="text-lg leading-none" style={{ color: 'var(--morandi-pink-text)' }}>&times;</button>
      </div>
      <textarea
        value={slot.notes || ''}
        onChange={e => onUpdate(slot.id, { notes: e.target.value })}
        placeholder="Add notes..."
        className="w-full text-sm rounded-lg px-3 py-2 outline-none resize-none mb-2"
        style={{ background: 'white', color: 'var(--text-primary)', border: '0.5px solid var(--card-border)' }}
        rows={2}
      />
      <div className="space-y-1 mb-2">
        {checklist.map(item => (
          <div key={item.id} className="flex items-center gap-2 group">
            <input type="checkbox" checked={item.done} onChange={() => toggleItem(item.id)} className="flex-shrink-0" />
            {editingId === item.id ? (
              <input
                value={editingText}
                onChange={e => setEditingText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null) }}
                onBlur={saveEdit}
                autoFocus
                className="flex-1 text-sm rounded px-2 py-0.5 outline-none"
                style={{ border: '0.5px solid var(--morandi-pink-text)', background: 'white' }}
              />
            ) : (
              <span
                onDoubleClick={() => { setEditingId(item.id); setEditingText(item.text) }}
                className={`text-sm flex-1 cursor-text ${item.done ? 'line-through' : ''}`}
                style={{ color: item.done ? 'var(--text-muted)' : 'var(--text-primary)' }}
              >{item.text}</span>
            )}
            <button onClick={() => deleteItem(item.id)} className="opacity-0 group-hover:opacity-100 text-lg leading-none" style={{ color: 'var(--morandi-pink-text)' }}>&times;</button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addItem()}
          placeholder="Add checklist item..."
          className="flex-1 text-sm rounded-lg px-3 py-1.5 outline-none"
          style={{ background: 'white', border: '0.5px solid var(--card-border)', color: 'var(--text-primary)' }}
        />
        <button onClick={addItem} className="text-xs px-3 py-1.5 rounded-lg text-white" style={{ background: 'var(--morandi-pink-text)' }}>Add</button>
      </div>
    </div>
  )
}

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [editMode, setEditMode] = useState(false)
  if (editMode) {
    return (
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={() => setEditMode(false)}
        autoFocus
        placeholder="e.g. 9:15 AM"
        className="text-xs bg-transparent outline-none w-20"
        style={{ color: 'var(--text-secondary)' }}
      />
    )
  }
  return (
    <div className="flex items-center gap-1">
      <select
        value={TIME_OPTIONS.includes(value) ? value : ''}
        onChange={e => onChange(e.target.value)}
        className="text-xs bg-transparent outline-none cursor-pointer max-w-[90px]"
        style={{ color: 'var(--text-secondary)' }}
      >
        <option value="">Time...</option>
        {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      <button onClick={() => setEditMode(true)} className="text-xs" style={{ color: 'var(--text-muted)' }}>✎</button>
    </div>
  )
}

export default function WeeklyPlannerPage({ user, totalWeeks: initialWeeks = 3 }: Props) {
  const [slots, setSlots] = useState<WeeklySlot[]>([])
  const [dayNotes, setDayNotes] = useState<Record<string, string>>({})
  const [activeWeek, setActiveWeek] = useState(1)
  const [openNotesId, setOpenNotesId] = useState<string | null>(null)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showMoveMenu, setShowMoveMenu] = useState<string | null>(null)
  const [deletedSlots, setDeletedSlots] = useState<WeeklySlot[]>([])
  const [showUndo, setShowUndo] = useState(false)
  const totalWeeks = initialWeeks

  useEffect(() => { fetchSlots(); fetchDayNotes() }, [user])

  const fetchSlots = async () => {
    const { data } = await supabase
      .from('weekly_slots').select('*')
      .eq('user_id', user.id)
      .order('position', { ascending: true })
    if (data) setSlots(data)
  }

  const fetchDayNotes = async () => {
    const { data } = await supabase.from('weekly_day_notes').select('*').eq('user_id', user.id)
    if (data) {
      const map: Record<string, string> = {}
      data.forEach(row => { map[`${row.week_number}-${row.day}`] = row.notes })
      setDayNotes(map)
    }
  }

  const updateDayNote = async (week: number, day: string, notes: string) => {
    const key = `${week}-${day}`
    setDayNotes(prev => ({ ...prev, [key]: notes }))
    await supabase.from('weekly_day_notes').upsert({
      user_id: user.id, week_number: week, day, notes
    }, { onConflict: 'user_id,week_number,day' })
  }

  const addSlot = async (day: string, week: number) => {
    const daySlots = slots.filter(s => s.day === day && s.week_number === week)
    const { data } = await supabase.from('weekly_slots').insert({
      user_id: user.id, day, time_slot: '', task: '', notes: '', progress: '0%',
      position: daySlots.length, week_number: week, checklist: []
    }).select().single()
    if (data) setSlots(prev => [...prev, data])
  }

  const updateSlot = async (id: string, updates: Partial<WeeklySlot>) => {
    setSlots(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
    await supabase.from('weekly_slots').update(updates).eq('id', id)
  }

  const deleteSlot = async (id: string) =>
 {
    const slot = slots.find(s => s.id === id)
    if (slot) { setDeletedSlots([slot]); setShowUndo(true); setTimeout(() => setShowUndo(false), 5000) }
    setSlots(prev => prev.filter(s => s.id !== id))
    await supabase.from('weekly_slots').delete().eq('id', id)
  }

  const undoDelete = async () => {
    if (deletedSlots.length === 0) return
    const slot = deletedSlots[0]
    const { data } = await supabase.from('weekly_slots').insert({
      user_id: slot.user_id, day: slot.day, time_slot: slot.time_slot,
      task: slot.task, notes: slot.notes, progress: slot.progress,
      position: slot.position, week_number: slot.week_number, checklist: slot.checklist
    }).select().single()
    if (data) setSlots(prev => [...prev, data])
    setDeletedSlots([])
    setShowUndo(false)
  }

  const moveSlot = async (id: string, newDay: string, newWeek: number) => {
    setSlots(prev => prev.map(s => s.id === id ? { ...s, day: newDay, week_number: newWeek } : s))
    await supabase.from('weekly_slots').update({ day: newDay, week_number: newWeek }).eq('id', id)
    setShowMoveMenu(null)
  }

  const resetWeek = async () => {
    const weekSlotIds = slots.filter(s => (s.week_number ?? 1) === activeWeek).map(s => s.id)
    setSlots(prev => prev.filter(s => (s.week_number ?? 1) !== activeWeek))
    for (const id of weekSlotIds) await supabase.from('weekly_slots').delete().eq('id', id)
    for (const day of DAYS) {
      const key = `${activeWeek}-${day}`
      setDayNotes(prev => { const n = { ...prev }; delete n[key]; return n })
      await supabase.from('weekly_day_notes').delete().eq('user_id', user.id).eq('week_number', activeWeek).eq('day', day)
    }
    setShowResetConfirm(false)
  }

  const timeToMinutes = (t: string): number => {
    if (!t) return -1
    const match = t.match(/(\d+):(\d+)\s*(AM|PM)/i)
    if (!match) return -1
    let h = parseInt(match[1])
    const m = parseInt(match[2])
    const isPM = match[3].toUpperCase() === 'PM'
    if (isPM && h !== 12) h += 12
    if (!isPM && h === 12) h = 0
    return h * 60 + m
  }

  const weekSlots = slots.filter(s => (s.week_number ?? 1) === activeWeek)

  return (
    <div>
      {showUndo && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 text-white text-sm px-4 py-2.5 rounded-xl flex items-center gap-3 z-50 shadow-lg" style={{ background: '#4A4040' }}>
          <span>Slot deleted</span>
          <button onClick={undoDelete} className="font-semibold" style={{ color: 'var(--morandi-pink)' }}>Undo</button>
        </div>
      )}

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Planner</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {Array.from({ length: totalWeeks }, (_, i) => i + 1).map(w => (
            <button key={w} onClick={() => setActiveWeek(w)}
              className="text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{ background: activeWeek === w ? 'var(--morandi-pink-text)' : 'var(--morandi-pink)', color: activeWeek === w ? 'white' : 'var(--morandi-pink-text)' }}>
              Week {w}
            </button>
          ))}
          {!showResetConfirm ? (
            <button onClick={() => setShowResetConfirm(true)}
              className="text-xs px-3 py-1.5 rounded-lg border"
              style={{ borderColor: '#E8C0C0', color: '#C07070' }}>
              Reset week
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-xs" style={{ color: '#C07070' }}>Sure?</span>
              <button onClick={resetWeek} className="text-xs px-2 py-1 rounded-lg text-white" style={{ background: '#C07070' }}>Yes</button>
              <button onClick={() => setShowResetConfirm(false)} className="text-xs px-2 py-1 rounded-lg" style={{ background: 'var(--morandi-linen)', color: 'var(--text-secondary)' }}>No</button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-5">
        {DAYS.map(day => {
          const daySlots = weekSlots
            .filter(s => s.day === day)
            .sort((a, b) => {
              const ma = timeToMinutes(a.time_slot), mb = timeToMinutes(b.time_slot)
              if (ma === -1) return 1; if (mb === -1) return -1
              return ma - mb
            })
          const noteKey = `${activeWeek}-${day}`
          return (
            <div key={day} className="rounded-xl border overflow-visible" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
              <div className="px-4 pt-3 pb-2 border-b" style={{ borderColor: 'var(--divider)' }}>
                <input
                  value={dayNotes[noteKey] || ''}
                  onChange={e => updateDayNote(activeWeek, day, e.target.value)}
                  placeholder={`Notes for ${day}...`}
                  className="w-full text-xs rounded-lg px-3 py-1.5 outline-none"
                  style={{ background: 'var(--morandi-pink)', color: 'var(--morandi-pink-text)', border: '0.5px solid var(--card-border)' }}
                />
              </div>
              <div className="px-4 py-2.5 flex items-center justify-between border-b" style={{ background: 'var(--section-header)', borderColor: 'var(--divider)' }}>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{day}</span>
                <button onClick={() => addSlot(day, activeWeek)} className="text-xs px-2.5 py-1 rounded-lg text-white" style={{ background: 'var(--morandi-pink-text)' }}>+ Add</button>
              </div>
              <div>
                {daySlots.map(slot => {
                  const isDone = slot.progress === '100%'
                  return (
                    <div key={slot.id}>
                      <div className="flex items-center gap-2 px-3 py-2.5 group border-b" style={{ borderColor: 'var(--divider)', background: isDone ? '#F4F8F4' : undefined }}>
                        <div className="flex-shrink-0 w-5 flex items-center justify-center">
                          {isDone ? (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ color: 'var(--morandi-sage-text)' }}>
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          ) : <div className="w-3.5 h-3.5" />}
                        </div>
                        <TimeInput value={slot.time_slot} onChange={v => updateSlot(slot.id, { time_slot: v })} />
                        <input
                          value={slot.task}
                          onChange={e => updateSlot(slot.id, { task: e.target.value })}
                          placeholder="Task..."
                          className="flex-1 text-sm bg-transparent outline-none min-w-0"
                          style={{ color: isDone ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: isDone ? 'line-through' : 'none' }}
                        />
                        <select
                          value={slot.progress}
                          onChange={e => updateSlot(slot.id, { progress: e.target.value as Progress })}
                          className="text-xs px-2 py-0.5 rounded-full border-0 outline-none cursor-pointer flex-shrink-0"
                          style={{ background: isDone ? 'var(--morandi-sage)' : 'var(--morandi-pink)', color: isDone ? 'var(--morandi-sage-text)' : 'var(--morandi-pink-text)' }}
                        >
                          {PROGRESS_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setOpenNotesId(openNotesId === slot.id ? null : slot.id)} className="p-1" style={{ color: openNotesId === slot.id ? 'var(--morandi-pink-text)' : 'var(--text-muted)' }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                              <polyline points="14 2 14 8 20 8"/>
                              <line x1="16" y1="13" x2="8" y2="13"/>
                              <line x1="16" y1="17" x2="8" y2="17"/>
                            </svg>
                          </button>
                          <div className="relative">
                            <button onClick={() => setShowMoveMenu(showMoveMenu === slot.id ? null : slot.id)} className="p1" style={{ color: 'var(--text-muted)' }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="5 9 2 12 5 15"/>
                                <polyline points="9 5 12 2 15 5"/>
                                <line x1="2" y1="12" x2="22" y2="12"/>
                                <line x1="12" y1="2" x2="12" y2="22"/>
                              </svg>
                            </button>
                            {showMoveMenu === slot.id && (
                              <div className="absolute right-0 top-6 rounded-xl shadow-xl border w-48 z-50 max-h-64 overflow-y-auto" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
                                <p className="text-xs font-medium px-3 pt-2 pb-1" style={{ color: 'var(--morandi-pink-text)' }}>Move to...</p>
                                {Array.from({ length: totalWeeks }, (_, i) => i + 1).map(w => (
                                  <div key={w}>
                                    <p className="text-xs px-3 py-1" style={{ color: 'var(--text-muted)', background: 'var(--section-header)' }}>Week {w}</p>
                                    {DAYS.filter(d => !(d === day && w === activeWeek)).map(d => (
                                      <button key={d} onClick={() => moveSlot(slot.id, d, w)} className="w-full text-left px-3 py-1.5 text-xs hover:bg-pink-50" style={{ color: 'var(--text-primary)' }}>{d}</button>
                                    ))}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <button onClick={() => deleteSlot(slot.id)} className="text-lg leading-none p-1" style={{ color: 'var(--text-muted)' }}>&times;</button>
                        </div>
                      </div>
                      {openNotesId === slot.id && (
                        <div className="px-3 pb-2">
                          <SlotNotesPanel slot={slot} onUpdate={updateSlot} onClose={() => setOpenNotesId(null)} />
                        </div>
                      )}
                    </div>
                  )
                })}
                {daySlots.length === 0 && (
                  <div className="px-4 py-3 text-xs italic" style={{ color: 'var(--text-muted)' }}>No slots yet</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
