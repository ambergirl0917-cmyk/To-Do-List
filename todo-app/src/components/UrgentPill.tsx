'use client'
import { useState } from 'react'
import { Task } from '@/lib/types'

interface UrgentPillProps {
  tasks: Task[]
  upcomingTasks: Task[]
}

export default function UrgentPill({ tasks, upcomingTasks }: UrgentPillProps) {
  const [showDropdown, setShowDropdown] = useState(false)

  if (tasks.length === 0 && upcomingTasks.length === 0) return null

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(s => !s)}
        className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs px-2.5 py-1 rounded-full transition-colors"
      >
        {tasks.length > 0 && (
          <span className="w-2 h-2 bg-red-300 rounded-full animate-pulse" />
        )}
        {tasks.length > 0 ? (
          <span>{tasks.length} urgent</span>
        ) : (
          <span>{upcomingTasks.length} upcoming</span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 top-10 bg-white rounded-xl shadow-lg border border-pink-100 py-2 w-64 z-50">
          {tasks.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-xs font-semibold text-red-500 uppercase tracking-wide">
                Urgent (due soon)
              </div>
              {tasks.map(task => (
                <div key={task.id} className="px-3 py-2 hover:bg-pink-50 transition-colors">
                  <p className="text-sm text-gray-700 truncate">{task.title}</p>
                  <p className="text-xs text-red-400">{task.due_date}</p>
                </div>
              ))}
            </>
          )}
          {upcomingTasks.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-xs font-semibold text-pink-400 uppercase tracking-wide border-t border-pink-50 mt-1">
                Coming up
              </div>
              {upcomingTasks.map(task => (
                <div key={task.id} className="px-3 py-2 hover:bg-pink-50 transition-colors">
                  <p className="text-sm text-gray-700 truncate">{task.title}</p>
                  <p className="text-xs text-pink-300">{task.due_date}</p>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
