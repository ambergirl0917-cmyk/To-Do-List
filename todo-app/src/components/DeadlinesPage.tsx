'use client'
import type { User } from '@supabase/supabase-js'
import type { Task } from './AppShell'
import TaskPage from './TaskPage'

export default function DeadlinesPage({ tasks, updateTask, addTask, archiveTask, deleteTask, moveTask, user }: {
  tasks: Task[]
  updateTask: (id: string, updates: Partial<Task>) => void
  addTask: (section: string) => void
  archiveTask: (id: string) => void
  deleteTask: (id: string) => void
  moveTask: (id: string, section: string) => void
  user: User
}) {
  return (
    <div>
      <h2 style={{ fontFamily: 'Playfair Display, serif', color: '#993556', fontSize: 20, marginBottom: 16 }}>🔔 Deadlines</h2>
      <TaskPage title="Deadlines" section="deadlines" tasks={tasks} updateTask={updateTask} addTask={addTask} archiveTask={archiveTask} deleteTask={deleteTask} moveTask={moveTask} user={user} />
    </div>
  )
}
