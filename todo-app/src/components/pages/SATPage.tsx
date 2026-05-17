'use client'
import type { User } from '@supabase/supabase-js'
import TaskSection from '../TaskSection'

interface Props { user: User; onTaskChange?: () => void; searchQuery?: string }

export default function SATPage({ user, onTaskChange, searchQuery }: Props) {
  return (
    <div>
      <h2 className="text-lg font-bold text-pink-700 mb-4">SAT</h2>
      <TaskSection user={user} sectionId="sat" sectionName="SAT Prep" onTaskChange={onTaskChange} searchQuery={searchQuery} />
    </div>
  )
}
