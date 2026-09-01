'use client'
import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Deadline } from '@/lib/types'
import { getShowsAs, getDaysUntil } from '@/lib/showsAs'

interface Props { 
  user: User
  onDeadlineChange?: () => void
}

export default function DeadlinesPage({ user, onDeadlineChange }: Props) {
  const [deadlines, setDeadlines] = useState<Deadline[]>([])

  useEffect(() => { fetchDeadlines() }, [user])

  const fetchDeadlines = async () => {
    const { data } = await supabase.from('deadlines').select('*').eq('user_id', user.id).order('due_date', { ascending: true, nullsFirst: false })
    if (data) setDeadlines(data)
  }

  const addDeadline = async () => {
    const { data } = await supabase.from('deadlines').insert({
      user_id: user.id, subject: '', task: '', due_date: null, priority: 'Medium', status: 'Not Started', position: deadlines.length, reminder_days: null
    }).select().single()
    if (data) { setDeadlines(prev => [...prev, data]); onDeadlineChange?.() }
  }

  const updateDeadline = async (id: string, updates: Partial<Deadline>) => {
    setDeadlines(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d))
    await supabase.from('deadlines').update(updates).eq('id', id)
    onDeadlineChange?.()
  }

  const deleteDeadline = async (id: string) => {
    setDeadlines(prev => prev.filter(d => d.id !== id))
    await supabase.from('deadlines').delete().eq('id', id)
    onDeadlineChange?.()
  }

  const sortByDate = () => {
    const sorted = [...deadlines].sort((a, b) => {
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    })
    setDeadlines(sorted)
  }

  const priorityColor = (p: string) => {
    if (p === 'High') return 'bg-red-100 text-red-600'
    if (p === 'Medium') return 'bg-yellow-100 text-yellow-700'
    return 'bg-green-100 text-green-700'
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Deadlines</h2>
        <div className="flex gap-2">
          <button onClick={sortByDate} className="text-xs border px-3 py-1.5 rounded-lg transition-colors" style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}>
            Sort by date
          </button>
          <button onClick={addDeadline} className="text-xs px-3 py-1.5 rounded-lg transition-colors text-white" style={{ background: 'var(--morandi-pink-text)' }}>
            + Add deadline
          </button>
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
        <div className="grid text-xs font-medium px-4 py-2.5 border-b" style={{ gridTemplateColumns: '1.5fr 2fr 110px 100px 80px 100px 80px 24px', color: 'var(--text-muted)', background: 'var(--section-header)', borderColor: 'var(--divider)' }}>
          <span>Subject</span><span>Task</span><span>Due Date</span><span>Shows As</span><span>Priority</span><span>Status</span><span>Remind</span><span/>
        </div>

        {deadlines.map(d => {
          const days = getDaysUntil(d.due_date)
          const threshold = d.reminder_days ?? 2
          const isUrgent = days !== null && days >= 0 && days <= threshold
          return (
            <div key={d.id}
              className="grid items-center px-4 py-2.5 border-b group gap-2 transition-colors hover:bg-pink-50/30"
              style={{ gridTemplateColumns: '1.5fr 2fr 110px 100px 80px 100px 80px 24px', borderColor: 'var(--divider)', background: isUrgent ? 'var(--urgent-today-bg)' : undefined }}>
              <input value={d.subject} onChange={e => updateDeadline(d.id, { subject: e.target.value })}
                placeholder="Subject..." className="text-sm bg-transparent outline-none" style={{ color: 'var(--text-primary)' }} />
              <input value={d.task} onChange={e => updateDeadline(d.id, { task: e.target.value })}
                placeholder="Task..." className="text-sm bg-transparent outline-none" style={{ color: 'var(--text-primary)' }} />
              <input type="date" value={d.due_date || ''} onChange={e => updateDeadline(d.id, { due_date: e.target.value || null })}
                className="text-xs bg-transparent outline-none" style={{ color: 'var(--text-secondary)' }} />
              <span className={`text-xs italic ${isUrgent ? 'font-medium' : ''}`}
                style={{ color: isUrgent ? 'var(--urgent-today-text)' : 'var(--morandi-sand-text)' }}>
                {getShowsAs(d.due_date)}
              </span>
              <select value={d.priority} onChange={e => updateDeadline(d.id, { priority: e.target.value as any })}
                className={`text-xs px-2 py-1 rounded-full border-0 outline-none cursor-pointer ${priorityColor(d.priority)}`}>
                <option>High</option><option>Medium</option><option>Low</option>
              </select>
              <select value={d.status} onChange={e => updateDeadline(d.id, { status: e.target.value as any })}
                className="text-xs bg-transparent outline-none cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
                <option>Not Started</option><option>In Progress</option><option>Done</option>
              </select>
              <div className="flex items-center gap-1">
                <input
                  type="number" min="1" max="60"
                  value={d.reminder_days ?? ''}
                  placeholder="2"
                  onChange={e => updateDeadline(d.id, { reminder_days: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-10 text-xs bg-transparent outline-none border-b"
                  style={{ borderColor: 'var(--divider)', color: 'var(--text-secondary)' }}
                />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>d</span>
              </div>
              <button onClick={() => deleteDeadline(d.id)}
                className="opacity-0 group-hover:opacity-100 text-lg leading-none transition-opacity"
                style={{ color: 'var(--text-muted)' }}>&times;</button>
            </div>
          )
        })}

        {deadlines.length === 0 && (
          <div className="px-4 py-8 text-center text-sm italic" style={{ color: 'var(--text-muted)' }}>
            No deadlines yet
          </div>
        )}
      </div>
    </div>
  )
}
