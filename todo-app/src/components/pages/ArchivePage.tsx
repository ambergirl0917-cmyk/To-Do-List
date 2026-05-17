'use client'
import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Task } from '@/lib/types'

interface Props { user: User }

export default function ArchivePage({ user }: Props) {
  const [tasks, setTasks] = useState<Task[]>([])

  useEffect(() => {
    supabase.from('tasks').select('*, sections:section_id(name)').eq('user_id', user.id).eq('is_archived', true).order('updated_at', { ascending: false }).then(({ data }) => {
      if (data) setTasks(data)
    })
  }, [user])

  const restore = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    await supabase.from('tasks').update({ is_archived: false }).eq('id', id)
  }

  const deleteForever = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    await supabase.from('tasks').delete().eq('id', id)
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-pink-700 mb-4">Archive ({tasks.length})</h2>
      <div className="bg-white rounded-xl border border-pink-100 overflow-hidden shadow-sm">
        {tasks.map(task => (
          <div key={task.id} className="flex items-center gap-3 px-4 py-3 border-b border-pink-50 group">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-500 line-through truncate">{task.task || 'Untitled'}</p>
              <p className="text-xs text-pink-300">{(task as any).sections?.name}</p>
            </div>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => restore(task.id)} className="text-xs text-pink-500 hover:text-pink-700 border border-pink-200 px-2 py-1 rounded-lg transition-colors">Restore</button>
              <button onClick={() => deleteForever(task.id)} className="text-xs text-red-400 hover:text-red-600 border border-red-200 px-2 py-1 rounded-lg transition-colors">Delete</button>
            </div>
          </div>
        ))}
        {tasks.length === 0 && (
          <div className="px-4 py-8 text-center text-pink-200 text-sm italic">No archived tasks</div>
        )}
      </div>
    </div>
  )
}
