'use client'
import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Task } from '@/lib/types'
import { getShowsAs, getDaysUntil } from '@/lib/showsAs'
import UrgentPill from './UrgentPill'

interface TopBarProps {
  user: User
  urgentTasks: Task[]
  onUndo: () => void
  canUndo: boolean
  focusMode: boolean
  onToggleFocus: () => void
  searchQuery: string
  onSearchChange: (q: string) => void
  onToggleSidebar: () => void
}

export default function TopBar({ user, urgentTasks, onUndo, canUndo, focusMode, onToggleFocus, searchQuery, onSearchChange, onToggleSidebar }: TopBarProps) {
  const [showUserMenu, setShowUserMenu] = useState(false)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const avatar = user.user_metadata?.avatar_url
  const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
  const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div className="h-12 bg-pink-500 flex items-center px-4 gap-3 flex-shrink-0 shadow-sm">
      <button onClick={onToggleSidebar} className="text-white opacity-70 hover:opacity-100 transition-opacity">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      <span className="text-white font-semibold text-sm flex-shrink-0">My To-Do List</span>

      <div className="flex-1 flex items-center bg-white/20 rounded-lg px-3 py-1 gap-2 max-w-xs">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" opacity="0.8">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search tasks..."
          className="bg-transparent text-white placeholder-white/60 text-sm outline-none flex-1 min-w-0"
        />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <button
          onClick={onToggleFocus}
          title="Focus mode"
          className={`text-white p-1.5 rounded-lg transition-colors ${focusMode ? 'bg-white/30' : 'hover:bg-white/20'}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
          </svg>
        </button>

        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo"
          className="text-white p-1.5 rounded-lg hover:bg-white/20 disabled:opacity-30 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>
          </svg>
        </button>

        <UrgentPill tasks={urgentTasks} />

        <div className="relative">
          <button onClick={() => setShowUserMenu(s => !s)} className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/40 hover:border-white transition-colors">
            {avatar ? <img src={avatar} alt={name} className="w-full h-full object-cover" /> : (
              <div className="w-full h-full bg-pink-700 flex items-center justify-center text-white text-xs font-bold">{initials}</div>
            )}
          </button>
          {showUserMenu && (
            <div className="absolute right-0 top-10 bg-white rounded-xl shadow-lg border border-pink-100 py-2 w-44 z-50 animate-slideIn">
              <div className="px-3 py-2 border-b border-pink-50">
                <p className="text-xs font-medium text-gray-700 truncate">{name}</p>
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
              </div>
              <button onClick={handleSignOut} className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors">
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
