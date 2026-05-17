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
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('section_id', sectionId)
      .eq('is_archived', false)
      .order('position', { ascending: true })
    if (data) setTasks(data)
    setLoading(false)
  }, [user.id, sectionId])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const addTask = async () => {
    const position = tasks.length
    const { data } = await supabase.from('tasks').insert({
      user_id: user.id,
      section_id: sectionId,
      task: '',
      notes: '',
      due_date: null,
      progress: '0%' as Progress,
      position,
      is_archived: false,
      checklist: [],
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

  const headerStyle = color ? { borderTopColor: color, borderTopWidth: '3px' } : {}

  return (
    <div className="bg-white rounded-xl border border-pink-100 overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 py-2.5 bg-pink-50 border-b border-pink-100" style={headerStyle}>
        <div className="flex items-center gap-2">
          {color && <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />}
          <span className="text-sm font-semibold text-pink-700">{sectionName}</span>
          <span className="text-xs text-pink-400">({filteredTasks.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={sortByDate} className="text-xs text-pink-400 hover:text-pink-600 flex items-center gap-1 transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
            Sort by date
          </button>
          <button onClick={addTask} className="text-xs bg-pink-500 text-white px-2.5 py-1 rounded-lg hover:bg-pink-600 transition-colors flex items-center gap-1">
            <span>+</span> Add
          </button>
        </div>
      </div>

      <div className="flex items-center px-3 py-1 bg-white border-b border-pink-50 text-xs text-pink-400 font-medium">
        <div className="w-4 flex-shrink-0 mr-2" />
        <div className="w-4 flex-shrink-0 mr-2" />
        <div className="flex-1">Task</div>
        <div className="w-28 flex-shrink-0">Due Date</div>
        <div className="w-20 flex-shrink-0">Shows As</div>
        <div className="w-20 flex-shrink-0">Progress</div>
        <div className="w-16 flex-shrink-0" />
      </div>

      {loading ? (
        <div className="px-4 py-6 text-center text-pink-300 text-sm">Loading...</div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={filteredTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {filteredTasks.map(task => (
              <TaskRow
                key={task.id}
                task={task}
                onUpdate={updateTask}
                onArchive={archiveTask}
                onMove={moveTask}
                currentSectionId={sectionId}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}

      <button onClick={addTask} className="w-full text-left px-4 py-2 text-xs text-pink-300 hover:text-pink-500 hover:bg-pink-50 transition-colors flex items-center gap-1">
        <span>+</span> Add task
      </button>
    </div>
  )
}
