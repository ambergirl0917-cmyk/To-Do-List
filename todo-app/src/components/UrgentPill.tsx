'use client'
import { useState, useEffect, useRef } from 'react'
import { Task } from '@/lib/types'
import { getShowsAs, getDaysUntil } from '@/lib/showsAs'

interface UrgentPillProps { 
  tasks: Task[]
  upcomingTasks: Task[]
}

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

export default function UrgentPill({ tasks, upcomingTasks }: UrgentPillProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const totalCount = tasks.length + upcomingTasks.length
  if (totalCount === 0) return null

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1.5 rounded-full transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        <span className="font-medium hidden sm:inline">{tasks.length > 0 ? `${tasks.length} urgent` : `${upcomingTasks.length} upcoming`}</span>
        {tasks.length > 0 && (
          <span className="bg-red-400 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">{tasks.length}</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 bg-white rounded-xl shadow-xl border border-pink-100 w-72 z-50 overflow-hidden max-h-96 overflow-y-auto">
          {tasks.length > 0 && (
            <>
              <div className="bg-red-50 px-3 py-2 border-b border-red-100 sticky top-0">
                <p className="text-xs font-semibold text-red-600">🔴 Urgent — due within 2 days</p>
              </div>
              {tasks.map(task => {
                const days = getDaysUntil(task.due_date)
                const showsAs = getShowsAs(task.due_date)
                return (
                  <div key={task.id} className="flex items-start justify-between px-3 py-2.5 border-b border-pink-50 gap-3 bg-red-50/30">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{task.task || 'Untitled'}</p>
                      <span className="text-xs bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full mt-1 inline-block">
                        {SECTION_NAMES[task.section_id] || task.section_id}
                      </span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${
                      days === 0 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                    }`}>{showsAs}</span>
                  </div>
                )
              })}
            </>
          )}
          {upcomingTasks.length > 0 && (
            <>
              <div className="bg-pink-50 px-3 py-2 border-b border-pink-100 sticky top-0">
                <p className="text-xs font-semibold text-pink-600">📅 Coming up next</p>
              </div>
              {upcomingTasks.map(task => {
                const showsAs = getShowsAs(task.due_date)
                return (
                  <div key={task.id} className="flex items-start justify-between px-3 py-2.5 border-b border-pink-50 last:border-0 gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{task.task || 'Untitled'}</p>
                      <span className="text-xs bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full mt-1 inline-block">
                        {SECTION_NAMES[task.section_id] || task.section_id}
                      </span>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 bg-blue-50 text-blue-600">{showsAs}</span>
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}
    </div>
  )
}
