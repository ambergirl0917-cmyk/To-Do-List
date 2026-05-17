'use client'
import type { User } from '@supabase/supabase-js'
import TaskSection from '../TaskSection'

const SUBJECTS = [
  { id: 'math', name: 'Math', color: '#ED93B1' },
  { id: 'english', name: 'English', color: '#85B7EB' },
  { id: 'chinese', name: 'Chinese', color: '#5DCAA5' },
  { id: 'economics', name: 'Economics', color: '#F0997B' },
  { id: 'bm', name: 'Business Management (BM)', color: '#AFA9EC' },
  { id: 'biology', name: 'Biology', color: '#97C459' },
]

interface Props { user: User; onTaskChange?: () => void; searchQuery?: string }

export default function SubjectsPage({ user, onTaskChange, searchQuery }: Props) {
  return (
    <div>
      <h2 className="text-lg font-bold text-pink-700 mb-4">IB Subjects</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {SUBJECTS.map(s => (
          <TaskSection key={s.id} user={user} sectionId={s.id} sectionName={s.name} color={s.color} onTaskChange={onTaskChange} searchQuery={searchQuery} />
        ))}
      </div>
    </div>
  )
}
