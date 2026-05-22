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
import { Task } from '@/lib/types'

export type PageId = 'overview' | 'subjects' | 'ibcore' | 'sat' | 'extracurricular' | 'college' | 'planner' | 'deadlines' | 'archive' | 'settings'

interface AppShellProps { user: User }

function localDateStr(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function AppShell({ user }: AppShellProps) {
  const [currentPage, setCurrentPage] = useState<PageId>('overview')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [urgentTasks, setUrgentTasks] = useState<Task[]>([])
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([])
  const [focusMode, setFocusMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => { fetchUrgentTasks() }, [user])

  const fetchUrgentTasks = async () => {
    const todayStr = localDateStr(0)
    const in14DaysStr = localDateStr(14)

    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .neq('progress', '100%')
      .not('due_date', 'is', null)
      .gte('due_date', todayStr)
      .lte('due_date', in14DaysStr)
      .order('due_date', { ascending: true })
      .limit(20)

    if (data) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const urgent: Task[] = []
      const upcoming: Task[] = []
      for (const task of data) {
        const [y, m, d] = task.due_date.split('-').map(Number)
        const dueDate = new Date(y, m - 1, d)
        const diffDays = Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        const threshold = task.reminder_days ?? 2
        if (diffDays <= threshold) {
          urgent.push(task)
        } else if (upcoming.length < 5) {
          upcoming.push(task)
        }
      }
      setUrgentTasks(urgent)
      setUpcomingTasks(upcoming)
    }
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
case 'planner': return <WeeklyPlannerPage user={user} totalWeeks={parseInt(localStorage.getItem(`planner_weeks_${user.id}`) || '3')} />      case 'deadlines': return <DeadlinesPage user={user} />
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
        upcomingTasks={upcomingTasks}
        focusMode={focusMode}
        onToggleFocus={() => setFocusMode(f => !f)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onToggleSidebar={() => setSidebarOpen(s => !s)}
      />
      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {renderPage()}
        </main>
      </div>
    </div>
  )
}
