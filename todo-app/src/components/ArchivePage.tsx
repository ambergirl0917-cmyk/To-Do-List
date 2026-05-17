'use client'
import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { getShowsAs } from '@/lib/utils'
import type { Task } from './AppShell'

export default function ArchivePage({ user }: { user: User }) {
  const [archived, setArchived] = useState<Task[]>([])

  useEffect(() => {
    supabase.from('tasks').select('*').eq('user_id', user.id).eq('is_archived', true).order('updated_at', { ascending: false })
      .then(({ data }) => { if (data) setArchived(data as Task[]) })
  }, [user.id])

  const restore = async (id: string) => {
    await supabase.from('tasks').update({ is_archived: false }).eq('id', id)
    setArchived(a => a.filter(t => t.id !== id))
  }

  const deleteForever = async (id: string) => {
    if (!confirm('Delete forever?')) return
    await supabase.from('tasks').delete().eq('id', id)
    setArchived(a => a.filter(t => t.id !== id))
  }

  return (
    <div>
      <h2 style={{ fontFamily: 'Playfair Display, serif', color: '#993556', fontSize: 20, marginBottom: 16 }}>🗂 Archive</h2>
      {archived.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#ccc', fontSize: 14 }}>No archived tasks yet 🌸</div>
      ) : (
        <div className="section-card">
          {archived.map((task, idx) => (
            <div key={task.id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 90px 100px', gap: 8, padding: '8px 12px', borderBottom: '1px solid #FDE8F0', background: idx % 2 === 0 ? '#FFF5F8' : 'white', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#555' }}>{task.task}</div>
                <span style={{ fontSize: 10, color: '#B5476A', background: '#FDE8F0', padding: '1px 6px', borderRadius: 20 }}>{task.section.replace(/-/g, ' ')}</span>
              </div>
              <div style={{ fontSize: 11, color: '#999' }}>{task.due_date ? getShowsAs(task.due_date) : ''}</div>
              <div style={{ fontSize: 11, color: '#2E7D32', background: '#C8E6C9', borderRadius: 20, padding: '2px 8px', textAlign: 'center' }}>{task.progress}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => restore(task.id)} style={{ background: '#FDE8F0', border: 'none', color: '#B5476A', borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}>Restore</button>
                <button onClick={() => deleteForever(task.id)} style={{ background: '#FFCDD2', border: 'none', color: '#993556', borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
