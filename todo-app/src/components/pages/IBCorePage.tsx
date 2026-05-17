'use client'
import type { User } from '@supabase/supabase-js'
import TaskSection from '../TaskSection'

const CORE = [
  { id: 'tok', name: 'TOK (Theory of Knowledge)', color: '#FAC775' },
  { id: 'ee', name: 'EE (Extended Essay)', color: '#F7C1C1' },
  { id: 'cas', name: 'CAS (Creativity, Activity, Service)', color: '#C0DD97' },
]

interface Props { user: User; onTaskChange?: () => void; searchQuery?: string }

export default function IBCorePage({ user, onTaskChange, searchQuery }: Props) {
  return (
    <div>
      <h2 className="text-lg font-bold text-pink-700 mb-4">IB Core</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {CORE.map(s => (
          <TaskSection key={s.id} user={user} sectionId={s.id} sectionName={s.name} color={s.color} onTaskChange={onTaskChange} searchQuery={searchQuery} />
        ))}
      </div>
    </div>
  )
}
