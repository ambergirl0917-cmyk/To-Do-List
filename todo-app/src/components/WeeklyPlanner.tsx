'use client'
import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const HOURS = Array.from({ length: 15 }, (_, i) => `${i + 7}:00`)

type Slot = {
  id: string
  day: string
  time_slot: string | null
  task: string | null
  notes: string | null
  date: string | null
  position: number
}

export default function WeeklyPlanner({ user }: { user: User }) {
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [slots, setSlots] = useState<Slot[]>([])

  useEffect(() => {
    supabase.from('weekly_slots').select('*').eq('user_id', user.id).order('position')
      .then(({ data }) => { if (data) setSlots(data as Slot[]) })
  }, [user.id])

  const addSlot = async (day: string) => {
    const maxPos = slots.filter(s => s.day === day).reduce((m, s) => Math.max(m, s.position), 0)
    const newSlot = { user_id: user.id, day, time_slot: null, task: null, notes: null, date: null, position: maxPos + 1 }
    const { data } = await supabase.from('weekly_slots').insert(newSlot).select().single()
    if (data) setSlots(s => [...s, data as Slot])
  }

  const updateSlot = async (id: string, updates: Partial<Slot>) => {
    setSlots(s => s.map(slot => slot.id === id ? { ...slot, ...updates } : slot))
    await supabase.from('weekly_slots').update(updates).eq('id', id)
  }

  const deleteSlot = async (id: string) => {
    setSlots(s => s.filter(slot => slot.id !== id))
    await supabase.from('weekly_slots').delete().eq('id', id)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'Playfair Display, serif', color: '#993556', fontSize: 20 }}>📅 Weekly Planner</h2>
        <div style={{ display: 'flex', border: '1px solid #FDE8F0', borderRadius: 20, overflow: 'hidden' }}>
          {(['list', 'calendar'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '5px 14px', fontSize: 12, border: 'none', cursor: 'pointer',
              background: view === v ? '#E8829F' : 'white', color: view === v ? 'white' : '#999',
              fontFamily: 'DM Sans, sans-serif'
            }}>{v === 'list' ? '☰ List' : '⊞ Calendar'}</button>
          ))}
        </div>
      </div>

      {view === 'list' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {DAYS.map(day => {
            const daySlots = slots.filter(s => s.day === day).sort((a, b) => a.position - b.position)
            return (
              <div key={day} className="section-card">
                <div className="section-header">
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#993556', fontFamily: 'Playfair Display, serif' }}>{day}</span>
                </div>
                <div style={{ padding: 8 }}>
                  {/* Column headers */}
                  <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 24px', gap: 6, padding: '2px 4px', borderBottom: '1px solid #FDE8F0', marginBottom: 4 }}>
                    <span style={{ fontSize: 9, color: '#ccc', fontWeight: 600 }}>TIME</span>
                    <span style={{ fontSize: 9, color: '#ccc', fontWeight: 600 }}>TASK</span>
                    <span></span>
                  </div>
                  {daySlots.map((slot, idx) => (
                    <div key={slot.id} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 24px', gap: 6, padding: '3px 4px', borderBottom: '1px solid #FFF5F8', background: idx % 2 === 0 ? '#FFF5F8' : 'white', alignItems: 'center' }}>
                      <input
                        value={slot.time_slot || ''}
                        onChange={e => updateSlot(slot.id, { time_slot: e.target.value })}
                        placeholder="9:00am"
                        style={{ border: 'none', background: 'transparent', fontSize: 11, color: '#999', outline: 'none', width: '100%', fontFamily: 'DM Sans, sans-serif' }}
                      />
                      <input
                        value={slot.task || ''}
                        onChange={e => updateSlot(slot.id, { task: e.target.value })}
                        placeholder="Add task..."
                        style={{ border: 'none', background: 'transparent', fontSize: 12, color: '#333', outline: 'none', width: '100%', fontFamily: 'DM Sans, sans-serif' }}
                      />
                      <button onClick={() => deleteSlot(slot.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ddd', fontSize: 12 }}>✕</button>
                    </div>
                  ))}
                  <div onClick={() => addSlot(day)} style={{ padding: '4px 4px', fontSize: 11, color: '#B5476A', cursor: 'pointer', opacity: 0.6, marginTop: 2 }}
                    onMouseOver={e => (e.currentTarget.style.opacity = '1')}
                    onMouseOut={e => (e.currentTarget.style.opacity = '0.6')}
                  >+ Add slot</div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `80px repeat(7, 1fr)`, minWidth: 700, border: '1px solid #FDE8F0', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ background: '#F9D6E3', padding: '8px 6px' }}></div>
            {DAYS.map(d => (
              <div key={d} style={{ background: '#F9D6E3', padding: '8px 6px', borderLeft: '1px solid #FDE8F0', fontSize: 11, fontWeight: 600, color: '#B5476A', textAlign: 'center' }}>{d.slice(0, 3)}</div>
            ))}
            {HOURS.map(hour => (
              <>
                <div key={hour} style={{ padding: '6px', fontSize: 10, color: '#ccc', borderTop: '1px solid #FDE8F0', textAlign: 'right', paddingRight: 8, background: 'white' }}>{hour}</div>
                {DAYS.map(day => {
                  const slot = slots.find(s => s.day === day && s.time_slot === hour)
                  return (
                    <div key={day} style={{ borderTop: '1px solid #FDE8F0', borderLeft: '1px solid #FDE8F0', padding: 4, background: 'white', minHeight: 32 }}>
                      {slot ? (
                        <div style={{ background: '#FDE8F0', borderRadius: 4, padding: '2px 6px', fontSize: 10, color: '#B5476A' }}>{slot.task}</div>
                      ) : (
                        <div onClick={() => addSlot(day)} style={{ cursor: 'pointer', height: '100%', minHeight: 28 }} />
                      )}
                    </div>
                  )
                })}
              </>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
