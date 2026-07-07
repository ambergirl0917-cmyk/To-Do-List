'use client'
import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

// ============ TYPES ============
interface ChecklistItem { id: string; text: string; done: boolean }
interface SummerBlock {
  id: string
  user_id: string
  date: string
  title: string
  category: string
  color: string
  duration_minutes: number
  block_type: string
  quantity: number | null
  checklist: ChecklistItem[]
  is_done: boolean
  position: number
}

// ============ COLORS ============
export const CATEGORY_COLORS: Record<string, string> = {
  sat: '#f9d8e4',
  college: '#d0e4f5',
  personal: '#e8e0f5',
  ibcore: '#d4ecd4',
  subject: '#fdebd0',
  other: '#e0e0e0',
}
export const CATEGORY_TEXT: Record<string, string> = {
  sat: '#c4607a',
  college: '#2a5a8a',
  personal: '#7b5ea7',
  ibcore: '#3a7a3a',
  subject: '#a87840',
  other: '#666666',
}
const COLOR_OPTIONS = [
  { label: 'Pink (SAT)', bg: '#f9d8e4', text: '#c4607a' },
  { label: 'Blue (College)', bg: '#d0e4f5', text: '#2a5a8a' },
  { label: 'Lavender (Personal)', bg: '#e8e0f5', text: '#7b5ea7' },
  { label: 'Sage (IB Core)', bg: '#d4ecd4', text: '#3a7a3a' },
  { label: 'Peach (Subject)', bg: '#fdebd0', text: '#a87840' },
  { label: 'Gray (Other)', bg: '#e0e0e0', text: '#666666' },
]

// ============ SCHEDULE GENERATOR ============
function generateSummerSchedule(userId: string): Omit<SummerBlock, 'id'>[] {
  const blocks: Omit<SummerBlock, 'id'>[] = []
  let position = 0

  const addBlock = (
    date: string, title: string, category: string,
    duration_minutes: number, checklist: ChecklistItem[] = [],
    block_type = 'time', quantity: number | null = null
  ) => {
    const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.other
    blocks.push({
      user_id: userId, date, title, category, color,
      duration_minutes, block_type, quantity,
      checklist, is_done: false, position: position++
    })
  }

  const vocabSchedule: Record<string, { learn?: number; review: number[] }> = {
    '2026-07-08': { learn: 14, review: [1, 2] },
    '2026-07-09': { learn: 15, review: [3, 4] },
    '2026-07-10': { learn: 16, review: [5, 6, 7] },
    '2026-07-11': { learn: 17, review: [1, 2, 3] },
    '2026-07-12': { review: [10, 11, 12, 13] },
    '2026-07-13': { learn: 18, review: [4, 5, 6] },
    '2026-07-14': { learn: 19, review: [7, 8, 9] },
    '2026-07-15': { learn: 20, review: [1, 2, 3] },
    '2026-07-16': { learn: 21, review: [10, 11, 12] },
    '2026-07-17': { learn: 22, review: [4, 5, 6, 7] },
    '2026-07-18': { review: [13, 14, 15, 16] },
    '2026-07-19': { learn: 23, review: [1, 2, 3] },
    '2026-07-20': { learn: 24, review: [8, 9, 10] },
    '2026-07-21': { learn: 25, review: [17, 18, 19] },
    '2026-07-22': { learn: 26, review: [4, 5, 6] },
    '2026-07-23': { review: [11, 12, 13, 14] },
    '2026-07-24': { learn: 27, review: [1, 2, 3] },
    '2026-07-25': { learn: 28, review: [20, 21, 22] },
    '2026-07-26': { learn: 29, review: [7, 8, 9] },
    '2026-07-27': { learn: 30, review: [15, 16, 17] },
    '2026-07-28': { review: [23, 24, 25] },
    '2026-07-29': { review: [1, 2, 3, 4, 5] },
    '2026-07-30': { review: [6, 7, 8, 9, 10] },
    '2026-07-31': { review: [11, 12, 13, 14, 15] },
    '2026-08-01': { review: [16, 17, 18, 19, 20] },
    '2026-08-02': { review: [21, 22, 23, 24, 25] },
    '2026-08-03': { review: [26, 27, 28, 29, 30] },
    '2026-08-04': { review: [1, 2, 3, 4, 5] },
    '2026-08-05': { review: [6, 7, 8, 9, 10] },
    '2026-08-06': { review: [11, 12, 13, 14, 15] },
    '2026-08-07': { review: [16, 17, 18, 19, 20] },
    '2026-08-08': { review: [21, 22, 23, 24, 25] },
    '2026-08-09': { review: [26, 27, 28, 29, 30] },
    '2026-08-10': { review: [1, 3, 5, 7, 9] },
    '2026-08-11': { review: [2, 4, 6, 8, 10] },
    '2026-08-12': { review: [11, 13, 15, 17, 19] },
    '2026-08-13': { review: [12, 14, 16, 18, 20] },
    '2026-08-14': { review: [21, 23, 25, 27, 29] },
    '2026-08-15': { review: [22, 24, 26, 28, 30] },
    '2026-08-16': { review: [1, 5, 10, 15, 20] },
    '2026-08-17': { review: [2, 6, 11, 16, 21] },
    '2026-08-18': { review: [3, 7, 12, 17, 22] },
    '2026-08-19': { review: [4, 8, 13, 18, 23] },
    '2026-08-20': { review: [5, 9, 14, 19, 24] },
    '2026-08-21': { review: [25, 26, 27, 28, 29, 30] },
  }

  const bioUnits = [
    'A2.2 Cell Structure',
    'B2.1 Membranes and Transport',
    'B1.2 Protein',
    'C1.1 Enzymes and Metabolism',
    'A3.1 Diversity of Organisms',
    'A4.1 Evolution',
    'D4.1 Natural Selection',
    'D4.2 Stability and Change',
    'B4.1 Adaptation to Environment',
    'B4.2 Ecological Niches',
    'C4.1 Populations and Communities',
  ]

  const econUnits = [
    { title: 'Econ: Review end-of-semester paper + marking', duration: 60 },
    { title: 'Econ Pre-learn: 3.4.1 Inequality', duration: 90 },
    { title: 'Econ Pre-learn: 3.4.2 Poverty', duration: 60 },
    { title: 'Econ Pre-learn: 3.4.3 Causes & Impacts of Inequality and Poverty', duration: 180 },
  ]

  const mathReviewBlocks = [
    { title: 'Math: Review end-of-semester Paper 1 + marking', duration: 120 },
    { title: 'Math: Review end-of-semester Paper 2 + marking', duration: 120 },
    { title: 'Math: Rewrite Paper 1 (timed)', duration: 120 },
    { title: 'Math: Rewrite Paper 2 (timed)', duration: 120 },
    { title: 'Math: Online drills (teacher exercises)', duration: 60 },
  ]

  let bioIndex = 0
  let econIndex = 0
  let mathReviewIndex = 0
  let pandaChapter = 2
  let hardMathDone = 12
  let challengeRWDone = 0
  let rwDrillsDone = 0
  let prepProsDone = 0
  let challengeMathDone = 0

  const startDate = new Date('2026-07-08')
  const endDate = new Date('2026-08-31')
  const satDate = new Date('2026-08-22')
  const postSATStart = new Date('2026-08-23')
  const aug1 = new Date('2026-08-01')

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    const dayOfWeek = d.getDay()
    const isSunday = dayOfWeek === 0
    const isMonday = dayOfWeek === 1
    const isTuesday = dayOfWeek === 2
    const isThursday = dayOfWeek === 4
    const isFriday = dayOfWeek === 5
    const isSaturday = dayOfWeek === 6
    const isBeforeSAT = d < satDate
    const isSATDay = dateStr === '2026-08-22'
    const isPostSAT = d >= postSATStart
    const isCollegeResearchWeek = d <= new Date('2026-07-21')
    const isAfterAug1 = d >= aug1
    const isBMIAWeek = d <= new Date('2026-07-11')
    const dayNum = Math.floor((d.getTime() - startDate.getTime()) / 86400000)

    // SAT DAY — completely blank
    if (isSATDay) continue

    // ========== POST SAT (Aug 23-31) ==========
    if (isPostSAT) {
      if (isSunday) {
        addBlock(dateStr, 'Catch up / Rest', 'other', 120)
        addBlock(dateStr, 'Supplemental Essays', 'college', 120)
        continue
      }
      // English & Chinese IO — main focus
      addBlock(dateStr, 'English IO: Draft & Research', 'ibcore', 120)
      addBlock(dateStr, 'Chinese IO: Draft & Research', 'ibcore', 120)
      // EE
      addBlock(dateStr, 'EE: Writing session', 'ibcore', 90)
      // Lirae
      addBlock(dateStr, 'Lirae', 'personal', 60)
      // Supplemental essays
      addBlock(dateStr, 'Supplemental Essays', 'college', 120)
      // IA work (generic editable)
      addBlock(dateStr, 'IA Work: Working session', 'ibcore', 60)
      // Subject study (lighter)
      if (isTuesday || isFriday) {
        if (bioIndex < bioUnits.length) {
          addBlock(dateStr, `Bio Review: ${bioUnits[bioIndex]}`, 'subject', 90)
          bioIndex++
        }
      }
      if (isMonday || isThursday) {
        if (econIndex < econUnits.length) {
          addBlock(dateStr, econUnits[econIndex].title, 'subject', econUnits[econIndex].duration)
          econIndex++
        }
      }
      continue
    }

    // ========== PRE SAT (Jul 8 - Aug 21) ==========
    if (isSunday) {
      if (vocabSchedule[dateStr]) {
        const v = vocabSchedule[dateStr]
        if (v.learn) addBlock(dateStr, `Vocab: Learn Set ${v.learn} (new)`, 'sat', 40)
        if (v.review.length > 0) addBlock(dateStr,
          `Vocab: Review Sets ${v.review.join(', ')}`, 'sat', v.review.length * 12,
          v.review.map(n => ({ id: n.toString(), text: `Set ${n}`, done: false }))
        )
      }
      if (rwDrillsDone < 1492) {
        addBlock(dateStr, `RW Drills: 20 questions (${rwDrillsDone + 1}–${rwDrillsDone + 20})`, 'sat', 60, [], 'quantity', 20)
        rwDrillsDone += 20
      }
      if (isCollegeResearchWeek) addBlock(dateStr, 'College Research', 'college', 60)
      addBlock(dateStr, 'EE: Research & Planning', 'ibcore', 45)
      addBlock(dateStr, 'Lirae', 'personal', 45)
      continue
    }

    // SAT Classes (only before SAT)
    if (isMonday || isThursday) {
      addBlock(dateStr, 'Math SAT Class (10:00–11:30am)', 'sat', 90)
    }
    if (isTuesday || isFriday) {
      addBlock(dateStr, 'English SAT Class (2:20–3:50pm)', 'sat', 90)
      addBlock(dateStr, 'Teacher HW: Practice Test Module 1 (45min)', 'sat', 45)
    }

    // RW Drills
    if (rwDrillsDone < 1492) {
      addBlock(dateStr, `RW Drills: 35 questions (${rwDrillsDone + 1}–${rwDrillsDone + 35})`, 'sat', 105, [], 'quantity', 35)
      rwDrillsDone += 35
    }

    // Challenge RW
    if (challengeRWDone < 277) {
      addBlock(dateStr, `Challenge RW: 6 questions (${challengeRWDone + 1}–${challengeRWDone + 6})`, 'sat', 36, [], 'quantity', 6)
      challengeRWDone += 6
    }

    // Vocab
    if (vocabSchedule[dateStr]) {
      const v = vocabSchedule[dateStr]
      if (v.learn) addBlock(dateStr, `Vocab: Learn Set ${v.learn} (new)`, 'sat', 40)
      if (v.review.length > 0) addBlock(dateStr,
        `Vocab: Review Sets ${v.review.join(', ')}`, 'sat', v.review.length * 12,
        v.review.map(n => ({ id: n.toString(), text: `Set ${n}`, done: false }))
      )
    }

    // Hard Math (not on class days)
    if (hardMathDone < 150 && !isMonday && !isThursday) {
      const q = 8
      addBlock(dateStr, `PrepPros Hard Math: Q${hardMathDone + 1}–${hardMathDone + q} (${q}q × 7min)`, 'sat', q * 7, [], 'quantity', q)
      hardMathDone += q
    }

    // Panda Book
    if (pandaChapter <= 27 && (isMonday || isThursday || dayOfWeek === 3 || isSaturday)) {
      addBlock(dateStr, `Panda Book: Chapter ${pandaChapter}`, 'sat', 60)
      pandaChapter++
    }

    // PrepPros practice tests every 5 days
    if (prepProsDone < 10 && dayNum % 5 === 3 && !isTuesday && !isFriday) {
      addBlock(dateStr, `PrepPros Practice Test #${prepProsDone + 1} — RW Module`, 'sat', 90)
      prepProsDone++
    }

    // Challenge Math
    if (challengeMathDone < 75 && dayNum % 3 === 2) {
      addBlock(dateStr, `PrepPros Challenge Math: Q${challengeMathDone + 1}–${challengeMathDone + 5}`, 'sat', 35, [], 'quantity', 5)
      challengeMathDone += 5
    }

    // BM IA this week only
    if (isBMIAWeek) {
      addBlock(dateStr, 'BM IA: Work session', 'ibcore', 60)
    }

    // College Research first 2 weeks
    if (isCollegeResearchWeek) {
      addBlock(dateStr, 'College Research', 'college', isMonday || isThursday || isTuesday || isFriday ? 60 : 90)
    }

    // College App Essay
    if (!isAfterAug1) {
      addBlock(dateStr, 'Common App Essay (1hr)', 'college', 60)
    } else {
      addBlock(dateStr, 'Supplemental Essays (2hr)', 'college', 120)
    }

    // EE (light before SAT)
    if (!isBMIAWeek || isSaturday) {
      addBlock(dateStr, 'EE: Research & Planning', 'ibcore', 45)
    }

    // Lirae
    addBlock(dateStr, 'Lirae', 'personal', 60)

    // Competition 3x/week
    if (dayOfWeek === 3 || isSaturday || isTuesday) {
      if (dateStr === '2026-07-09') {
        addBlock(dateStr, 'Competition: Research & Registration', 'personal', 60)
      } else {
        addBlock(dateStr, 'Competition: Work session', 'personal', 45)
      }
    }

    // IO light blocks (Wed & Sat only, after BM IA week)
    if (!isBMIAWeek && (dayOfWeek === 3 || isSaturday)) {
      addBlock(dateStr, 'IO: Working session', 'ibcore', 60)
    }

    // English Paper 1 practice (Wed & Sat)
    if (dayOfWeek === 3 || isSaturday) {
      addBlock(dateStr, 'English Paper 1: Practice writing', 'subject', 60)
    }

    // Bio (Saturdays)
    if (isSaturday && bioIndex < bioUnits.length) {
      addBlock(dateStr, `Bio Review: ${bioUnits[bioIndex]}`, 'subject', 90)
      bioIndex++
    }

    // Econ (Wednesdays)
    if (dayOfWeek === 3 && econIndex < econUnits.length) {
      addBlock(dateStr, econUnits[econIndex].title, 'subject', econUnits[econIndex].duration)
      econIndex++
    }

    // Math review (Thursdays)
    if (isThursday && mathReviewIndex < mathReviewBlocks.length) {
      addBlock(dateStr, mathReviewBlocks[mathReviewIndex].title, 'subject', mathReviewBlocks[mathReviewIndex].duration)
      mathReviewIndex++
    }
  }

  return blocks
}

// ============ BLOCK EDIT MODAL ============
function BlockEditModal({ block, onSave, onClose, onDelete }: {
  block: SummerBlock
  onSave: (updates: Partial<SummerBlock>) => void
  onClose: () => void
  onDelete: () => void
}) {
  const [title, setTitle] = useState(block.title)
  const [duration, setDuration] = useState(block.duration_minutes)
  const [color, setColor] = useState(block.color)
  const [date, setDate] = useState(block.date)
  const [newItem, setNewItem] = useState('')
  const [checklist, setChecklist] = useState<ChecklistItem[]>(block.checklist || [])

  const addChecklistItem = () => {
    if (!newItem.trim()) return
    setChecklist(prev => [...prev, { id: Date.now().toString(), text: newItem.trim(), done: false }])
    setNewItem('')
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-700">Edit Block</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 font-medium">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full mt-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-pink-300" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">Duration (minutes)</label>
            <div className="flex items-center gap-2 mt-1">
              <button onClick={() => setDuration(d => Math.max(5, d - 5))} className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 font-bold">-</button>
              <input type="number" value={duration} onChange={e => setDuration(parseInt(e.target.value) || 0)}
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-pink-300 text-center" />
              <button onClick={() => setDuration(d => d + 5)} className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 font-bold">+</button>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">Move to Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full mt-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-pink-300" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">Color</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {COLOR_OPTIONS.map(c => (
                <button key={c.bg} onClick={() => setColor(c.bg)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${color === c.bg ? 'border-gray-600 scale-110' : 'border-transparent'}`}
                  style={{ background: c.bg }} title={c.label} />
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">Checklist</label>
            <div className="space-y-1 mt-1 max-h-32 overflow-y-auto">
              {checklist.map(item => (
                <div key={item.id} className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 flex-1">{item.text}</span>
                  <button onClick={() => setChecklist(prev => prev.filter(i => i.id !== item.id))} className="text-red-300 hover:text-red-500 text-sm">&times;</button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-1">
              <input value={newItem} onChange={e => setNewItem(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addChecklistItem()}
                placeholder="Add checklist item..."
                className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-pink-300" />
              <button onClick={addChecklistItem} className="text-xs bg-pink-500 text-white px-2 py-1.5 rounded-lg">Add</button>
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={() => onSave({ title, duration_minutes: duration, color, date, checklist })}
            className="flex-1 bg-pink-500 text-white text-sm py-2 rounded-lg hover:bg-pink-600">Save</button>
          <button onClick={onDelete}
            className="text-sm text-red-400 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50">Delete</button>
        </div>
      </div>
    </div>
  )
}

// ============ ADD BLOCK MODAL ============
function AddBlockModal({ date, userId, onSave, onClose }: {
  date: string
  userId: string
  onSave: (block: Omit<SummerBlock, 'id'>) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState('')
  const [duration, setDuration] = useState(60)
  const [color, setColor] = useState(CATEGORY_COLORS.other)
  const [newItem, setNewItem] = useState('')
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])

  const addChecklistItem = () => {
    if (!newItem.trim()) return
    setChecklist(prev => [...prev, { id: Date.now().toString(), text: newItem.trim(), done: false }])
    setNewItem('')
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-700">Add Block — {date}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 font-medium">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Block title..."
              className="w-full mt-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-pink-300" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">Duration (minutes)</label>
            <div className="flex items-center gap-2 mt-1">
              <button onClick={() => setDuration(d => Math.max(5, d - 5))} className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 font-bold">-</button>
              <input type="number" value={duration} onChange={e => setDuration(parseInt(e.target.value) || 0)}
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-pink-300 text-center" />
              <button onClick={() => setDuration(d => d + 5)} className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 font-bold">+</button>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">Color</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {COLOR_OPTIONS.map(c => (
                <button key={c.bg} onClick={() => setColor(c.bg)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${color === c.bg ? 'border-gray-600 scale-110' : 'border-transparent'}`}
                  style={{ background: c.bg }} title={c.label} />
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">Checklist (optional)</label>
            <div className="space-y-1 mt-1">
              {checklist.map(item => (
                <div key={item.id} className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 flex-1">{item.text}</span>
                  <button onClick={() => setChecklist(prev => prev.filter(i => i.id !== item.id))} className="text-red-300 hover:text-red-500 text-sm">&times;</button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-1">
              <input value={newItem} onChange={e => setNewItem(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addChecklistItem()}
                placeholder="Add checklist item..."
                className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-pink-300" />
              <button onClick={addChecklistItem} className="text-xs bg-pink-500 text-white px-2 py-1.5 rounded-lg">Add</button>
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            if (!title.trim()) return
            onSave({ user_id: userId, date, title, category: 'other', color, duration_minutes: duration, block_type: 'time', quantity: null, checklist, is_done: false, position: 999 })
          }}
          className="w-full mt-4 bg-pink-500 text-white text-sm py-2 rounded-lg hover:bg-pink-600"
        >Add Block</button>
      </div>
    </div>
  )
}

// ============ MAIN PAGE ============
export default function SummerPlanPage({ user }: { user: User }) {
  const [blocks, setBlocks] = useState<SummerBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const [view, setView] = useState<'month' | 'week' | 'day'>('week')
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const d = new Date()
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    d.setDate(d.getDate() + diff)
    return d.toISOString().split('T')[0]
  })
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const [editingBlock, setEditingBlock] = useState<SummerBlock | null>(null)
  const [addingToDate, setAddingToDate] = useState<string | null>(null)

  useEffect(() => { fetchBlocks() }, [user])

  const fetchBlocks = async () => {
    const { data } = await supabase.from('summer_blocks').select('*').eq('user_id', user.id).order('position')
    if (data && data.length > 0) {
      setBlocks(data)
      setInitialized(true)
    } else {
      setInitialized(false)
    }
    setLoading(false)
  }

  const initializeSchedule = async () => {
    setLoading(true)
    const schedule = generateSummerSchedule(user.id)
    const chunkSize = 50
    const allBlocks: SummerBlock[] = []
    for (let i = 0; i < schedule.length; i += chunkSize) {
      const chunk = schedule.slice(i, i + chunkSize)
      const { data } = await supabase.from('summer_blocks').insert(chunk).select()
      if (data) allBlocks.push(...data)
    }
    setBlocks(allBlocks)
    setInitialized(true)
    setLoading(false)
  }

  const toggleBlock = async (id: string) => {
    const block = blocks.find(b => b.id === id)
    if (!block) return
    const newDone = !block.is_done
    const newChecklist = block.checklist?.map(i => ({ ...i, done: newDone })) || []
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, is_done: newDone, checklist: newChecklist } : b))
    await supabase.from('summer_blocks').update({ is_done: newDone, checklist: newChecklist }).eq('id', id)
  }

  const toggleChecklistItem = async (blockId: string, itemId: string) => {
    const block = blocks.find(b => b.id === blockId)
    if (!block) return
    const newChecklist = block.checklist.map(i => i.id === itemId ? { ...i, done: !i.done } : i)
    const allDone = newChecklist.every(i => i.done)
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, checklist: newChecklist, is_done: allDone } : b))
    await supabase.from('summer_blocks').update({ checklist: newChecklist, is_done: allDone }).eq('id', blockId)
  }

  const updateBlock = async (id: string, updates: Partial<SummerBlock>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b))
    await supabase.from('summer_blocks').update(updates).eq('id', id)
    setEditingBlock(null)
  }

  const deleteBlock = async (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id))
    await supabase.from('summer_blocks').delete().eq('id', id)
    setEditingBlock(null)
  }

  const addBlock = async (block: Omit<SummerBlock, 'id'>) => {
    const { data } = await supabase.from('summer_blocks').insert(block).select().single()
    if (data) setBlocks(prev => [...prev, data])
    setAddingToDate(null)
  }

  const todayBlocks = blocks.filter(b => b.date === selectedDate)
  const totalMins = todayBlocks.reduce((sum, b) => sum + b.duration_minutes, 0)
  const doneMins = todayBlocks.filter(b => b.is_done).reduce((sum, b) => sum + b.duration_minutes, 0)
  const progress = totalMins > 0 ? (doneMins / totalMins) * 100 : 0

  const getWeekDates = (startStr: string) => {
    const dates = []
    const start = new Date(startStr)
    for (let i = 0; i < 7; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      dates.push(d.toISOString().split('T')[0])
    }
    return dates
  }

  const weekDates = getWeekDates(currentWeekStart)
  const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  const prevWeek = () => {
    const d = new Date(currentWeekStart)
    d.setDate(d.getDate() - 7)
    setCurrentWeekStart(d.toISOString().split('T')[0])
  }
  const nextWeek = () => {
    const d = new Date(currentWeekStart)
    d.setDate(d.getDate() + 7)
    setCurrentWeekStart(d.toISOString().split('T')[0])
  }

  const getDaysInMonth = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days: (string | null)[] = Array(firstDay === 0 ? 6 : firstDay - 1).fill(null)
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
    }
    return days
  }

  const monthDays = getDaysInMonth(currentMonth.year, currentMonth.month)

  if (loading) return <div className="flex items-center justify-center h-64 text-pink-300 text-sm">Loading...</div>

  if (!initialized) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-gray-500 text-sm text-center">No summer plan yet! Click to generate your full Jul 8 – Aug 31 schedule.</p>
        <button onClick={initializeSchedule} className="bg-pink-500 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-pink-600 transition-colors">
          Generate My Summer Plan 🌸
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Sticky progress bar */}
      <div className="sticky top-0 z-30 bg-white border-b border-pink-100 px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-pink-700">
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
          <span className="text-xs text-gray-400">{Math.round(doneMins / 60 * 10) / 10}h / {Math.round(totalMins / 60 * 10) / 10}h</span>
        </div>
        <div className="w-full bg-pink-100 rounded-full h-2.5">
          <div className="h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #f9d8e4, #c4607a)' }} />
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex bg-pink-50 rounded-lg p-0.5 gap-0.5">
            {(['month', 'week', 'day'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`text-xs px-3 py-1 rounded-md transition-colors capitalize ${view === v ? 'bg-white text-pink-600 shadow-sm font-medium' : 'text-pink-400'}`}>
                {v}
              </button>
            ))}
          </div>
          <button onClick={() => setAddingToDate(selectedDate)}
            className="text-xs bg-pink-500 text-white px-3 py-1.5 rounded-lg hover:bg-pink-600">+ Add</button>
        </div>
      </div>

      {/* MONTH VIEW */}
      {view === 'month' && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setCurrentMonth(m => {
              const newMonth = m.month - 1
              return newMonth < 0 ? { year: m.year - 1, month: 11 } : { ...m, month: newMonth }
            })} className="text-pink-400 p-1">◀</button>
            <span className="text-sm font-semibold text-pink-700">
              {new Date(currentMonth.year, currentMonth.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={() => setCurrentMonth(m => {
              const newMonth = m.month + 1
              return newMonth > 11 ? { year: m.year + 1, month: 0 } : { ...m, month: newMonth }
            })} className="text-pink-400 p-1">▶</button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAY_NAMES.map(d => <div key={d} className="text-center text-xs text-pink-400 font-medium py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((dateStr, i) => {
              if (!dateStr) return <div key={i} />
              const dayBlocks = blocks.filter(b => b.date === dateStr)
              const undoneBlocks = dayBlocks.filter(b => !b.is_done)
              const isSelected = dateStr === selectedDate
              const isToday = dateStr === new Date().toISOString().split('T')[0]
              const isSATDay = dateStr === '2026-08-22'
              return (
                <button key={dateStr} onClick={() => { setSelectedDate(dateStr); setView('day') }}
                  className={`rounded-xl p-1 min-h-[60px] text-left transition-colors ${isSelected ? 'ring-2 ring-pink-400' : ''} ${isToday ? 'bg-pink-50' : isSATDay ? 'bg-yellow-50' : 'bg-white'} border border-pink-50`}>
                  <span className={`text-xs font-medium ${isToday ? 'text-pink-600' : isSATDay ? 'text-yellow-600' : 'text-gray-500'}`}>
                    {new Date(dateStr + 'T00:00:00').getDate()}
                    {isSATDay ? ' 🎯' : ''}
                  </span>
                  <div className="flex flex-col gap-0.5 mt-0.5">
                    {undoneBlocks.slice(0, 3).map(b => (
                      <div key={b.id} style={{ background: b.color }} className="rounded text-xs px-1 truncate">
                        <span style={{ color: COLOR_OPTIONS.find(c => c.bg === b.color)?.text || '#666' }} className="text-[9px]">
                          {b.title.length > 8 ? b.title.slice(0, 8) + '…' : b.title}
                        </span>
                      </div>
                    ))}
                    {undoneBlocks.length > 3 && <span className="text-[9px] text-gray-400">+{undoneBlocks.length - 3}</span>}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* WEEK VIEW */}
      {view === 'week' && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevWeek} className="text-pink-400 p-1 hover:text-pink-600">◀</button>
            <span className="text-xs font-semibold text-pink-700">
              {new Date(weekDates[0] + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –{' '}
              {new Date(weekDates[6] + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
            <button onClick={nextWeek} className="text-pink-400 p-1 hover:text-pink-600">▶</button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {weekDates.map((dateStr, i) => {
              const dayBlocks = blocks.filter(b => b.date === dateStr)
              const undone = dayBlocks.filter(b => !b.is_done)
              const isSelected = dateStr === selectedDate
              const isToday = dateStr === new Date().toISOString().split('T')[0]
              const isSATDay = dateStr === '2026-08-22'
              return (
                <button key={dateStr} onClick={() => { setSelectedDate(dateStr); setView('day') }}
                  className={`rounded-xl p-2 min-h-[100px] text-left transition-colors border ${isSelected ? 'border-pink-400 ring-1 ring-pink-300' : 'border-pink-50'} ${isToday ? 'bg-pink-50' : isSATDay ? 'bg-yellow-50' : 'bg-white'}`}>
                  <div className={`text-xs font-semibold mb-1 ${isToday ? 'text-pink-600' : isSATDay ? 'text-yellow-600' : 'text-gray-500'}`}>
                    <div>{DAY_NAMES[i]}</div>
                    <div>{new Date(dateStr + 'T00:00:00').getDate()}{isSATDay ? ' 🎯' : ''}</div>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {undone.slice(0, 4).map(b => (
                      <div key={b.id} style={{ background: b.color }} className="rounded px-1 py-0.5">
                        <span style={{ color: COLOR_OPTIONS.find(c => c.bg === b.color)?.text || '#666' }} className="text-[9px] leading-tight block truncate">
                          {b.title.length > 10 ? b.title.slice(0, 10) + '…' : b.title}
                        </span>
                      </div>
                    ))}
                    {isSATDay && <span className="text-[9px] text-yellow-600 font-medium">SAT Day! 🎯</span>}
                    {undone.length > 4 && <span className="text-[9px] text-gray-400">+{undone.length - 4} more</span>}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* DAY VIEW */}
      {view === 'day' && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => {
              const d = new Date(selectedDate)
              d.setDate(d.getDate() - 1)
              setSelectedDate(d.toISOString().split('T')[0])
            }} className="text-pink-400 p-1 hover:text-pink-600">◀</button>
            <span className="text-sm font-semibold text-pink-700">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
            <button onClick={() => {
              const d = new Date(selectedDate)
              d.setDate(d.getDate() + 1)
              setSelectedDate(d.toISOString().split('T')[0])
            }} className="text-pink-400 p-1 hover:text-pink-600">▶</button>
          </div>

          {selectedDate === '2026-08-22' ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <span className="text-5xl">🎯</span>
              <p className="text-lg font-bold text-yellow-600">SAT Day!</p>
              <p className="text-sm text-gray-400">Go get that score! You've got this 🌸</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayBlocks.length === 0 && (
                <div className="text-center text-pink-200 text-sm italic py-8">No blocks for this day</div>
              )}
              {todayBlocks.map(block => {
                const textColor = COLOR_OPTIONS.find(c => c.bg === block.color)?.text || '#666'
                const hours = Math.floor(block.duration_minutes / 60)
                const mins = block.duration_minutes % 60
                const durationStr = hours > 0 ? `${hours}h${mins > 0 ? ` ${mins}m` : ''}` : `${mins}m`
                return (
                  <div key={block.id} style={{ background: block.color }}
                    className={`rounded-xl p-3 transition-all ${block.is_done ? 'opacity-50' : ''}`}>
                    <div className="flex items-start gap-2">
                      <button onClick={() => toggleBlock(block.id)}
                        className="w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors"
                        style={{ borderColor: textColor, background: block.is_done ? textColor : 'transparent' }}>
                        {block.is_done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${block.is_done ? 'line-through opacity-60' : ''}`} style={{ color: textColor }}>
                          {block.title}
                        </p>
                        <p className="text-xs opacity-60 mt-0.5" style={{ color: textColor }}>{durationStr}</p>
                        {block.checklist && block.checklist.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {block.checklist.map(item => (
                              <button key={item.id} onClick={() => toggleChecklistItem(block.id, item.id)}
                                className="flex items-center gap-2 w-full text-left">
                                <div className="w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                                  style={{ borderColor: textColor, background: item.done ? textColor : 'transparent' }}>
                                  {item.done && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                                </div>
                                <span className={`text-xs ${item.done ? 'line-through opacity-50' : ''}`} style={{ color: textColor }}>
                                  {item.text}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button onClick={() => setEditingBlock(block)}
                        className="text-xs opacity-40 hover:opacity-70 p-1 flex-shrink-0" style={{ color: textColor }}>✎</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {editingBlock && (
        <BlockEditModal
          block={editingBlock}
          onSave={updates => updateBlock(editingBlock.id, updates)}
          onClose={() => setEditingBlock(null)}
          onDelete={() => deleteBlock(editingBlock.id)}
        />
      )}
      {addingToDate && (
        <AddBlockModal
          date={addingToDate}
          userId={user.id}
          onSave={addBlock}
          onClose={() => setAddingToDate(null)}
        />
      )}
    </div>
  )
}
