'use client'
import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Deadline } from '@/lib/types'
import { getShowsAs, getDaysUntil } from '@/lib/showsAs'

interface Props { user: User }

export default function DeadlinesPage({ user }: Props) {
  const [deadlines, setDeadlines] = useState<Deadline[]>([])

  useEffect(() => { fetchDeadlines() }, [user])

  const fetchDeadlines = async () => {
    const { data } = await supabase.from('deadlines').select('*').eq('user_id', user.id).order('due_date', { ascending: true, nullsFirst: false })
    if (data) setDeadlines(data)
  }

  const addDeadline = async () => {
    const { data } = await supabase.from('deadlines').insert({
      user_id: user.id, subject: '', task: '', due_date: null, priority: 'Medium', status: 'Not Started', position: deadlines.length
    }).select().single()
    if (data) setDeadlines(prev => [...prev, data])
  }

  const updateDeadline = async (id: string, updates: Partial<Deadline>) => {
    setDeadlines(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d))
    await supabase.from('deadlines').update(updates).eq('id', id)
  }

  const deleteDeadline = async (id: string) => {
    setDeadlines(prev => prev.filter(d => d.id !== id))
    await supabase.from('deadlines').delete().eq('id', id)
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
    if (p === 'High') return 'bg-red-100 text-red-700'
    if (p === 'Medium') return 'bg-yellow-100 text-yellow-700'
    return 'bg-green-100 text-green-700'
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-pink-700">Deadlines</h2>
        <div className="flex gap-2">
          <button onClick={sortByDate} className="text-xs text-pink-500 hover:text-pink-700 border border-pink-200 px-3 py-1.5 rounded-lg transition-colors">Sort by date</button>
          <button onClick={addDeadline} className="text-xs bg-pink-500 text-white px-3 py-1.5 rounded-lg hover:bg-pink-600 transition-colors">+ Add deadline</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-pink-100 overflow-hidden shadow-sm">
        <div className="grid text-xs text-pink-400 font-medium px-4 py-2 bg-pink-50 border-b border-pink-100" style={{gridTemplateColumns:'1.5fr 2fr 110px 100px 80px 100px 24px'}}>
          <span>Subject</span><span>Task</span><span>Due Date</span><span>Shows As</span><span>Priority</span><span>Status</span><span/>
        </div>
        {deadlines.map(d => {
          const days = getDaysUntil(d.due_date)
          const isUrgent = days !== null && days >= 0 && days <= 2
          return (
            <div key={d.id} className={`grid items-center px-4 py-2 border-b border-pink-50 group gap-2 ${isUrgent ? 'bg-red-50' : ''}`} style={{gridTemplateColumns:'1.5fr 2fr 110px 100px 80px 100px 24px'}}>
              <input value={d.subject} onChange={e => updateDeadline(d.id, { subject: e.target.value })} placeholder="Subject..." className="text-sm text-gray-700 bg-transparent outline-none" />
              <input value={d.task} onChange={e => updateDeadline(d.id, { task: e.target.value })} placeholder="Task..." className="text-sm text-gray-700 bg-transparent outline-none" />
              <input type="date" value={d.due_date || ''} onChange={e => updateDeadline(d.id, { due_date: e.target.value || null })} className="text-xs text-gray-500 bg-transparent outline-none" />
              <span className={`text-xs italic ${isUrgent ? 'text-red-500 font-medium' : 'text-amber-600'}`}>{getShowsAs(d.due_date)}</span>
              <select value={d.priority} onChange={e => updateDeadline(d.id, { priority: e.target.value as any })} className={`text-xs px-2 py-1 rounded-full border-0 outline-none cursor-pointer ${priorityColor(d.priority)}`}>
                <option>High</option><option>Medium</option><option>Low</option>
              </select>
              <select value={d.status} onChange={e => updateDeadline(d.id, { status: e.target.value as any })} className="text-xs text-gray-600 bg-transparent outline-none cursor-pointer">
                <option>Not Started</option><option>In Progress</option><option>Done</option>
              </select>
              <button onClick={() => deleteDeadline(d.id)} className="text-pink-200 hover:text-pink-400 opacity-0 group-hover:opacity-100 text-lg leading-none">&times;</button>
            </div>
          )
        })}
        {deadlines.length === 0 && (
          <div className="px-4 py-8 text-center text-pink-200 text-sm italic">No deadlines yet</div>
        )}
      </div>
    </div>
  )
}
