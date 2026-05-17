'use client'
import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import TaskSection from '../TaskSection'

const DEFAULT_SECTIONS = [
  { id: 'lirae', name: 'Lirae (Perfume Brand)' },
  { id: 'intern', name: 'Intern' },
  { id: 'competition-1', name: 'Competition 1' },
  { id: 'competition-2', name: 'Competition 2' },
  { id: 'competition-3', name: 'Competition 3' },
  { id: 'other-activities', name: 'Other Activities' },
]

interface Props { user: User; onTaskChange?: () => void; searchQuery?: string }

export default function ExtracurricularPage({ user, onTaskChange, searchQuery }: Props) {
  const [customSections, setCustomSections] = useState<{id:string,name:string}[]>([])
  const [newName, setNewName] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const addSection = () => {
    if (!newName.trim()) return
    const id = 'extra-' + Date.now()
    setCustomSections(prev => [...prev, { id, name: newName.trim() }])
    setNewName('')
    setShowAdd(false)
  }

  const allSections = [...DEFAULT_SECTIONS, ...customSections]

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-pink-700">Extracurricular</h2>
        <button onClick={() => setShowAdd(s => !s)} className="text-xs bg-pink-500 text-white px-3 py-1.5 rounded-lg hover:bg-pink-600 transition-colors flex items-center gap-1">
          <span>+</span> New activity
        </button>
      </div>

      {showAdd && (
        <div className="flex gap-2 mb-4 animate-slideIn">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addSection()}
            placeholder="Activity name..."
            className="flex-1 text-sm bg-white border border-pink-200 rounded-lg px-3 py-2 outline-none focus:border-pink-400"
            autoFocus
          />
          <button onClick={addSection} className="text-sm bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600 transition-colors">Add</button>
          <button onClick={() => setShowAdd(false)} className="text-sm text-pink-400 hover:text-pink-600 px-2">Cancel</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {allSections.map(s => (
          <TaskSection key={s.id} user={user} sectionId={s.id} sectionName={s.name} onTaskChange={onTaskChange} searchQuery={searchQuery} />
        ))}
      </div>
    </div>
  )
}
