'use client'
import { useState, useEffect, useRef } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Task, Deadline } from '@/lib/types'

interface TopBarProps {
  user: User
  urgentTasks: Task[]
  upcomingTasks: Task[]
  urgentDeadlines: Deadline[]
  upcomingDeadlines: Deadline[]
  focusMode: boolean
  onToggleFocus: () => void
  searchQuery: string
  onSearchChange: (q: string) => void
  onToggleSidebar: () => void
  onQuickAdd: () => void
}

export default function TopBar({
  user, urgentTasks, upcomingTasks, urgentDeadlines, upcomingDeadlines,
  focusMode, onToggleFocus, searchQuery, onSearchChange, onToggleSidebar, onQuickAdd
}: TopBarProps) {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showUrgent, setShowUrgent] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const urgentRef = useRef<HTMLDivElement>(null)

  const avatar = user.user_metadata?.avatar_url
  const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
  const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  const handleSignOut = async () => { await supabase.auth.signOut() }

  const todayStr = new Date().toISOString().split('T')[0]

  // Get Monday to Sunday of current week
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  const mondayStr = monday.toISOString().split('T')[0]
  const sundayStr = sunday.toISOString().split('T')[0]

  const totalUrgent = urgentTasks.length + urgentDeadlines.length
  const totalWeek = upcomingTasks.filter(t => t.due_date && t.due_date >= mondayStr && t.due_date <= sundayStr).length +
    upcomingDeadlines.filter(d => d.due_date && d.due_date >= mondayStr && d.due_date <= sundayStr).length +
    urgentTasks.filter(t => t.due_date && t.due_date >= mondayStr && t.due_date <= sundayStr).length +
    urgentDeadlines.filter(d => d.due_date && d.due_date >= mondayStr && d.due_date <= sundayStr).length

  // Close on outside click
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (urgentRef.current && !urgentRef.current.contains(e.target as Node)) {
        setShowUrgent(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // All urgent items sorted by date
  const allUrgentItems = [
  ...urgentTasks.map(t => ({ type: 'task' as const, id: t.id, title: t.task, date: t.due_date, isUrgent: true })),
  ...urgentDeadlines.map(d => ({ type: 'deadline' as const, id: d.id, title: `${d.subject}: ${d.task}`, date: d.due_date, isUrgent: true })),
  ...upcomingTasks.map(t => ({ type: 'task' as const, id: t.id, title: t.task, date: t.due_date, isUrgent: false })),
  ...upcomingDeadlines.map(d => ({ type: 'deadline' as const, id: d.id, title: `${d.subject}: ${d.task}`, date: d.due_date, isUrgent: false })),
].sort((a, b) => {
  if (!a.date) return 1
  if (!b.date) return -1
  return a.date.localeCompare(b.date)
})

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return ''
    if (dateStr === todayStr) return 'Today'
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return (
    <div className="flex-shrink-0 bg-white border-b flex items-center px-4 gap-3"
      style={{ borderColor: 'var(--card-border)', height: '48px' }}>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css" />

      <button onClick={onToggleSidebar} className="p-1 rounded-lg" style={{ color: 'var(--text-muted)' }}>
        <i className="ti ti-menu-2" style={{ fontSize: '17px' }} />
      </button>

      <span className="text-sm font-medium hidden sm:block flex-shrink-0" style={{ color: 'var(--text-primary)' }}>
        My To-Do List
      </span>

      {/* Search */}
      <div className={`${showSearch ? 'flex' : 'hidden sm:flex'} flex-1 items-center rounded-lg px-3 py-1.5 gap-2 max-w-xs`}
        style={{ background: 'var(--morandi-pink)' }}>
        <i className="ti ti-search" style={{ fontSize: '13px', color: 'var(--morandi-pink-text)' }} />
        <input value={searchQuery} onChange={e => onSearchChange(e.target.value)}
          placeholder="Search tasks..."
          className="bg-transparent text-sm outline-none flex-1 min-w-0"
          style={{ color: 'var(--text-primary)' }} />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Quick add */}
        <button onClick={onQuickAdd}
          className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
          style={{ background: 'var(--btn-bg)', color: 'var(--btn-text)' }}>
          <i className="ti ti-plus" style={{ fontSize: '12px' }} />
          Quick add
        </button>

        {/* This week pill */}
        {totalWeek > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
            style={{ background: 'var(--morandi-blue)', color: 'var(--morandi-blue-text)' }}>
            <i className="ti ti-calendar-week" style={{ fontSize: '12px' }} />
            {totalWeek} this week
          </div>
        )}

        {/* Urgent pill */}
        <div className="relative" ref={urgentRef}>
          <button onClick={() => setShowUrgent(s => !s)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-colors"
            style={{
              background: totalUrgent > 0 ? 'var(--urgent-today-bg)' : 'var(--morandi-sand)',
              color: totalUrgent > 0 ? 'var(--urgent-today-text)' : 'var(--morandi-sand-text)'
            }}>
            {totalUrgent > 0 && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
            <i className="ti ti-alert-circle" style={{ fontSize: '12px' }} />
            {totalUrgent > 0 ? `${totalUrgent} urgent` : 'All clear'}
          </button>

          {/* Urgent popup */}
          {showUrgent && (
            <div className="absolute right-0 top-10 rounded-xl shadow-xl border z-50 w-72 animate-slideDown overflow-hidden"
              style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
              {allUrgentItems.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Nothing urgent 🌸</div>
              ) : (
                <div className="py-1.5 max-h-80 overflow-y-auto">
                  {allUrgentItems.map((item, i) => (
                    <div key={`${item.type}-${item.id}-${i}`}
                      className="flex items-center gap-2.5 px-3 py-2 mx-1.5 my-0.5 rounded-lg"
                      style={{ background: item.isUrgent ? 'var(--urgent-today-bg)' : 'var(--urgent-week-bg)' }}>
                      <i className={item.type === 'deadline' ? 'ti ti-calendar-event' : 'ti ti-circle-check'}
style={{ fontSize: '13px', color: item.isUrgent ? 'var(--urgent-today-text)' : 'var(--urgent-week-text)', flexShrink: 0 }}                      <span className="text-sm flex-1 truncate"
                        style={{ color: item.isToday ? '#8A6060' : '#786050' }}>
                        {item.title}
                      </span>
                      <span className="text-xs font-medium flex-shrink-0"
                        style={{ color: item.isToday ? 'var(--urgent-today-text)' : 'var(--urgent-week-text)' }}>
                        {formatDate(item.date)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="relative">
          <button onClick={() => setShowUserMenu(s => !s)}
            className="w-7 h-7 rounded-full overflow-hidden border-2"
            style={{ borderColor: 'var(--morandi-pink)' }}>
            {avatar
              ? <img src={avatar} alt={name} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-xs font-bold"
                  style={{ background: 'var(--morandi-pink)', color: 'var(--morandi-pink-text)' }}>{initials}</div>
            }
          </button>
          {showUserMenu && (
            <div className="absolute right-0 top-9 rounded-xl shadow-lg border py-2 w-44 z-50"
              style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
              <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--divider)' }}>
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{name}</p>
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
              </div>
              <button onClick={handleSignOut}
                className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 text-red-400">
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
