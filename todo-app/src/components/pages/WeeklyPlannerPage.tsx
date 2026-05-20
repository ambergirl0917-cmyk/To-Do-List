'use client'
import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { WeeklySlot, Progress } from '@/lib/types'
import { getProgressColor } from '@/lib/showsAs'

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
const PROGRESS_OPTIONS: Progress[] = ['0%','20%','50%','70%','100%']

const TIME_OPTIONS = [
  '6:00 AM','6:30 AM','7:00 AM','7:30 AM','8:00 AM','8:30 AM',
  '9:00 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM',
  '12:00 PM','12:30 PM','1:00 PM','1:30 PM','2:00 PM','2:30 PM',
  '3:00 PM','3:30 PM','4:00 PM','4:30 PM','5:00 PM','5:30 PM',
  '6:00 PM','6:30 PM','7:00 PM','7:30 PM','8:00 PM','8:30 PM',
  '9:00 PM','9:30 PM','10:00 PM',
]

interface Props { user: User }

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

export default function WeeklyPlannerPage({ user }: Props) {
  const [slots, setSlots] = useState<WeeklySlot[]>([])
  const [view, setView] = useState<'list'|'calendar'>('list')

  useEffect(() => { fetchSlots() }, [user])

  const fetchSlots = async () => {
    const { data } = await supabase
      .from('weekly_slots').select('*')
      .eq('user_id', user.id)
      .order('position', { ascending: true })
    if (data) setSlots(data)
  }

  const addSlot = async (day: string) => {
    const daySlots = slots.filter(s => s.day === day)
    const { data } = await supabase.from('weekly_slots').insert({
      user_id: user.id, day, time_slot: '', task: '', notes: '', progress: '0%', position: daySlots.length
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

  const timeToHour = (t: string): number => {
    if (!t) return -1
    const match = t.match(/(\d+):(\d+)\s*(AM|PM)/i)
    if (!match) return -1
    let h = parseInt(match[1])
    const isPM = match[3].toUpperCase() === 'PM'
    if (isPM && h !== 12) h += 12
    if (!isPM && h === 12) h = 0
    return h
  }

  const CALENDAR_HOURS = Array.from({ length: 17 }, (_, i) => i + 6)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-pink-700">Weekly Planner</h2>
        <div className="flex bg-pink-100 rounded-lg p-0.5">
          <button onClick={() => setView('list')} className={`text-xs px-3 py-1.5 rounded-md transition-colors ${view==='list' ? 'bg-white text-pink-700 shadow-sm font-medium' : 'text-pink-500'}`}>List</button>
          <button onClick={() => setView('calendar')} className={`text-xs px-3 py-1.5 rounded-md transition-colors ${view==='calendar' ? 'bg-white text-pink-700 shadow-sm font-medium' : 'text-pink-500'}`}>Calendar</button>
        </div>
      </div>

      {view === 'list' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DAYS.map(day => {
            const daySlots = slots.filter(s => s.day === day).sort((a, b) => {
              const ha = timeToHour(a.time_slot), hb = timeToHour(b.time_slot)
              if (ha === -1) return 1
              if (hb === -1) return -1
              return ha - hb
            })
            return (
              <div key={day} className="bg-white rounded-xl border border-pink-100 overflow-hidden shadow-sm">
                <div className="bg-pink-50 px-4 py-2.5 border-b border-pink-100 flex items-center justify-between">
                  <span className="text-sm font-semibold text-pink-700">{day}</span>
                  <button onClick={() => addSlot(day)} className="text-xs bg-pink-500 text-white px-2.5 py-1 rounded-lg hover:bg-pink-600 transition-colors">+ Add</button>
                </div>
                <div className="divide-y divide-pink-50">
                  {daySlots.map(slot => (
                    <div key={slot.id} className="flex items-center gap-2 px-3 py-2 group">
                      <TimeInput value={slot.time_slot} onChange={v => updateSlot(slot.id, { time_slot: v })} />
                      <input value={slot.task} onChange={e => updateSlot(slot.id, { task: e.target.value })}
                        placeholder="Task..." className="flex-1 text-sm text-gray-700 bg-transparent outline-none min-w-0" />
                      <select value={slot.progress} onChange={e => updateSlot(slot.id, { progress: e.target.value as Progress })}
                        className={`text-xs px-2 py-0.5 rounded-full border-0 outline-none cursor-pointer flex-shrink-0 ${getProgressColor(slot.progress)}`}>
                        {PROGRESS_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <button onClick={() => deleteSlot(slot.id)}
                        className="text-pink-200 hover:text-pink-400 opacity-0 group-hover:opacity-100 text-lg leading-none flex-shrink-0">&times;</button>
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
      ) : (
        <div className="bg-white rounded-xl border border-pink-100 overflow-auto shadow-sm">
          <div className="min-w-[600px]">
            <div className="grid border-b border-pink-100" style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}>
              <div className="bg-pink-50 p-2 border-r border-pink-100" />
              {DAYS.map(day => (
                <div key={day} className="bg-pink-50 p-2 text-xs text-pink-700 font-semibold border-r border-pink-100 text-center last:border-r-0">
                  {day.slice(0,3)}
                </div>
              ))}
            </div>
            {CALENDAR_HOURS.map(hour => {
              const label = hour === 12 ? '12 PM' : hour < 12 ? `${hour} AM` : `${hour-12} PM`
              return (
                <div key={hour} className="grid border-b border-pink-50 last:border-b-0" style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}>
                  <div className="p-2 text-xs text-gray-400 border-r border-pink-50 text-right pr-2">{label}</div>
                  {DAYS.map(day => {
                    const daySlots = slots.filter(s => s.day === day && timeToHour(s.time_slot) === hour)
                    return (
                      <div key={day} className="p-1 border-r border-pink-50 last:border-r-0 min-h-[36px]">
                        {daySlots.map(slot => (
                          <div key={slot.id} className="bg-pink-100 text-pink-700 text-xs rounded px-1.5 py-0.5 mb-0.5 truncate">
                            {slot.task || '—'}
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
