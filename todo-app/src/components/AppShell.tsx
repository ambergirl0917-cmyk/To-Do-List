'use client'
import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import OverviewPage from './pages/OverviewPage'
import SubjectsPage from './pages/SubjectsPage'
import IBCorePage from './pages/IBCorePage'
import SATPage from './pages/SATPage'
import ExtracurricularPage from './pages/ExtracurricularPage'
import CollegeAppPage from './pages/CollegeAppPage'
import WeeklyPlannerPage from './pages/WeeklyPlannerPage'
import DeadlinesPage from './pages/DeadlinesPage'
import ArchivePage from './pages/ArchivePage'
import SettingsPage from './pages/SettingsPage'
import UrgentPill from './UrgentPill'
import { Task } from '@/lib/types'

export type PageId = 'overview' | 'subjects' | 'ibcore' | 'sat' | 'extracurricular' | 'college' | 'planner' | 'deadlines' | 'archive' | 'settings'

interface AppShellProps { user: User }

export default function AppShell({ user }: AppShellProps) {
  const [currentPage, setCurrentPage] = useState<PageId>('overview')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [urgentTasks, setUrgentTasks] = useState<Task[]>([])
  const [undoStack, setUndoStack] = useState<any[]>([])
  const [focusMode, setFocusMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchUrgentTasks()
  }, [user])

  const fetchUrgentTasks = async () => {
    const today = new Date()
    const twoDaysLater = new Date(today)
    twoDaysLater.setDate(today.getDate() + 2)

    const { data } = await supabase
      .from('tasks')
      .select('*, sections(name)')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .neq('progress', '100%')
      .not('due_date', 'is', null)
      .lte('due_date', twoDaysLater.toISOString().split('T')[0])
      .gte('due_date', today.toISOString().split('T')[0])
      .order('due_date', { ascending: true })

    if (data) setUrgentTasks(data)
  }

  const handleUndo = () => {
    if (undoStack.length === 0) return
    const last = undoStack[undoStack.length - 1]
    last.undo()
    setUndoStack(prev => prev.slice(0, -1))
  }

  const renderPage = () => {
    const props = { user, onTaskChange: fetchUrgentTasks, focusMode, searchQuery }
    switch (currentPage) {
      case 'overview': return <OverviewPage {...props} />
      case 'subjects': return <SubjectsPage {...props} />
      case 'ibcore': return <IBCorePage {...props} />
      case 'sat': return <SATPage {...props} />
      case 'extracurricular': return <ExtracurricularPage {...props} />
      case 'college': return <CollegeAppPage {...props} />
      case 'planner': return <WeeklyPlannerPage user={user} />
      case 'deadlines': return <DeadlinesPage user={user} />
      case 'archive': return <ArchivePage user={user} />
      case 'settings': return <SettingsPage user={user} />
      default: return <OverviewPage {...props} />
    }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopBar
        user={user}
        urgentTasks={urgentTasks}
        onUndo={handleUndo}
        canUndo={undoStack.length > 0}
        focusMode={focusMode}
        onToggleFocus={() => setFocusMode(f => !f)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onToggleSidebar={() => setSidebarOpen(s => !s)}
      />
      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && (
          <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
        )}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {renderPage()}
        </main>
      </div>
    </div>
  )
}
