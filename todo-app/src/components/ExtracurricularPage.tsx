'use client'
import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Task } from './AppShell'
import TaskPage from './TaskPage'

const DEFAULT_ACTIVITIES = ['lirae', 'intern', 'competition']

export default function ExtracurricularPage({ tasks, updateTask, addTask, archiveTask, deleteTask, moveTask, user }: {
  tasks: Task[]
  updateTask: (id: string, updates: Partial<Task>) => void
  addTask: (section: string, subsection?: string) => void
  archiveTask: (id: string) => void
  deleteTask: (id: string) => void
  moveTask: (id: string, section: string, subsection?: string) => void
  user: User
}) {
  const [activities, setActivities] = useState(DEFAULT_ACTIVITIES)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)

  const addActivity = () => {
    if (!newName.trim()) return
    setActivities(a => [...a, newName.trim().toLowerCase()])
    setNewName('')
    setAdding(false)
  }

  const labels: Record<string, string> = {
    lirae: 'Lirae (Perfume Brand)',
    intern: 'Intern',
    competition: 'Competition',
  }

  return (
    <div>
      <h2 style={{ fontFamily: 'Playfair Display, serif', color: '#993556', fontSize: 20, marginBottom: 16 }}>
        ✨ Extracurricular Activities
      </h2>
      {activities.map(act => (
        <TaskPage
          key={act}
          title={labels[act] || act.charAt(0).toUpperCase() + act.slice(1)}
          section={`ec-${act}`}
          tasks={tasks}
          updateTask={updateTask}
          addTask={addTask}
          archiveTask={archiveTask}
          deleteTask={deleteTask}
          moveTask={moveTask}
          user={user}
        />
      ))}
      {adding ? (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addActivity(); if (e.key === 'Escape') setAdding(false) }}
            placeholder="Activity name..."
            style={{ flex: 1, padding: '8px 12px', border: '1px solid #FDE8F0', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'DM Sans, sans-serif' }}
          />
          <button onClick={addActivity} style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #E8829F, #B5476A)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Add</button>
          <button onClick={() => setAdding(false)} style={{ padding: '8px 16px', background: '#f5f5f5', color: '#666', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          style={{ marginTop: 8, padding: '10px 20px', background: 'white', border: '1px dashed #F4AFC8', color: '#B5476A', borderRadius: 10, cursor: 'pointer', fontSize: 13, width: '100%' }}
        >
          + Add new activity
        </button>
      )}
    </div>
  )
}
