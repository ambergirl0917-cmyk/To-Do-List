'use client'
import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface Props { user: User }

const DEFAULT_SECTIONS = [
  { id: 'todays-tasks', name: "Today's Tasks", page: 'overview' },
  { id: 'asap', name: 'ASAP', page: 'overview' },
  { id: 'math', name: 'Math', page: 'subjects' },
  { id: 'english', name: 'English', page: 'subjects' },
  { id: 'chinese', name: 'Chinese', page: 'subjects' },
  { id: 'economics', name: 'Economics', page: 'subjects' },
  { id: 'bm', name: 'Business Management (BM)', page: 'subjects' },
  { id: 'biology', name: 'Biology', page: 'subjects' },
  { id: 'tok', name: 'TOK', page: 'ibcore' },
  { id: 'ee', name: 'EE', page: 'ibcore' },
  { id: 'cas', name: 'CAS', page: 'ibcore' },
  { id: 'sat', name: 'SAT Prep', page: 'sat' },
  { id: 'lirae', name: 'Lirae (Perfume Brand)', page: 'extracurricular' },
  { id: 'intern', name: 'Intern', page: 'extracurricular' },
  { id: 'competition-1', name: 'Competition 1', page: 'extracurricular' },
  { id: 'competition-2', name: 'Competition 2', page: 'extracurricular' },
  { id: 'competition-3', name: 'Competition 3', page: 'extracurricular' },
  { id: 'other-activities', name: 'Other Activities', page: 'extracurricular' },
  { id: 'common-app', name: 'Common App', page: 'college' },
  { id: 'essays', name: 'Essays', page: 'college' },
  { id: 'others', name: 'Others', page: 'college' },
]

export default function SettingsPage({ user }: Props) {
  const [sections, setSections] = useState(DEFAULT_SECTIONS)
  const [saved, setSaved] = useState(false)
  const [totalWeeks, setTotalWeeks] = useState(3)
  const [weeksSaved, setWeeksSaved] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(`planner_weeks_${user.id}`)
    if (stored) setTotalWeeks(parseInt(stored))
  }, [user.id])

  const updateName = (id: string, name: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, name } : s))
  }

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const addWeek = () => {
    const newTotal = totalWeeks + 1
    setTotalWeeks(newTotal)
    localStorage.setItem(`planner_weeks_${user.id}`, newTotal.toString())
    setWeeksSaved(true)
    setTimeout(() => setWeeksSaved(false), 2000)
  }

  const removeWeek = () => {
    if (totalWeeks <= 1) return
    const newTotal = totalWeeks - 1
    setTotalWeeks(newTotal)
    localStorage.setItem(`planner_weeks_${user.id}`, newTotal.toString())
    setWeeksSaved(true)
    setTimeout(() => setWeeksSaved(false), 2000)
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-bold text-pink-700 mb-4">Settings</h2>

      {/* Weekly Planner Weeks */}
      <div className="bg-white rounded-xl border border-pink-100 shadow-sm mb-6">
        <div className="bg-pink-50 px-4 py-3 border-b border-pink-100">
          <h3 className="text-sm font-semibold text-pink-700">Weekly Planner</h3>
          <p className="text-xs text-pink-400 mt-0.5">Add or remove weeks from your planner</p>
        </div>
        <div className="px-4 py-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Current weeks: <span className="font-semibold text-pink-600">{totalWeeks}</span></span>
            <button onClick={addWeek} className="text-xs bg-pink-500 text-white px-3 py-1.5 rounded-lg hover:bg-pink-600 transition-colors">+ Add Week</button>
            {totalWeeks > 1 && (
              <button onClick={removeWeek} className="text-xs border border-pink-200 text-pink-500 px-3 py-1.5 rounded-lg hover:bg-pink-50 transition-colors">− Remove Week</button>
            )}
            {weeksSaved && <span className="text-xs text-green-500">✓ Saved!</span>}
          </div>
        </div>
      </div>

      {/* Rename Sections */}
      <div className="bg-white rounded-xl border border-pink-100 shadow-sm mb-6">
        <div className="bg-pink-50 px-4 py-3 border-b border-pink-100">
          <h3 className="text-sm font-semibold text-pink-700">Rename Sections</h3>
          <p className="text-xs text-pink-400 mt-0.5">Change the name of any section to match your subjects</p>
        </div>
        <div className="divide-y divide-pink-50">
          {sections.map(s => (
            <div key={s.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="text-xs text-pink-300 w-28 flex-shrink-0 capitalize">{s.page}</span>
              <input
                value={s.name}
                onChange={e => updateName(s.id, e.target.value)}
                className="flex-1 text-sm text-gray-700 bg-transparent outline-none border-b border-transparent focus:border-pink-300 transition-colors py-0.5"
              />
            </div>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-pink-50">
          <button onClick={handleSave} className={`text-sm px-4 py-2 rounded-lg transition-colors ${saved ? 'bg-green-500 text-white' : 'bg-pink-500 text-white hover:bg-pink-600'}`}>
            {saved ? '✓ Saved!' : 'Save changes'}
          </button>
        </div>
      </div>

      {/* Account */}
      <div className="bg-white rounded-xl border border-pink-100 shadow-sm">
        <div className="bg-pink-50 px-4 py-3 border-b border-pink-100">
          <h3 className="text-sm font-semibold text-pink-700">Account</h3>
        </div>
        <div className="px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            {user.user_metadata?.avatar_url && (
              <img src={user.user_metadata.avatar_url} alt="" className="w-10 h-10 rounded-full" />
            )}
            <div>
              <p className="text-sm font-medium text-gray-700">{user.user_metadata?.full_name || 'User'}</p>
              <p className="text-xs text-gray-400">{user.email}</p>
            </div>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="text-sm text-red-500 hover:text-red-700 border border-red-200 hover:border-red-300 px-4 py-2 rounded-lg transition-colors">
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
