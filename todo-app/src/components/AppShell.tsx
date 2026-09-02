'use client'
import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import MobileNav from './MobileNav'
import HomePage from './pages/HomePage'
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
import { Task, Deadline } from '@/lib/types'

export type PageId = 'home' | 'overview' | 'subjects' | 'ibcore' | 'sat' | 'extracurricular' | 'college' | 'planner' | 'deadlines' | 'archive' | 'settings'

interface AppShellProps { user: User }

function localDateStr(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const PAGE_LABELS: Record<PageId, string> = {
  home: 'Home',
  overview: "Today's & ASAP",
  subjects: 'IB Subjects',
  ibcore: 'IB Core',
  sat: 'SAT',
  extracurricular: 'Extracurricular',
  college: 'College App',
  planner: 'Planner',
  deadlines: 'Deadlines',
  archive: 'Archive',
  settings: 'Settings',
}

export default function AppShell({ user }: AppShellProps) {
  const [currentPage, setCurrentPage] = useState<PageId>('home')
  const [mobileShowHome, setMobileShowHome] = useState(true)
  const [isMobile, setIsMobile] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [urgentTasks, setUrgentTasks] = useState<Task[]>([])
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([])
  const [urgentDeadlines, setUrgentDeadlines] = useState<Deadline[]>([])
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<Deadline[]>([])
  const [focusMode, setFocusMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [taskRefreshKey, setTaskRefreshKey] = useState(0)

  useEffect(() => {
    fetchUrgentTasks()
    fetchUrgentDeadlines()
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [user])

  const fetchUrgentTasks = async () => {
    const todayStr = localDateStr(0)
    const in14DaysStr = localDateStr(14)
    const { data } = await supabase
      .from('tasks').select('*')
      .eq('user_id', user.id).eq('is_archived', false)
      .neq('progress', '100%').not('due_date', 'is', null)
      .gte('due_date', todayStr).lte('due_date', in14DaysStr)
      .order('due_date', { ascending: true }).limit(20)
    if (data) {
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const urgent: Task[] = []; const upcoming: Task[] = []
      for (const task of data) {
        const [y, m, d] = task.due_date.split('-').map(Number)
        const dueDate = new Date(y, m - 1, d)
        const diffDays = Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        const threshold = task.reminder_days ?? 2
        if (diffDays <= threshold) urgent.push(task)
        else if (upcoming.length < 5) upcoming.push(task)
      }
      setUrgentTasks(urgent); setUpcomingTasks(upcoming)
    }
  }

  const fetchUrgentDeadlines = async () => {
    const todayStr = localDateStr(0)
    const in14DaysStr = localDateStr(14)
    const { data } = await supabase
      .from('deadlines').select('*')
      .eq('user_id', user.id).neq('status', 'Done')
      .not('due_date', 'is', null)
      .gte('due_date', todayStr).lte('due_date', in14DaysStr)
      .order('due_date', { ascending: true })
    if (data) {
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const urgent: Deadline[] = []; const upcoming: Deadline[] = []
      for (const deadline of data) {
        const [y, m, d] = deadline.due_date.split('-').map(Number)
        const dueDate = new Date(y, m - 1, d)
        const diffDays = Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        const threshold = deadline.reminder_days ?? 2
        if (diffDays <= threshold) urgent.push(deadline)
        else upcoming.push(deadline)
      }
      setUrgentDeadlines(urgent); setUpcomingDeadlines(upcoming)
    }
  }

  const handleTaskChange = () => {
    fetchUrgentTasks()
    setTaskRefreshKey(k => k + 1)
  }

  const handleNavigate = (page: PageId) => {
    setCurrentPage(page)
    setMobileShowHome(false)
  }

  const renderPage = () => {
    const props = { user, onTaskChange: handleTaskChange, focusMode, searchQuery }
    switch (currentPage) {
      case 'home': return <HomePage user={user} onTaskChange={handleTaskChange} />
      case 'overview': return <OverviewPage {...props} />
      case 'subjects': return <SubjectsPage {...props} />
      case 'ibcore': return <IBCorePage {...props} />
      case 'sat': return <SATPage {...props} />
      case 'extracurricular': return <ExtracurricularPage {...props} />
      case 'college': return <CollegeAppPage {...props} />
      case 'planner': return <WeeklyPlannerPage user={user} />
      case 'deadlines': return <DeadlinesPage user={user} onDeadlineChange={fetchUrgentDeadlines} />
      case 'archive': return <ArchivePage user={user} />
      case 'settings': return <SettingsPage user={user} />
      default: return <HomePage user={user} onTaskChange={handleTaskChange} />
    }
  }

  const topBarProps = {
    user, urgentTasks, upcomingTasks, urgentDeadlines, upcomingDeadlines,
    focusMode, onToggleFocus: () => setFocusMode(f => !f),
    searchQuery, onSearchChange: setSearchQuery,
    onQuickAdd: () => setShowQuickAdd(true),
  }

  if (isMobile) {
    return (
      <div className="flex flex-col h-screen overflow-hidden">
        <TopBar {...topBarProps} onToggleSidebar={() => {}} />
        {mobileShowHome ? (
          <MobileNav currentPage={currentPage} onNavigate={handleNavigate} />
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 bg-white border-b flex-shrink-0" style={{ borderColor: 'var(--card-border)' }}>
              <button onClick={() => setMobileShowHome(true)}
                className="flex items-center gap-1.5 text-sm font-medium"
                style={{ color: 'var(--morandi-pink-text)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
                Home
              </button>
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{PAGE_LABELS[currentPage]}</span>
            </div>
            <main className="flex-1 overflow-y-auto p-4">{renderPage()}</main>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopBar {...topBarProps} onToggleSidebar={() => setSidebarOpen(s => !s)} />
      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && <Sidebar currentPage={currentPage} onNavigate={handleNavigate} />}
        <main className="flex-1 overflow-y-auto p-4 md:p-6" style={{ background: 'var(--bg)' }}>
          {renderPage()}
        </main>
      </div>
    </div>
  )
}
