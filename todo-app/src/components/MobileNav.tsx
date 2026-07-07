'use client'
import { PageId } from './AppShell'
interface Props {
  currentPage: PageId
  onNavigate: (page: PageId) => void
}
const MAIN_PAGES = [
  { id: 'overview' as PageId, label: "Today's & ASAP", icon: 'ti-calendar-check', bg: '#f59cb2', fg: '#c4607a' },
  { id: 'subjects' as PageId, label: 'IB Subjects', icon: 'ti-books', bg: '#e9b4b3', fg: '#b07878' },
  { id: 'ibcore' as PageId, label: 'IB Core', icon: 'ti-world', bg: '#f0b6c6', fg: '#b87090' },
  { id: 'sat' as PageId, label: 'SAT', icon: 'ti-pencil', bg: '#e49e91', fg: '#a86858' },
  { id: 'extracurricular' as PageId, label: 'Extracurricular', icon: 'ti-star', bg: '#f2dcbe', fg: '#b89870' },
  { id: 'college' as PageId, label: 'College App', icon: 'ti-school', bg: '#eeceb6', fg: '#a88060' },
  { id: 'planner' as PageId, label: 'Weekly Planner', icon: 'ti-layout-list', bg: '#d5708b', fg: '#a03860' },
  { id: 'deadlines' as PageId, label: 'Deadlines', icon: 'ti-bell', bg: '#f59cb2', fg: '#c4607a' },
]
const SMALL_PAGES = [
  { id: 'archive' as PageId, label: 'Archive', icon: 'ti-archive', bg: '#eeceb6', fg: '#a88060' },
  { id: 'settings' as PageId, label: 'Settings', icon: 'ti-settings', bg: '#f2dcbe', fg: '#b89870' },
]
export default function MobileNav({ onNavigate }: Props) {
  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css" />
      <div className="flex-1 overflow-y-auto p-5" style={{ background: '#fdf6f0' }}>
        <h1 className="text-xl font-bold text-center mb-6" style={{ color: '#a86858' }}>My To-Do List</h1>

        <div className="grid grid-cols-2 gap-4 mb-4">
          {MAIN_PAGES.map(page => (
            <button
              key={page.id}
              onClick={() => onNavigate(page.id)}
              style={{ background: page.bg, borderRadius: '16px' }}
              className="p-5 flex flex-col items-center gap-2 active:scale-95 transition-transform"
            >
              <i className={`ti ${page.icon}`} style={{ fontSize: '30px', color: page.fg }} />
              <span style={{ fontSize: '12px', color: page.fg, fontWeight: '500', textAlign: 'center', lineHeight: '1.3' }}>
                {page.label}
              </span>
            </button>
          ))}
        </div>

        {/* Summer Plan — wide button */}
        <button
          onClick={() => onNavigate('summer')}
          style={{ background: '#f9d8e4', borderRadius: '16px' }}
          className="w-full p-4 flex items-center justify-center gap-3 mb-4 active:scale-95 transition-transform"
        >
          <i className="ti ti-sun" style={{ fontSize: '24px', color: '#c4607a' }} />
          <span style={{ fontSize: '14px', color: '#c4607a', fontWeight: '600' }}>Summer Plan 🌸</span>
        </button>

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
