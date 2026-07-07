'use client'
import { PageId } from './AppShell'
const SUBJECT_COLORS: Record<string, string> = {
  math: '#ED93B1', english: '#85B7EB', chinese: '#5DCAA5',
  economics: '#F0997B', bm: '#AFA9EC', biology: '#97C459',
  tok: '#FAC775', ee: '#F7C1C1', cas: '#C0DD97',
}
interface SidebarProps {
  currentPage: PageId
  onNavigate: (page: PageId) => void
}
export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const item = (id: PageId, label: string, icon?: string, color?: string) => (
    <button
      key={id}
      onClick={() => onNavigate(id)}
      className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
        currentPage === id
          ? 'bg-pink-100 text-pink-700 font-medium border-l-2 border-pink-500'
          : 'text-gray-500 hover:bg-pink-50 hover:text-pink-600'
      }`}
    >
      {color ? <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} /> : null}
      {icon ? <span className="text-base">{icon}</span> : null}
      <span>{label}</span>
    </button>
  )
  return (
    <div className="w-44 bg-white border-r border-pink-100 flex flex-col py-4 overflow-y-auto scrollbar-thin flex-shrink-0">
      <div className="px-3 mb-1">
        <p className="text-xs font-semibold text-pink-300 uppercase tracking-wider mb-1">Overview</p>
        {item('overview', "Today's & ASAP", '📋')}
      </div>
      <div className="px-3 mb-1 mt-3">
        <p className="text-xs font-semibold text-pink-300 uppercase tracking-wider mb-1">IB Subjects</p>
        {item('subjects', 'All Subjects', '📚')}
      </div>
      <div className="px-3 mb-1 mt-3">
        <p className="text-xs font-semibold text-pink-300 uppercase tracking-wider mb-1">IB Core</p>
        {item('ibcore', 'TOK / EE / CAS', '🌐')}
      </div>
      <div className="px-3 mb-1 mt-3">
        <p className="text-xs font-semibold text-pink-300 uppercase tracking-wider mb-1">Other</p>
        {item('sat', 'SAT', '📝')}
        {item('extracurricular', 'Extracurricular', '✨')}
        {item('college', 'College App', '🎓')}
        {item('planner', 'Weekly Planner', '📅')}
        {item('deadlines', 'Deadlines', '🔔')}
      </div>
      <div className="px-3 mb-1 mt-3">
        <p className="text-xs font-semibold text-pink-300 uppercase tracking-wider mb-1">Summer</p>
        {item('summer', 'Summer Plan', '🌸')}
      </div>
      <div className="px-3 mb-1 mt-3">
        <p className="text-xs font-semibold text-pink-300 uppercase tracking-wider mb-1">More</p>
        {item('archive', 'Archive', '📦')}
        {item('settings', 'Settings', '⚙️')}
      </div>
    </div>
  )
}
