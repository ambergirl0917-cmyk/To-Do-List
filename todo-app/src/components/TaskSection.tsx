'use client'
import { useState, useEffect, useCallback } from 'react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Task, Progress } from '@/lib/types'
import TaskRow from './TaskRow'

interface TaskSectionProps {
  user: User
  sectionId: string
  sectionName: string
  color?: string
  onTaskChange?: () => void
  searchQuery?: string
}

export default function TaskSection({ user, sectionId, sectionName, color, onTaskChange, searchQuery }: TaskSectionProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const fetchTasks = useCallback(async () => {
    const { data } = await supabase
      .from('tasks').select('*')
      .eq('user_id', user.id).eq('section_id', sectionId).eq('is_archived', false)
      .order('position', { ascending: true })
    if (data) setTasks(data)
    setLoading(false)
  }, [user.id, sectionId])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const addTask = async () => {
    const { data } = await supabase.from('tasks').insert({
      user_id: user.id, section_id: sectionId, task: '', notes: '',
      due_date: null, progress: '0%' as Progress, position: tasks.length,
      is_archived: false, checklist: [],
    }).select().single()
    if (data) setTasks(prev => [...prev, data])
  }

  const updateTask = async (id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
    await supabase.from('tasks').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id)
    onTaskChange?.()
  }

  const archiveTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    await supabase.from('tasks').update({ is_archived: true, updated_at: new Date().toISOString() }).eq('id', id)
    onTaskChange?.()
  }

  const moveTask = async (id: string, newSectionId: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    await supabase.from('tasks').update({ section_id: newSectionId, updated_at: new Date().toISOString() }).eq('id', id)
    onTaskChange?.()
  }

  const sortByDate = () => {
    const sorted = [...tasks].sort((a, b) => {
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    })
    setTasks(sorted)
    sorted.forEach((t, i) => supabase.from('tasks').update({ position: i }).eq('id', t.id))
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = tasks.findIndex(t => t.id === active.id)
    const newIndex = tasks.findIndex(t => t.id === over.id)
    const newOrder = arrayMove(tasks, oldIndex, newIndex)
    setTasks(newOrder)
    newOrder.forEach((t, i) => supabase.from('tasks').update({ position: i }).eq('id', t.id))
  }

  const filteredTasks = searchQuery
    ? tasks.filter(t => t.task?.toLowerCase().includes(searchQuery.toLowerCase()) || t.notes?.toLowerCase().includes(searchQuery.toLowerCase()))
    : tasks

  return (
    <div className="rounded-xl border overflow-visible"
      style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b"
        style={{ background: 'var(--section-header)', borderColor: 'var(--divider)' }}>
        <div className="flex items-center gap-2">
          {color && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />}
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{sectionName}</span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>({filteredTasks.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={sortByDate} className="text-xs" style={{ color: 'var(--text-muted)' }}>Sort</button>
          <button onClick={addTask} className="text-xs px-3 py-1.5 rounded-lg"
            style={{ background: 'var(--btn-bg)', color: 'var(--btn-text)' }}>
            + Add
          </button>
        </div>
      </div>

      {/* Column headers */}
      <div className="flex items-center px-4 py-1.5 border-b text-xs"
        style={{ borderColor: 'var(--divider)', color: 'var(--text-muted)', background: 'var(--card-bg)' }}>
        <div className="w-4 flex-shrink-0 mr-2" />
        <div className="w-4 flex-shrink-0 mr-2" />
        <div className="flex-1">Task</div>
        <div className="w-28 flex-shrink-0">Due Date</div>
        <div className="w-20 flex-shrink-0">Shows As</div>
        <div className="w-24 flex-shrink-0">Progress</div>
        <div className="w-20 flex-shrink-0" />
      </div>

      {loading ? (
        <div className="px-4 py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={filteredTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {filteredTasks.map(task => (
              <TaskRow key={task.id} task={task} onUpdate={updateTask} onArchive={archiveTask} onMove={moveTask} currentSectionId={sectionId} />
            ))}
          </SortableContext>
        </DndContext>
      )}

      <button onClick={addTask} className="w-full text-left px-4 py-2.5 text-sm rounded-b-xl"
        style={{ color: 'var(--text-muted)' }}>
        + Add task
      </button>
    </div>
  )
}
