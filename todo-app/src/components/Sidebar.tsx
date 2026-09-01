'use client'
import { PageId } from './AppShell'

interface SidebarProps {
  currentPage: PageId
  onNavigate: (page: PageId) => void
}

const NAV_ITEMS = [
  { section: 'Overview', items: [
    { id: 'home' as PageId, label: 'Home', icon: 'ti-home' },
    { id: 'overview' as PageId, label: "Today's & ASAP", icon: 'ti-check' },
  ]},
  { section: 'IB Subjects', items: [
    { id: 'subjects' as PageId, label: 'All Subjects', icon: 'ti-books' },
  ]},
  { section: 'IB Core', items: [
    { id: 'ibcore' as PageId, label: 'TOK / EE / CAS', icon: 'ti-world' },
  ]},
  { section: 'Other', items: [
    { id: 'sat' as PageId, label: 'SAT', icon: 'ti-pencil' },
    { id: 'extracurricular' as PageId, label: 'Extracurricular', icon: 'ti-star' },
    { id: 'college' as PageId, label: 'College App', icon: 'ti-school' },
    { id: 'planner' as PageId, label: 'Planner', icon: 'ti-calendar' },
    { id: 'deadlines' as PageId, label: 'Deadlines', icon: 'ti-calendar-event' },
    { id: 'summer' as PageId, label: 'Summer Plan', icon: 'ti-sun' },
  ]},
  { section: 'More', items: [
    { id: 'archive' as PageId, label: 'Archive', icon: 'ti-archive' },
    { id: 'settings' as PageId, label: 'Settings', icon: 'ti-settings' },
  ]},
]

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const isActive = (id: PageId) => currentPage === id

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css" />
      <div className="w-48 bg-white border-r flex flex-col py-4 overflow-y-auto scrollbar-thin flex-shrink-0" style={{ borderColor: 'var(--card-border)' }}>
        {NAV_ITEMS.map(section => (
          <div key={section.section} className="px-3 mb-3">
            <p className="text-xs font-medium uppercase tracking-wider mb-1 px-2" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
              {section.section}
            </p>
            {section.items.map(item => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="w-full text-left flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-all mb-0.5"
                style={{
                  background: isActive(item.id) ? 'var(--morandi-pink)' : 'transparent',
                  color: isActive(item.id) ? 'var(--morandi-pink-text)' : 'var(--text-secondary)',
                  fontWeight: isActive(item.id) ? '500' : '400',
                }}
              >
                <i className={`ti ${item.icon}`} style={{ fontSize: '15px' }} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </>
  )
}
