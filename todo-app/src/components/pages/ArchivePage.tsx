'use client'
import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Task } from '@/lib/types'

const SECTION_NAMES: Record<string, string> = {
  'todays-tasks': "Today's Tasks", 'asap': 'ASAP',
  'math': 'Math', 'english': 'English', 'chinese': 'Chinese',
  'economics': 'Economics', 'bm': 'BM', 'biology': 'Biology',
  'tok': 'TOK', 'ee': 'EE', 'cas': 'CAS', 'sat': 'SAT',
  'lirae': 'Lirae', 'competition-1': 'Competition 1',
  'competition-2': 'Competition 2', 'competition-3': 'Competition 3',
  'other-activities': 'Other Activities', 'common-app': 'Common App',
  'essays': 'Essays', 'others': 'Others',
}

interface Props { user: User }

export default function ArchivePage({ user }: Props) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchArchived() }, [user])

  const fetchArchived = async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_archived', true)
      .order('updated_at', { ascending: false })
    if (data) setTasks(data)
    setLoading(false)
  }

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
      {loading ? (
        <div className="text-pink-300 text-sm text-center py-8">Loading...</div>
      ) : (
        <div className="bg-white rounded-xl border border-pink-100 overflow-hidden shadow-sm">
          {tasks.map(task => (
            <div key={task.id} className="flex items-center gap-3 px-4 py-3 border-b border-pink-50 last:border-0 group">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-400 line-through truncate">{task.task || 'Untitled task'}</p>
                <p className="text-xs text-pink-300 mt-0.5">
                  {SECTION_NAMES[task.section_id] || task.section_id}
                  {task.due_date && <span className="ml-2">· {task.due_date}</span>}
                </p>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button onClick={() => restore(task.id)}
                  className="text-xs text-pink-500 hover:text-pink-700 border border-pink-200 px-2 py-1 rounded-lg transition-colors">
                  Restore
                </button>
                <button onClick={() => deleteForever(task.id)}
                  className="text-xs text-red-400 hover:text-red-600 border border-red-200 px-2 py-1 rounded-lg transition-colors">
                  Delete
                </button>
              </div>
            </div>
          ))}
          {tasks.length === 0 && (
            <div className="px-4 py-12 text-center text-pink-200 text-sm italic">
              No archived tasks yet. Check a task as done and it will appear here!
            </div>
          )}
        </div>
      )}
    </div>
  )
}
