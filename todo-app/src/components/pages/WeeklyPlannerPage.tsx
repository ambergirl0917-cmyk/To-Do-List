'use client'
import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { WeeklySlot, Progress } from '@/lib/types'
import { getProgressColor } from '@/lib/showsAs'

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
const PROGRESS_OPTIONS: Progress[] = ['0%','20%','50%','70%','100%']

interface Props { user: User }

export default function WeeklyPlannerPage({ user }: Props) {
  const [slots, setSlots] = useState<WeeklySlot[]>([])
  const [view, setView] = useState<'list'|'calendar'>('list')

  useEffect(() => {
    fetchSlots()
  }, [user])

  const fetchSlots = async () => {
    const { data } = await supabase.from('weekly_slots').select('*').eq('user_id', user.id).order('position', { ascending: true })
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {DAYS.map(day => {
            const daySlots = slots.filter(s => s.day === day)
            return (
              <div key={day} className="bg-white rounded-xl border border-pink-100 overflow-hidden shadow-sm">
                <div className="bg-pink-50 px-4 py-2.5 border-b border-pink-100 flex items-center justify-between">
                  <span className="text-sm font-semibold text-pink-700">{day}</span>
                  <button onClick={() => addSlot(day)} className="text-xs bg-pink-500 text-white px-2.5 py-1 rounded-lg hover:bg-pink-600 transition-colors">+ Add slot</button>
                </div>
                <div className="divide-y divide-pink-50">
                  {daySlots.map(slot => (
                    <div key={slot.id} className="flex items-center gap-2 px-3 py-2 group">
                      <input value={slot.time_slot} onChange={e => updateSlot(slot.id, { time_slot: e.target.value })} placeholder="Time..." className="text-xs text-gray-500 bg-transparent outline-none w-20 flex-shrink-0" />
                      <input value={slot.task} onChange={e => updateSlot(slot.id, { task: e.target.value })} placeholder="Task..." className="flex-1 text-sm text-gray-700 bg-transparent outline-none min-w-0" />
                      <input type="date" value={slot.date || ''} onChange={e => updateSlot(slot.id, { date: e.target.value || null })} className="text-xs text-gray-400 bg-transparent outline-none w-24 flex-shrink-0" />
                      <select value={slot.progress} onChange={e => updateSlot(slot.id, { progress: e.target.value as Progress })} className={`text-xs px-2 py-0.5 rounded-full border-0 outline-none cursor-pointer flex-shrink-0 ${getProgressColor(slot.progress)}`}>
                        {PROGRESS_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <button onClick={() => deleteSlot(slot.id)} className="text-pink-200 hover:text-pink-400 opacity-0 group-hover:opacity-100 text-lg leading-none flex-shrink-0">&times;</button>
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
          <div className="grid min-w-max" style={{ gridTemplateColumns: '80px repeat(7, 1fr)' }}>
            <div className="bg-pink-50 p-2 text-xs text-pink-400 font-medium border-b border-r border-pink-100">Time</div>
            {DAYS.map(day => (
              <div key={day} className="bg-pink-50 p-2 text-xs text-pink-700 font-semibold border-b border-r border-pink-100 text-center">{day.slice(0,3)}</div>
            ))}
            {Array.from({ length: 14 }, (_, i) => {
              const hour = i + 7
              const timeStr = `${hour.toString().padStart(2,'0')}:00`
              return (
                <>
                  <div key={`time-${i}`} className="p-2 text-xs text-gray-400 border-b border-r border-pink-50">{timeStr}</div>
                  {DAYS.map(day => {
                    const matchingSlot = slots.find(s => s.day === day && s.time_slot === timeStr)
                    return (
                      <div key={`${day}-${i}`} className="p-1 border-b border-r border-pink-50 min-h-8">
                        {matchingSlot && (
                          <div className="bg-pink-100 text-pink-700 text-xs rounded p-1 truncate">{matchingSlot.task}</div>
                        )}
                      </div>
                    )
                  })}
                </>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
