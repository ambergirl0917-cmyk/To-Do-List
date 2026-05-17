'use client'
import { useState } from 'react'
import { Task, ChecklistItem } from '@/lib/types'

interface NotesPanelProps {
  task: Task
  onUpdate: (id: string, updates: Partial<Task>) => void
  onClose: () => void
}

export default function NotesPanel({ task, onUpdate, onClose }: NotesPanelProps) {
  const [newItem, setNewItem] = useState('')

  const checklist: ChecklistItem[] = task.checklist || []

  const addChecklistItem = () => {
    if (!newItem.trim()) return
    const item: ChecklistItem = { id: Date.now().toString(), text: newItem.trim(), done: false }
    onUpdate(task.id, { checklist: [...checklist, item] })
    setNewItem('')
  }

  const toggleItem = (id: string) => {
    const updated = checklist.map(i => i.id === id ? { ...i, done: !i.done } : i)
    onUpdate(task.id, { checklist: updated })
  }

  const deleteItem = (id: string) => {
    onUpdate(task.id, { checklist: checklist.filter(i => i.id !== id) })
  }

  return (
    <div className="border-b border-pink-100 bg-pink-50/50 px-8 py-3 animate-slideIn">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-pink-600">Notes & Checklist</span>
        <button onClick={onClose} className="text-pink-300 hover:text-pink-500 text-lg leading-none">&times;</button>
      </div>

      <textarea
        value={task.notes}
        onChange={e => onUpdate(task.id, { notes: e.target.value })}
        placeholder="Add notes, links, or context..."
        className="w-full text-sm text-gray-600 bg-white border border-pink-100 rounded-lg px-3 py-2 outline-none resize-none focus:border-pink-300 transition-colors mb-3"
        rows={3}
      />

      <div className="space-y-1 mb-2">
        {checklist.map(item => (
          <div key={item.id} className="flex items-center gap-2 group">
            <input
              type="checkbox"
              checked={item.done}
              onChange={() => toggleItem(item.id)}
              className="accent-pink-500"
            />
            <span className={`text-sm flex-1 ${item.done ? 'line-through text-gray-400' : 'text-gray-600'}`}>{item.text}</span>
            <button onClick={() => deleteItem(item.id)} className="text-pink-200 hover:text-pink-400 opacity-0 group-hover:opacity-100 text-lg leading-none">&times;</button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addChecklistItem()}
          placeholder="Add checklist item..."
          className="flex-1 text-sm bg-white border border-pink-100 rounded-lg px-3 py-1.5 outline-none focus:border-pink-300 transition-colors"
        />
        <button onClick={addChecklistItem} className="text-xs bg-pink-500 text-white px-3 py-1.5 rounded-lg hover:bg-pink-600 transition-colors">Add</button>
      </div>

      <div className="mt-3 flex gap-4">
        <div>
          <p className="text-xs text-pink-400 font-medium mb-1">Custom reminder</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={task.reminder_days ?? ''}
              onChange={e => onUpdate(task.id, { reminder_days: e.target.value ? parseInt(e.target.value) : null })}
              placeholder="2"
              min="1"
              max="30"
              className="w-16 text-sm bg-white border border-pink-100 rounded-lg px-2 py-1 outline-none focus:border-pink-300"
            />
            <span className="text-xs text-gray-500">days before (default: 2)</span>
          </div>
        </div>

        <div>
          <p className="text-xs text-pink-400 font-medium mb-1">Recurring</p>
          <select
            value={task.recur_interval || ''}
            onChange={e => onUpdate(task.id, { is_recurring: !!e.target.value, recur_interval: e.target.value || null })}
            className="text-sm bg-white border border-pink-100 rounded-lg px-2 py-1 outline-none focus:border-pink-300"
          >
            <option value="">Not recurring</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      </div>
    </div>
  )
}
