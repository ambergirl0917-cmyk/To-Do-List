'use client'
import { PageId } from './AppShell'

interface Props {
  currentPage: PageId
  onNavigate: (page: PageId) => void
}

const MAIN_PAGES = [
  { id: 'home' as PageId, label: 'Home', icon: 'ti-home', bg: '#FAE4EC', fg: '#9A7080' },
  { id: 'overview' as PageId, label: "Today's & ASAP", icon: 'ti-check', bg: '#F5EEE0', fg: '#907860' },
  { id: 'subjects' as PageId, label: 'IB Subjects', icon: 'ti-books', bg: '#DDD0E0', fg: '#706080' },
  { id: 'ibcore' as PageId, label: 'IB Core', icon: 'ti-world', bg: '#C8D8CC', fg: '#507060' },
  { id: 'sat' as PageId, label: 'SAT', icon: 'ti-pencil', bg: '#FAE4EC', fg: '#9A7080' },
  { id: 'extracurricular' as PageId, label: 'Extracurricular', icon: 'ti-star', bg: '#F5EEE0', fg: '#907860' },
  { id: 'planner' as PageId, label: 'Planner', icon: 'ti-calendar', bg: '#DDD0E0', fg: '#706080' },
  { id: 'deadlines' as PageId, label: 'Deadlines', icon: 'ti-bell', bg: '#D8E8F8', fg: '#5878A0' },
]

const SMALL_PAGES = [
  { id: 'archive' as PageId, label: 'Archive', icon: 'ti-archive', bg: '#F5EEE0', fg: '#907860' },
  { id: 'settings' as PageId, label: 'Settings', icon: 'ti-settings', bg: '#FAE4EC', fg: '#9A7080' },
]

export default function MobileNav({ onNavigate }: Props) {
  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css" />
      <div className="flex-1 overflow-y-auto p-5" style={{ background: '#FAFAF8' }}>
        <h1 className="text-xl font-medium text-center mb-6" style={{ color: '#9A7080' }}>My To-Do List</h1>

        <div className="grid grid-cols-2 gap-4 mb-4">
          {MAIN_PAGES.map(page => (
            <button
              key={page.id}
              onClick={() => onNavigate(page.id)}
              style={{ background: page.bg, borderRadius: '16px' }}
              className="p-5 flex flex-col items-center gap-2 active:scale-95 transition-transform"
            >
              <i className={`ti ${page.icon}`} style={{ fontSize: '28px', color: page.fg }} />
              <span style={{ fontSize: '12px', color: page.fg, fontWeight: '500', textAlign: 'center', lineHeight: '1.3' }}>
                {page.label}
              </span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {SMALL_PAGES.map(page => (
            <button
              key={page.id}
              onClick={() => onNavigate(page.id)}
              style={{ background: page.bg, borderRadius: '12px' }}
              className="p-3 flex items-center gap-3 active:scale-95 transition-transform"
            >
              <i className={`ti ${page.icon}`} style={{ fontSize: '20px', color: page.fg }} />
              <span style={{ fontSize: '12px', color: page.fg, fontWeight: '500' }}>{page.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
