'use client'
import type { User } from '@supabase/supabase-js'
import TaskSection from '../TaskSection'

interface Props {
  user: User
  onTaskChange?: () => void
  focusMode?: boolean
  searchQuery?: string
}

export default function OverviewPage({ user, onTaskChange, focusMode, searchQuery }: Props) {
  return (
    <div>
      <h2 className="text-base font-medium mb-4" style={{ color: 'var(--text-primary)' }}>Today's & ASAP</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TaskSection user={user} sectionId="todays-tasks" sectionName="Today's Tasks" color="#EEC4CC" onTaskChange={onTaskChange} searchQuery={searchQuery} />
        {!focusMode && <TaskSection user={user} sectionId="asap" sectionName="ASAP — Quick Wins" color="#DDD0BC" onTaskChange={onTaskChange} searchQuery={searchQuery} />}
      </div>
    </div>
  )
}
