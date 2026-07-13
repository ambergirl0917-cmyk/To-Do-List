'use client'
import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

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

export const CATEGORY_COLORS: Record<string, string> = {
  sat: '#f9d8e4',
  college: '#d0e4f5',
  personal: '#e8e0f5',
  ibcore: '#d4ecd4',
  subject: '#fdebd0',
  other: '#e0e0e0',
}

const COLOR_OPTIONS = [
  { label: 'Pink (SAT)', bg: '#f9d8e4', text: '#c4607a' },
  { label: 'Blue (College)', bg: '#d0e4f5', text: '#2a5a8a' },
  { label: 'Lavender (Personal)', bg: '#e8e0f5', text: '#7b5ea7' },
  { label: 'Sage (IB Core)', bg: '#d4ecd4', text: '#3a7a3a' },
  { label: 'Peach (Subject)', bg: '#fdebd0', text: '#a87840' },
  { label: 'Gray (Other)', bg: '#e0e0e0', text: '#666666' },
]

function getTextColor(bg: string) {
  return COLOR_OPTIONS.find(c => c.bg === bg)?.text || '#666'
}

function generateSchedule(userId: string): Omit<SummerBlock, 'id'>[] {
  const blocks: Omit<SummerBlock, 'id'>[] = []
  let pos = 0

  const add = (
    date: string, title: string, category: string,
    duration_minutes: number, checklist: ChecklistItem[] = [],
    block_type = 'time', quantity: number | null = null
  ) => {
    blocks.push({
      user_id: userId, date, title, category,
      color: CATEGORY_COLORS[category] || CATEGORY_COLORS.other,
      duration_minutes, block_type, quantity,
      checklist, is_done: false, position: pos++
    })
  }

  // Progress trackers
  let rwDone = 105
  let challengeRWDone = 0
  let hardMathDone = 26
  let challengeMathDone = 0
  let pandaChapter = 4
  let vocabSetToLearn = 14
  let prepProsDone = 0
  let bioIndex = 0
  let econIndex = 0
  let mathReviewIndex = 0
  let bragSheetSessions = 0
  let englishPaper1Done = 0
  let lastPracticeTestDay = -10

  const bioUnits = [
    'A2.2 Cell Structure', 'B2.1 Membranes and Transport', 'B1.2 Protein',
    'C1.1 Enzymes and Metabolism', 'A3.1 Diversity of Organisms', 'A4.1 Evolution',
    'D4.1 Natural Selection', 'D4.2 Stability and Change', 'B4.1 Adaptation to Environment',
    'B4.2 Ecological Niches', 'C4.1 Populations and Communities',
  ]
  const econUnits = [
    { title: 'Econ: Review end-of-semester paper + marking', duration: 60 },
    { title: 'Econ Pre-learn: 3.4.1 Inequality', duration: 90 },
    { title: 'Econ Pre-learn: 3.4.2 Poverty', duration: 60 },
    { title: 'Econ Pre-learn: 3.4.3 Causes & Impacts of Inequality and Poverty', duration: 180 },
  ]
  const mathReview = [
    { title: 'Math: Review Paper 1 + marking', duration: 120 },
    { title: 'Math: Review Paper 2 + marking', duration: 120 },
    { title: 'Math: Rewrite Paper 1 (timed)', duration: 120 },
    { title: 'Math: Rewrite Paper 2 (timed)', duration: 120 },
  ]

  // Vocab review sets cycling
  const getVocabReview = (dayNum: number, learnedUpTo: number): number[] => {
    const available = Math.min(learnedUpTo, 30)
    if (available === 0) return [1,2,3,4,5]
    const sets: number[] = []
    for (let i = 0; i < 5; i++) {
      sets.push(((dayNum * 3 + i * 7) % available) + 1)
    }
return Array.from(new Set(sets)).slice(0, 5)  }

  // TODAY Jul 13
  add('2026-07-13', 'Essay class + prep work', 'college', 150)
  add('2026-07-13', 'Lirae', 'personal', 90)

  const startDate = new Date('2026-07-14')
  const endDate = new Date('2026-08-31')
  const satDate = new Date('2026-08-22')
  const postSATStart = new Date('2026-08-23')
  const aug1 = new Date('2026-08-01')
  const collegeResearchEnd = new Date('2026-07-21')
  const bragSheetStart = new Date('2026-07-18')

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const ds = d.toISOString().split('T')[0]
    const dow = d.getDay()
    const isSun = dow === 0
    const isMon = dow === 1
    const isTue = dow === 2
    const isWed = dow === 3
    const isThu = dow === 4
    const isFri = dow === 5
    const isSat = dow === 6
    const isMathClass = isMon || isThu
    const isEngClass = isTue || isFri
    const isBeforeSAT = d < satDate
    const isSATDay = ds === '2026-08-22'
    const isPostSAT = d >= postSATStart
    const isThisWeek = d <= new Date('2026-07-20')
    const isAfterAug1 = d >= aug1
    const dayNum = Math.floor((d.getTime() - startDate.getTime()) / 86400000)

    if (isSATDay) continue

    // ===== POST SAT =====
    if (isPostSAT) {
      if (isSun) { add(ds, 'Rest & catch up', 'other', 60); continue }
      add(ds, 'English IO: Draft & Research', 'ibcore', 120)
      add(ds, 'Chinese IO: Draft & Research', 'ibcore', 120)
      add(ds, 'EE: Writing session', 'ibcore', 90)
      add(ds, 'Supplemental Essays', 'college', 120)
      add(ds, 'Lirae', 'personal', 60)
      add(ds, 'IA Work: Working session', 'ibcore', 60)
      continue
    }

    // ===== SUNDAY =====
    if (isSun) {
      // Light day — 20 RW drills + vocab review + school catch up
      if (rwDone < 1492) {
        add(ds, 'RW Drills: 20 questions', 'sat', 60, [], 'quantity', 20)
        rwDone += 20
      }
      const reviewSets = getVocabReview(dayNum, vocabSetToLearn - 1)
      add(ds, `Vocab: Review Sets ${reviewSets.join(', ')}`, 'sat', reviewSets.length * 5,
        reviewSets.map(n => ({ id: n.toString(), text: `Set ${n}`, done: false })))

      // Panda occasionally on Sunday (1 chapter)
      if (pandaChapter <= 27 && dayNum % 3 === 0) {
        add(ds, `Panda Book: Chapter ${pandaChapter}`, 'sat', 60)
        pandaChapter++
      }

      // Light school stuff
      if (bioIndex < bioUnits.length && dayNum % 2 === 0) {
        add(ds, `Bio Review: ${bioUnits[bioIndex]}`, 'subject', 90)
        bioIndex++
      }
      add(ds, 'EE: Research & Planning', 'ibcore', 45)
      add(ds, 'Rest & catch up', 'other', 60)
      continue
    }

    // ===== SATURDAY =====
    if (isSat) {
      // School stuff day
      if (bioIndex < bioUnits.length) {
        add(ds, `Bio Review: ${bioUnits[bioIndex]}`, 'subject', 90)
        bioIndex++
      }
      if (econIndex < econUnits.length) {
        add(ds, econUnits[econIndex].title, 'subject', econUnits[econIndex].duration)
        econIndex++
      } else if (mathReviewIndex < mathReview.length) {
        add(ds, mathReview[mathReviewIndex].title, 'subject', mathReview[mathReviewIndex].duration)
        mathReviewIndex++
      }
      // English Paper 1 every 2 weeks
      if (dayNum % 14 < 2) {
        add(ds, 'English Paper 1: Practice writing (1hr)', 'sat', 60)
        englishPaper1Done++
      }
      // Brag sheet
      if (d >= bragSheetStart && bragSheetSessions < 4) {
        add(ds, 'Brag Sheet: Research & writing', 'college', 105)
        bragSheetSessions++
      }
      // EE
      add(ds, 'EE: Research & Writing', 'ibcore', 60)
      // Light RW drills
      if (rwDone < 1492) {
        add(ds, 'RW Drills: 20 questions', 'sat', 60, [], 'quantity', 20)
        rwDone += 20
      }
      continue
    }

    // ===== WEEKDAYS (Mon-Fri) =====
    let satMins = 0

    // SAT Classes
    if (isMathClass) {
      add(ds, 'Math SAT Class (10:00–11:30am)', 'sat', 90)
    }
    if (isEngClass) {
      add(ds, 'English SAT Class (2:20–3:50pm)', 'sat', 90)
      add(ds, 'Teacher HW: Practice Test Module 1', 'sat', 45)
      satMins += 45
    }

    // Hard math before Mon/Thu class (do it before 10am)
    if (isMathClass && hardMathDone < 150) {
      add(ds, `PrepPros Hard Math: 8 questions (before class)`, 'sat', 56, [], 'quantity', 8)
      hardMathDone += 8
      satMins += 56
    }

    // Panda — flexible, 1-2 chapters on Wed/Fri/Mon/Thu
    if ((isWed || isFri || isMathClass) && pandaChapter <= 27) {
      const chapters = (isWed || isFri) ? 2 : 1
      const actualChapters = Math.min(chapters, 28 - pandaChapter)
      if (actualChapters > 0) {
        add(ds, actualChapters > 1
          ? `Panda Book: Chapters ${pandaChapter} & ${pandaChapter + 1}`
          : `Panda Book: Chapter ${pandaChapter}`,
          'sat', actualChapters * 60)
        satMins += actualChapters * 60
        pandaChapter += actualChapters
      }
    }

    // RW Drills (every weekday — most important)
    if (rwDone < 1492) {
      add(ds, 'RW Drills: 35 questions', 'sat', 105, [], 'quantity', 35)
      rwDone += 35
      satMins += 105
    }

    // Vocab
    if (vocabSetToLearn <= 30 && dayNum % 2 === 0) {
      add(ds, `Vocab: Learn Set ${vocabSetToLearn} (new)`, 'sat', 40)
      vocabSetToLearn++
      satMins += 40
    }
    const reviewSets = getVocabReview(dayNum, vocabSetToLearn - 1)
    add(ds, `Vocab: Review Sets ${reviewSets.join(', ')}`, 'sat', reviewSets.length * 5,
      reviewSets.map(n => ({ id: n.toString(), text: `Set ${n}`, done: false })))
    satMins += reviewSets.length * 5

    // Challenge RW — most days but skip heavy days
    if (challengeRWDone < 277 && satMins < 300) {
      add(ds, 'Challenge RW: 6 questions', 'sat', 36, [], 'quantity', 6)
      challengeRWDone += 6
      satMins += 36
    }

    // Challenge Math — 3x/week (Mon, Wed, Fri) — lighter since English is priority
    if (challengeMathDone < 75 && (isMon || isWed || isFri) && satMins < 300) {
      add(ds, 'OnePrep Challenge Math: 5 questions', 'sat', 35, [], 'quantity', 5)
      challengeMathDone += 5
      satMins += 35
    }

    // Practice test every 5 days on lighter days
    if (prepProsDone < 10 && dayNum - lastPracticeTestDay >= 5 && !isMathClass && satMins < 270) {
      add(ds, `PrepPros Practice Test #${prepProsDone + 1} — RW Module`, 'sat', 90)
      prepProsDone++
      lastPracticeTestDay = dayNum
      satMins += 90
    }

    // ===== NON-SAT BLOCK (2hrs) =====
    if (isThisWeek) {
      // This week: Lirae Mon-Wed, NYT Thu-Fri
      if (isMon || isTue || isWed) {
        add(ds, 'Lirae', 'personal', 120)
      } else if (isThu || isFri) {
        add(ds, 'Competition: NYT Writing Contest', 'personal', 120)
      }
      // College research first 2 weeks
      if (d <= collegeResearchEnd) {
        add(ds, 'College Research', 'college', 60)
      }
      // BM IA sprinkled early this week
      if (isTue || isWed || isThu) {
        add(ds, 'BM IA: Work session', 'ibcore', 60)
      }
    } else {
      // Normal rotation
      if (isMon) {
        add(ds, 'Lirae', 'personal', 120)
      } else if (isTue) {
        add(ds, 'Competition: NYT Writing Contest', 'personal', 120)
      } else if (isWed) {
        add(ds, 'Competition: NYT Writing Contest', 'personal', 60)
        add(ds, 'EE: Research & Writing', 'ibcore', 60)
      } else if (isThu) {
        add(ds, 'Lirae', 'personal', 120)
      } else if (isFri) {
        if (!isAfterAug1) {
          add(ds, 'Common App Essay', 'college', 120)
        } else {
          add(ds, 'Supplemental Essays', 'college', 120)
        }
      }

      // College research first 2 weeks on Fri
      if (d <= collegeResearchEnd && isFri) {
        add(ds, 'College Research', 'college', 60)
      }

      // IO light blocks Wed (2hrs/week total)
      if (isWed) {
        add(ds, 'IO: Working session', 'ibcore', 60)
      }

      // Common App activities sheet one time
      if (ds === '2026-07-22') {
        add(ds, 'Common App: Activities Google Sheet', 'college', 60)
      }
    }
  }

  return blocks
}

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
          <button onClick={onClose} className="text-gray-400 text-xl">&times;</button>
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
                  style={{ background: c.bg }} />
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">Checklist</label>
            <div className="space-y-1 mt-1 max-h-32 overflow-y-auto">
              {checklist.map(item => (
                <div key={item.id} className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 flex-1">{item.text}</span>
                  <button onClick={() => setChecklist(prev => prev.filter(i => i.id !== item.id))} className="text-red-300 text-sm">&times;</button>
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
          <button onClick={onDelete} className="text-sm text-red-400 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50">Delete</button>
        </div>
      </div>
    </div>
  )
}

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
          <button onClick={onClose} className="text-gray-400 text-xl">&times;</button>
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
                  style={{ background: c.bg }} />
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">Checklist (optional)</label>
            <div className="space-y-1 mt-1">
              {checklist.map(item => (
                <div key={item.id} className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 flex-1">{item.text}</span>
                  <button onClick={() => setChecklist(prev => prev.filter(i => i.id !== item.id))} className="text-red-300 text-sm">&times;</button>
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
        <button onClick={() => {
          if (!title.trim()) return
          onSave({ user_id: userId, date, title, category: 'other', color, duration_minutes: duration, block_type: 'time', quantity: null, checklist, is_done: false, position: 999 })
        }} className="w-full mt-4 bg-pink-500 text-white text-sm py-2 rounded-lg hover:bg-pink-600">Add Block</button>
      </div>
    </div>
  )
}

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
    if (data && data.length > 0) { setBlocks(data); setInitialized(true) }
    else setInitialized(false)
    setLoading(false)
  }

  const initializeSchedule = async () => {
    setLoading(true)
    const schedule = generateSchedule(user.id)
    const allBlocks: SummerBlock[] = []
    for (let i = 0; i < schedule.length; i += 50) {
      const { data } = await supabase.from('summer_blocks').insert(schedule.slice(i, i + 50)).select()
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
        <p className="text-gray-500 text-sm text-center">No summer plan yet!</p>
        <button onClick={initializeSchedule} className="bg-pink-500 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-pink-600">
          Generate My Summer Plan 🌸
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
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

      {view === 'month' && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setCurrentMonth(m => { const nm = m.month - 1; return nm < 0 ? { year: m.year - 1, month: 11 } : { ...m, month: nm } })} className="text-pink-400 p-1">◀</button>
            <span className="text-sm font-semibold text-pink-700">
              {new Date(currentMonth.year, currentMonth.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={() => setCurrentMonth(m => { const nm = m.month + 1; return nm > 11 ? { year: m.year + 1, month: 0 } : { ...m, month: nm } })} className="text-pink-400 p-1">▶</button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAY_NAMES.map(d => <div key={d} className="text-center text-xs text-pink-400 font-medium py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((dateStr, i) => {
              if (!dateStr) return <div key={i} />
              const dayBlocks = blocks.filter(b => b.date === dateStr)
              const undone = dayBlocks.filter(b => !b.is_done)
              const isSelected = dateStr === selectedDate
              const isToday = dateStr === new Date().toISOString().split('T')[0]
              const isSATDay = dateStr === '2026-08-22'
              return (
                <button key={dateStr} onClick={() => { setSelectedDate(dateStr); setView('day') }}
                  className={`rounded-xl p-1 min-h-[60px] text-left border border-pink-50 ${isSelected ? 'ring-2 ring-pink-400' : ''} ${isToday ? 'bg-pink-50' : isSATDay ? 'bg-yellow-50' : 'bg-white'}`}>
                  <span className={`text-xs font-medium ${isToday ? 'text-pink-600' : isSATDay ? 'text-yellow-600' : 'text-gray-500'}`}>
                    {new Date(dateStr + 'T00:00:00').getDate()}{isSATDay ? '🎯' : ''}
                  </span>
                  <div className="flex flex-col gap-0.5 mt-0.5">
                    {undone.slice(0, 3).map(b => (
                      <div key={b.id} style={{ background: b.color }} className="rounded px-1">
                        <span style={{ color: getTextColor(b.color) }} className="text-[9px] truncate block">
                          {b.title.slice(0, 8)}{b.title.length > 8 ? '…' : ''}
                        </span>
                      </div>
                    ))}
                    {undone.length > 3 && <span className="text-[9px] text-gray-400">+{undone.length - 3}</span>}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {view === 'week' && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => { const d = new Date(currentWeekStart); d.setDate(d.getDate() - 7); setCurrentWeekStart(d.toISOString().split('T')[0]) }} className="text-pink-400 p-1">◀</button>
            <span className="text-xs font-semibold text-pink-700">
              {new Date(weekDates[0] + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(weekDates[6] + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
            <button onClick={() => { const d = new Date(currentWeekStart); d.setDate(d.getDate() + 7); setCurrentWeekStart(d.toISOString().split('T')[0]) }} className="text-pink-400 p-1">▶</button>
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
                  className={`rounded-xl p-2 min-h-[100px] text-left border ${isSelected ? 'border-pink-400 ring-1 ring-pink-300' : 'border-pink-50'} ${isToday ? 'bg-pink-50' : isSATDay ? 'bg-yellow-50' : 'bg-white'}`}>
                  <div className={`text-xs font-semibold mb-1 ${isToday ? 'text-pink-600' : isSATDay ? 'text-yellow-600' : 'text-gray-500'}`}>
                    <div>{DAY_NAMES[i]}</div>
                    <div>{new Date(dateStr + 'T00:00:00').getDate()}{isSATDay ? '🎯' : ''}</div>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {undone.slice(0, 4).map(b => (
                      <div key={b.id} style={{ background: b.color }} className="rounded px-1 py-0.5">
                        <span style={{ color: getTextColor(b.color) }} className="text-[9px] leading-tight block truncate">
                          {b.title.slice(0, 12)}{b.title.length > 12 ? '…' : ''}
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

      {view === 'day' && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d.toISOString().split('T')[0]) }} className="text-pink-400 p-1">◀</button>
            <span className="text-sm font-semibold text-pink-700">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
            <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d.toISOString().split('T')[0]) }} className="text-pink-400 p-1">▶</button>
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
                const textColor = getTextColor(block.color)
                const h = Math.floor(block.duration_minutes / 60)
                const m = block.duration_minutes % 60
                const dur = h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`
                return (
                  <div key={block.id} style={{ background: block.color }}
                    className={`rounded-xl p-3 ${block.is_done ? 'opacity-50' : ''}`}>
                    <div className="flex items-start gap-2">
                      <button onClick={() => toggleBlock(block.id)}
                        className="w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center"
                        style={{ borderColor: textColor, background: block.is_done ? textColor : 'transparent' }}>
                        {block.is_done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${block.is_done ? 'line-through opacity-60' : ''}`} style={{ color: textColor }}>{block.title}</p>
                        <p className="text-xs opacity-60 mt-0.5" style={{ color: textColor }}>{dur}</p>
                        {block.checklist && block.checklist.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {block.checklist.map(item => (
                              <button key={item.id} onClick={() => toggleChecklistItem(block.id, item.id)}
                                className="flex items-center gap-2 w-full text-left">
                                <div className="w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                                  style={{ borderColor: textColor, background: item.done ? textColor : 'transparent' }}>
                                  {item.done && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                                </div>
                                <span className={`text-xs ${item.done ? 'line-through opacity-50' : ''}`} style={{ color: textColor }}>{item.text}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button onClick={() => setEditingBlock(block)} className="text-xs opacity-40 hover:opacity-70 p-1" style={{ color: textColor }}>✎</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {editingBlock && (
        <BlockEditModal block={editingBlock} onSave={u => updateBlock(editingBlock.id, u)} onClose={() => setEditingBlock(null)} onDelete={() => deleteBlock(editingBlock.id)} />
      )}
      {addingToDate && (
        <AddBlockModal date={addingToDate} userId={user.id} onSave={addBlock} onClose={() => setAddingToDate(null)} />
      )}
    </div>
  )
}
