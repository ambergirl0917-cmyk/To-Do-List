'use client'
import type { User } from '@supabase/supabase-js'
import TaskSection from '../TaskSection'

const COLLEGE = [
  { id: 'common-app', name: 'Common App / Main Application' },
  { id: 'essays', name: 'Essays & Personal Statements' },
  { id: 'others', name: 'Others' },
]

interface Props { user: User; onTaskChange?: () => void; searchQuery?: string }

export default function CollegeAppPage({ user, onTaskChange, searchQuery }: Props) {
  return (
    <div>
      <h2 className="text-lg font-bold text-pink-700 mb-4">College Application</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {COLLEGE.map(s => (
          <TaskSection key={s.id} user={user} sectionId={s.id} sectionName={s.name} onTaskChange={onTaskChange} searchQuery={searchQuery} />
        ))}
      </div>
    </div>
  )
}
