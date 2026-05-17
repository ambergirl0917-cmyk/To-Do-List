'use client'
import { useState } from 'react'
import { Task } from '@/lib/types'
import { getShowsAs, getDaysUntil } from '@/lib/showsAs'

interface UrgentPillProps { tasks: Task[] }

export default function UrgentPill({ tasks }: UrgentPillProps) {
  const [open, setOpen] = useState(false)

  if (tasks.length === 0) return null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1.5 rounded-full transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        <span className="font-medium">{tasks.length} urgent</span>
        <span className="bg-red-400 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">{tasks.length}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-10 bg-white rounded-xl shadow-xl border border-pink-100 w-64 z-50 animate-slideIn overflow-hidden">
          <div className="bg-pink-50 px-3 py-2 border-b border-pink-100">
            <p className="text-xs font-semibold text-pink-700">Due soon</p>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {tasks.map(task => {
              const days = getDaysUntil(task.due_date)
              const showsAs = getShowsAs(task.due_date)
              return (
                <div key={task.id} className="flex items-start justify-between px-3 py-2.5 border-b border-pink-50 last:border-0 gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{task.task || 'Untitled'}</p>
                    <span className="text-xs bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full mt-1 inline-block">
                      {(task as any).sections?.name || 'Task'}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${
                    days === 0 ? 'bg-red-100 text-red-700' :
                    days === 1 ? 'bg-orange-100 text-orange-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>{showsAs}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
