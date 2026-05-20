'use client'
import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { WeeklySlot, Progress } from '@/lib/types'
import { getProgressColor } from '@/lib/showsAs'

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
const PROGRESS_OPTIONS: Progress[] = ['0%','20%','50%','70%','100%']

const TIME_OPTIONS = [
  '6:00 AM','6:30 AM','7:00 AM','7:30 AM','8:00 AM','8:30 AM',
  '9:00 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM',
  '12:00 PM','12:30 PM','1:00 PM','1:30 PM','2:00 PM','2:30 PM',
  '3:00 PM','3:30 PM','4:00 PM','4:30 PM','5:00 PM','5:30 PM',
  '6:00 PM','6:30 PM','7:00 PM','7:30 PM','8:00 PM','8:30 PM',
  '9:00 PM','9:30 PM','10:00 PM',
]

interface Props { user: User }

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [editMode, setEditMode] = useState(false)
  if (editMode) {
    return (
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={() => setEditMode(false)}
        autoFocus
        placeholder="e.g. 9:15 AM"
        className="text-xs text-gray-500 bg-transparent outline-none w-20"
      />
    )
  }
  return (
    <div className="flex items-center gap-1">
      <select
        value={TIME_OPTIONS.includes(value) ? value : ''}
        onChange={e => onChange(e.target.value)}
        className="text-xs text-gray-500 bg-transparent outline-none cursor-pointer max-w-[90px]"
      >
        <option value="">Time...</option>
        {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      <button onClick={() => setEditMode(true)} className="text-pink-200 hover:text-pink-400 text-xs" title="Custom time">✎</button>
    </div>
  )
}

export default function WeeklyPlannerPage({ user }: Props) {
  const [slots, setSlots] = useState<WeeklySlot[]>([])
  const [view, setView] = useState<'list'|'calendar'>('list')

  useEffect(() => { fetchSlots() }, [user])

  const fetchSlots = async () => {
    const { data }
