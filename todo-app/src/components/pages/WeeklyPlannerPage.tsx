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
