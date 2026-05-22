'use client'
import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { WeeklySlot, Progress, ChecklistItem } from '@/lib/types'
import { getProgressColor } from '@/lib/showsAs'

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
const PROGRESS_OPTIONS: Progress[] = ['0%','20%','50%','70%','100%']

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
    <div className="bg-pink-50/50 border border-pink-100 rounded-xl px-4 py-3 mt-1 mb-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-pink-600">Notes & Checklist</span>
        <button onClick={onClose} className="text-pink-300 hover:text-pink-500 text-lg leading-none">&times;</button>
      </div>
      <textarea
        value={slot.notes || ''}
        onChange={e => onUpdate(slot.id, { notes: e.target.value })}
        placeholder="Add notes..."
        className="w-full text-sm text-gray-600 bg-white border border-pink-100 rounded-lg px-3 py-2 outline-none resize-none focus:border-pink-300 mb-2"
        rows={2}
      />
      <div className="space-y-1 mb-2">
        {checklist.map(item => (
          <div key={item.id} className="flex items-center gap-2 group">
            <input type="checkbox" checked={item.done} onChange={() => toggleItem(item.id)} className="accent-pink-500 flex-shrink-0" />
            {editingId === item.id ? (
              <input
                value={editingText}
                onChange={e => setEditingText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null) }}
                onBlur={saveEdit}
                autoFocus
                className="flex-1 text-sm bg-white border border-pink-300 rounded px-2 py-0.5 outline-none"
              />
            ) : (
              <span
                onDoubleClick={() => { setEditingId(item.id); setEditingText(item.text) }}
                className={`text-sm flex-1 cursor-text ${item.done ? 'line-through text-gray-400' : 'text-gray-600'}`}
              >{item.text}</span>
            )}
            <button onClick={() => deleteItem(item.id)} className="text-pink-200 hover:text-pink-400 opacity-0 group-hover:opacity-100 text-lg leading-none">&times;</button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addItem()}
          placeholder="Add checklist item..."
          className="flex-1 text-sm bg-white border border-pink-100 rounded-lg px-3 py-1.5 outline-none focus:border-pink-300"
        />
        <button onClick={addItem} className="text-xs bg-pink-500 text-white px-3 py-1.5 rounded-lg hover:bg-pink-600">Add</button>
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
        className="text-xs text-gray-500 bg-transparent outline-none w-20"
      />
    )
  }
  return (
    <div className="flex items-center gap-1">
      <select
        value={TIME_OPTIONS.includes(value) ? value : ''}
        onChange={e => onChange(e.target.value)}
        className="text-xs text-gray-500 bg-transparent outline-none cursor-pointer max-w-[90px]"
      >
        <option value="">Time...</option>
        {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      <button onClick={() => setEditMode(true)} className="text-pink-200 hover:text-pink-400 text-xs" title="Custom time">✎</button>
    </div>
  )
}

export default function WeeklyPlannerPage({ user, totalWeeks: initialWeeks = 3 }: Props) {
  const [slots, setSlots] = useState<WeeklySlot[]>([])
  const [weekNotes, setWeekNotes] = useState<Record<string, string>>({})
  const [totalWeeks, setTotalWeeks] = useState(initialWeeks)
  const [activeWeek, setActiveWeek] = useState(1)
  const [openNotesId, setOpenNotesId] = useState<string | null>(null)

  useEffect(() => { fetchSlots() }, [user])

  const fetchSlots = async () => {
    const { data } = await supabase
      .from('weekly_slots').select('*')
      .eq('user_id', user.id)
      .order('position', { ascending: true })
    if (data) setSlots(data)
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

  const deleteSlot = async (id: string) => {
    setSlots(prev => prev.filter(s => s.id !== id))
    await supabase.from('weekly_slots').delete().eq('id', id)
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
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-pink-700">Weekly Planner</h2>
        <div className="flex items-center gap-2">
          {Array.from({ length: totalWeeks }, (_, i) => i + 1).map(w => (
            <button
              key={w}
              onClick={() => setActiveWeek(w)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${activeWeek === w ? 'bg-pink-500 text-white' : 'bg-pink-100 text-pink-500 hover:bg-pink-200'}`}
            >
              Week {w}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {DAYS.map(day => {
          const daySlots = weekSlots
            .filter(s => s.day === day)
            .sort((a, b) => {
              const ma = timeToMinutes(a.time_slot), mb = timeToMinutes(b.time_slot)
              if (ma === -1) return 1
              if (mb === -1) return -1
              return ma - mb
            })
          const noteKey = `${activeWeek}-${day}`

          return (
            <div key={day} className="bg-white rounded-xl border border-pink-100 shadow-sm">
              {/* Day note */}
              <div className="px-4 pt-3 pb-2 border-b border-pink-50">
                <input
                  value={weekNotes[noteKey] || ''}
                  onChange={e => setWeekNotes(prev => ({ ...prev, [noteKey]: e.target.value }))}
                  placeholder={`Notes for ${day}...`}
                  className="w-full text-xs text-gray-500 bg-pink-50/50 border border-pink-100 rounded-lg px-3 py-1.5 outline-none focus:border-pink-300"
                />
              </div>

              {/* Day header */}
              <div className="bg-pink-50 px-4 py-2.5 flex items-center justify-between">
                <span className="text-sm font-semibold text-pink-700">{day}</span>
                <button onClick={() => addSlot(day, activeWeek)} className="text-xs bg-pink-500 text-white px-2.5 py-1 rounded-lg hover:bg-pink-600 transition-colors">+ Add</button>
              </div>

              {/* Slots */}
              <div className="divide-y divide-pink-50">
                {daySlots.map(slot => (
                  <div key={slot.id}>
                    <div className="flex items-center gap-2 px-3 py-2 group">
                      <TimeInput value={slot.time_slot} onChange={v => updateSlot(slot.id, { time_slot: v })} />
                      <input
                        value={slot.task}
                        onChange={e => updateSlot(slot.id, { task: e.target.value })}
                        placeholder="Task..."
                        className="flex-1 text-sm text-gray-700 bg-transparent outline-none min-w-0"
                      />
                      <select
                        value={slot.progress}
                        onChange={e => updateSlot(slot.id, { progress: e.target.value as Progress })}
                        className={`text-xs px-2 py-0.5 rounded-full border-0 outline-none cursor-pointer flex-shrink-0 ${getProgressColor(slot.progress)}`}
                      >
                        {PROGRESS_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setOpenNotesId(openNotesId === slot.id ? null : slot.id)}
                          className={`p-1 transition-colors ${openNotesId === slot.id ? 'text-pink-500' : 'text-pink-300 hover:text-pink-500'}`}
                          title="Notes & Checklist"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteSlot(slot.id)}
                          className="text-pink-200 hover:text-pink-400 text-lg leading-none p-1"
                        >&times;</button>
                      </div>
                    </div>
                    {openNotesId === slot.id && (
                      <div className="px-3 pb-2">
                        <SlotNotesPanel slot={slot} onUpdate={updateSlot} onClose={() => setOpenNotesId(null)} />
                      </div>
                    )}
                  </div>
                ))}
                {daySlots.length === 0 && (
                  <div className="px-4 py-3 text-xs text-pink-200 italic">No slots yet</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
