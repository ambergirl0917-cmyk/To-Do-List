'use client'
import { PageId } from './AppShell'

interface Props {
  currentPage: PageId
  onNavigate: (page: PageId) => void
}

const MAIN_PAGES = [
  { id: 'overview' as PageId, label: "Today's & ASAP", icon: '📋', color: 'bg-pink-100 border-pink-300' },
  { id: 'subjects' as PageId, label: 'IB Subjects', icon: '📚', color: 'bg-blue-100 border-blue-300' },
  { id: 'ibcore' as PageId, label: 'IB Core', icon: '🌐', color: 'bg-green-100 border-green-300' },
  { id: 'sat' as PageId, label: 'SAT', icon: '📝', color: 'bg-yellow-100 border-yellow-300' },
  { id: 'extracurricular' as PageId, label: 'Extracurricular', icon: '✨', color: 'bg-purple-100 border-purple-300' },
  { id: 'college' as PageId, label: 'College App', icon: '🎓', color: 'bg-orange-100 border-orange-300' },
  { id: 'planner' as PageId, label: 'Weekly Planner', icon: '📅', color: 'bg-teal-100 border-teal-300' },
  { id: 'deadlines' as PageId, label: 'Deadlines', icon: '🔔', color: 'bg-red-100 border-red-300' },
]

const SMALL_PAGES = [
  { id: 'archive' as PageId, label: 'Archive', icon: '📦' },
  { id: 'settings' as PageId, label: 'Settings', icon: '⚙️' },
]

export default function MobileNav({ onNavigate }: Props) {
  return (
    <div className="flex-1 overflow-y-auto bg-pink-50/30 p-5">
      <h1 className="text-xl font-bold text-pink-700 mb-6 text-center">My To-Do List</h1>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {MAIN_PAGES.map(page => (
          <button
            key={page.id}
            onClick={() => onNavigate(page.id)}
            className={`${page.color} border-2 rounded-2xl p-5 flex flex-col items-center gap-3 shadow-sm active:scale-95 transition-transform`}
          >
            <span className="text-4xl">{page.icon}</span>
            <span className="text-sm font-semibold text-gray-700 text-center leading-tight">{page.label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {SMALL_PAGES.map(page => (
          <button
            key={page.id}
            onClick={() => onNavigate(page.id)}
            className="bg-white border border-pink-100 rounded-xl p-3 flex items-center gap-3 shadow-sm active:scale-95 transition-transform"
          >
            <span className="text-2xl">{page.icon}</span>
            <span className="text-sm text-gray-500 font-medium">{page.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
