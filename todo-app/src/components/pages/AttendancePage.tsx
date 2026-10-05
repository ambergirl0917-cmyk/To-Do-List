'use client'
import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface Props { user: User }

const SCHEDULE: Record<string, Record<number, string>> = {
  Mon: { 1: 'English', 2: 'Counseling', 3: 'Economics', 4: 'Chinese' },
  Tue: { 1: 'Economics', 2: 'TOK', 3: 'BM', 4: 'Biology' },
  Wed: { 1: 'Math', 2: 'Economics', 3: 'Chinese', 4: 'Advisory' },
  Thu: { 1: 'BM', 2: 'Math', 3: 'English', 4: 'Chinese' },
  Fri: { 1: 'Biology', 2: 'BM', 3: 'Math', 4: 'English' },
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const BLOCKS = [1, 2, 3, 4]
const BLOCK_TIMES: Record<number, string> = {
  1: '08:15–09:35', 2: '09:55–11:15', 3: '12:05–13:25', 4: '13:45–15:05'
}

const SEMESTER_START = new Date('2026-08-31')
const SEMESTER_END = new Date('2027-06-30')
const TOTAL_WEEKS = Math.ceil((SEMESTER_END.getTime() - SEMESTER_START.getTime()) / (7 * 24 * 60 * 60 * 1000))
const MAX_TOTAL = Math.floor(TOTAL_WEEKS * 20 / 3)

const SUBJECTS = ['English', 'Counseling', 'TOK', 'Economics', 'Chinese', 'Biology', 'BM', 'Math', 'Advisory']

interface AbsenceRecord {
  id: string
  date: string
  block: number
  subject: string
  is_holiday: boolean
  holiday_label: string | null
}

function getWeekStart(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

function getWeekDates(weekStart: Date): string[] {
  return DAY_NAMES.map((_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    const y = d.getFullYear()
    const mo = String(d.getMonth() + 1).padStart(2, '0')
    const dy = String(d.getDate()).padStart(2, '0')
    return `${y}-${mo}-${dy}`
  })
}

function fmt(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export default function AttendancePage({ user }: Props) {
  const [view, setView] = useState<'week' | 'month'>('week')
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const [currentMonth, setCurrentMonth] = useState(() => ({ year: new Date().getFullYear(), month: new Date().getMonth() }))
  const [records, setRecords] = useState<AbsenceRecord[]>([])
  const [showSubjects, setShowSubjects] = useState(false)
  const [holidayInput, setHolidayInput] = useState<{ date: string; label: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchRecords() }, [user])

  const fetchRecords = async () => {
    const { data } = await supabase.from('absences').select('*').eq('user_id', user.id)
    if (data) setRecords(data)
    setLoading(false)
  }

  const toggleAbsent = async (date: string, block: number, subject: string) => {
    const existing = records.find(r => r.date === date && r.block === block)
    if (existing?.is_holiday) return
    if (existing) {
      setRecords(prev => prev.filter(r => !(r.date === date && r.block === block)))
      await supabase.from('absences').delete().eq('id', existing.id)
    } else {
      const { data } = await supabase.from('absences').insert({
        user_id: user.id, date, block, subject, is_holiday: false, holiday_label: null
      }).select().single()
      if (data) setRecords(prev => [...prev, data])
    }
  }

  const markHoliday = async (date: string, label: string) => {
    const existingHoliday = records.find(r => r.date === date && r.is_holiday)
    if (existingHoliday) {
      setRecords(prev => prev.filter(r => r.date !== date || !r.is_holiday))
      await supabase.from('absences').delete().eq('user_id', user.id).eq('date', date).eq('is_holiday', true)
      setHolidayInput(null)
      return
    }
    const jsDay = new Date(date + 'T00:00:00').getDay()
const dayName = DAY_NAMES[jsDay === 0 ? 6 : jsDay - 1]
    if (!dayName) return
    const inserts = BLOCKS.map(block => ({
      user_id: user.id, date, block, subject: SCHEDULE[dayName][block], is_holiday: true, holiday_label: label
    }))
    const { data } = await supabase.from('absences').insert(inserts).select()
    if (data) setRecords(prev => [...prev, ...data])
    setHolidayInput(null)
  }

  const weekDates = getWeekDates(weekStart)

  const absences = records.filter(r => !r.is_holiday)
  const totalAbsent = absences.length
  const blocksLeft = MAX_TOTAL - totalAbsent

  const now = new Date()
  const currentWeekStart = getWeekStart(now)
  const currentWeekDates = getWeekDates(currentWeekStart)
  const weeklyAbsent = absences.filter(r => currentWeekDates.includes(r.date)).length
  const weeklyLeft = 6 - weeklyAbsent

  const subjectCounts: Record<string, number> = {}
  SUBJECTS.forEach(s => { subjectCounts[s] = absences.filter(r => r.subject === s).length })

  const getSubjectTotal = (subject: string) => {
    return records.filter(r => r.subject === subject && !r.is_holiday).length
  }
  const getSubjectMax = (subject: string) => {
    const total = records.filter(r => r.subject === subject).length + TOTAL_WEEKS
    return Math.floor(total / 3)
  }

  const getMonthDates = () => {
    const { year, month } = currentMonth
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const blanks = firstDay === 0 ? 6 : firstDay - 1
    const dates: (string | null)[] = Array(blanks).fill(null)
    for (let d = 1; d <= daysInMonth; d++) {
      dates.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
    }
    return dates
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</div>

  return (
    <div className="space-y-4">
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css" />

      {/* STAT CARDS */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-xl p-4" style={{ background: weeklyLeft >= 3 ? '#C8D8CC' : weeklyLeft >= 1 ? '#F5EEE0' : '#FDE8E8' }}>
          <p className="text-xs mb-1" style={{ color: weeklyLeft >= 3 ? '#507060' : weeklyLeft >= 1 ? '#907860' : '#C07070' }}>Blocks left this week</p>
          <p className="text-2xl font-medium" style={{ color: weeklyLeft >= 3 ? '#507060' : weeklyLeft >= 1 ? '#907860' : '#C07070' }}>{weeklyLeft} <span className="text-sm">/ 6 safe</span></p>
        </div>
        <div className="rounded-xl p-4" style={{ background: blocksLeft > 20 ? '#C8D8CC' : blocksLeft > 5 ? '#F5EEE0' : '#FDE8E8' }}>
          <p className="text-xs mb-1" style={{ color: blocksLeft > 20 ? '#507060' : blocksLeft > 5 ? '#907860' : '#C07070' }}>Blocks left (semester)</p>
          <p className="text-2xl font-medium" style={{ color: blocksLeft > 20 ? '#507060' : blocksLeft > 5 ? '#907860' : '#C07070' }}>{blocksLeft} <span className="text-sm">/ {MAX_TOTAL} max</span></p>
        </div>
        <div className="rounded-xl p-4" style={{ background: '#FAE4EC' }}>
          <p className="text-xs mb-1" style={{ color: '#9A7080' }}>Total absent</p>
          <p className="text-2xl font-medium" style={{ color: '#9A7080' }}>{totalAbsent} <span className="text-sm">blocks</span></p>
        </div>
        <div className="rounded-xl p-4 cursor-pointer" style={{ background: showSubjects ? '#DDD0E0' : '#EDE8DC' }} onClick={() => setShowSubjects(s => !s)}>
          <p className="text-xs mb-1" style={{ color: '#706080' }}>By subject</p>
          <p className="text-sm font-medium mt-2" style={{ color: '#706080' }}>{showSubjects ? 'Hide ▲' : 'Show ▼'}</p>
        </div>
      </div>

      {/* SUBJECT BREAKDOWN */}
      {showSubjects && (
        <div className="rounded-xl border p-4" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
          <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Absences by subject</p>
          <div className="grid grid-cols-3 gap-2">
            {SUBJECTS.map(s => {
              const count = getSubjectTotal(s)
              const max = Math.floor(TOTAL_WEEKS * (Object.values(SCHEDULE).filter(day => Object.values(day).includes(s)).length) / 3 / 5 * 5)
              const pct = max > 0 ? count / max : 0
              const color = pct < 0.5 ? '#507060' : pct < 0.8 ? '#907860' : '#C07070'
              const bg = pct < 0.5 ? '#C8D8CC' : pct < 0.8 ? '#F5EEE0' : '#FDE8E8'
              return (
                <div key={s} className="rounded-lg p-3" style={{ background: bg }}>
                  <p className="text-xs font-medium" style={{ color }}>{s}</p>
                  <p className="text-lg font-medium" style={{ color }}>{count} absent</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* VIEW TOGGLE + NAV */}
      <div className="flex items-center justify-between">
        <div className="flex rounded-lg p-0.5 gap-0.5" style={{ background: 'var(--morandi-pink)' }}>
          {(['week', 'month'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className="text-xs px-3 py-1 rounded-md capitalize transition-colors"
              style={{ background: view === v ? 'white' : 'transparent', color: 'var(--morandi-pink-text)', fontWeight: view === v ? '500' : '400' }}>
              {v}
            </button>
          ))}
        </div>

        {view === 'week' ? (
          <div className="flex items-center gap-3">
            <button onClick={() => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })}
              className="text-xs px-2 py-1 rounded-lg" style={{ background: 'var(--morandi-pink)', color: 'var(--morandi-pink-text)' }}>◀</button>
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {fmt(weekDates[0])} – {fmt(weekDates[4])}
            </span>
            <button onClick={() => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })}
              className="text-xs px-2 py-1 rounded-lg" style={{ background: 'var(--morandi-pink)', color: 'var(--morandi-pink-text)' }}>▶</button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button onClick={() => setCurrentMonth(m => { const nm = m.month - 1; return nm < 0 ? { year: m.year - 1, month: 11 } : { ...m, month: nm } })}
              className="text-xs px-2 py-1 rounded-lg" style={{ background: 'var(--morandi-pink)', color: 'var(--morandi-pink-text)' }}>◀</button>
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {new Date(currentMonth.year, currentMonth.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={() => setCurrentMonth(m => { const nm = m.month + 1; return nm > 11 ? { year: m.year + 1, month: 0 } : { ...m, month: nm } })}
              className="text-xs px-2 py-1 rounded-lg" style={{ background: 'var(--morandi-pink)', color: 'var(--morandi-pink-text)' }}>▶</button>
          </div>
        )}
      </div>

      {/* WEEK VIEW */}
      {view === 'week' && (
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
          {/* Header */}
          <div className="grid border-b" style={{ gridTemplateColumns: '80px repeat(5, 1fr)', borderColor: 'var(--divider)' }}>
            <div className="p-2" style={{ background: 'var(--section-header)' }} />
            {weekDates.map((date, i) => {
              const isHoliday = records.some(r => r.date === date && r.is_holiday)
              const todayStr = new Date().toISOString().split('T')[0]
              const isToday = date === todayStr
              return (
                <div key={date} className="p-2 border-l text-center" style={{ background: 'var(--section-header)', borderColor: 'var(--divider)' }}>
                  <p className="text-xs font-medium" style={{ color: isToday ? 'var(--morandi-pink-text)' : 'var(--text-secondary)' }}>{DAY_NAMES[i]}</p>
                  <p className="text-xs" style={{ color: isToday ? 'var(--morandi-pink-text)' : 'var(--text-muted)' }}>{fmt(date)}</p>
                  <button
                    onClick={() => isHoliday ? markHoliday(date, '') : setHolidayInput({ date, label: '' })}
                    className="text-xs mt-1 px-1.5 py-0.5 rounded"
                    style={{ background: isHoliday ? '#F5EEE0' : 'transparent', color: isHoliday ? '#907860' : 'var(--text-muted)', border: isHoliday ? 'none' : '0.5px solid var(--divider)' }}>
                    {isHoliday ? 'holiday' : '+ holiday'}
                  </button>
                </div>
              )
            })}
          </div>

          {/* Blocks */}
          {BLOCKS.map(block => (
            <div key={block} className="grid border-b" style={{ gridTemplateColumns: '80px repeat(5, 1fr)', borderColor: 'var(--divider)' }}>
              <div className="p-2 border-r" style={{ background: 'var(--section-header)', borderColor: 'var(--divider)' }}>
                <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>Block {block}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{BLOCK_TIMES[block]}</p>
              </div>
              {weekDates.map((date, i) => {
                const dayName = DAY_NAMES[i]
                const subject = SCHEDULE[dayName][block]
                const record = records.find(r => r.date === date && r.block === block)
                const isAbsent = record && !record.is_holiday
                const isHoliday = record?.is_holiday

                return (
                  <div key={date} className="p-1.5 border-l" style={{ borderColor: 'var(--divider)' }}>
                    <button
                      onClick={() => !isHoliday && toggleAbsent(date, block, subject)}
                      className="w-full rounded-lg p-2 text-center transition-colors"
                      style={{
                        background: isHoliday ? '#F5EEE0' : isAbsent ? '#FDE8E8' : 'var(--morandi-pink)',
                        cursor: isHoliday ? 'default' : 'pointer'
                      }}>
                      <p className="text-xs font-medium" style={{ color: isHoliday ? '#907860' : isAbsent ? '#C07070' : 'var(--morandi-pink-text)' }}>
                        {subject}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: isHoliday ? '#B09878' : isAbsent ? '#E08888' : 'var(--morandi-pink-text)', opacity: 0.8 }}>
                        {isHoliday ? (record?.holiday_label || 'holiday') : isAbsent ? 'absent' : 'present'}
                      </p>
                    </button>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {/* MONTH VIEW */}
      {view === 'month' && (
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
          <div className="grid grid-cols-7 border-b" style={{ borderColor: 'var(--divider)' }}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
              <div key={d} className="p-2 text-center border-r last:border-r-0" style={{ background: 'var(--section-header)', borderColor: 'var(--divider)' }}>
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{d}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {getMonthDates().map((dateStr, i) => {
              if (!dateStr) return <div key={i} className="border-r border-b" style={{ minHeight: '70px', borderColor: 'var(--divider)' }} />
              const dayOfWeek = new Date(dateStr + 'T00:00:00').getDay()
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
              const dayAbsences = absences.filter(r => r.date === dateStr)
              const isHoliday = records.some(r => r.date === dateStr && r.is_holiday)
              const holidayLabel = records.find(r => r.date === dateStr && r.is_holiday)?.holiday_label
              const todayStr = new Date().toISOString().split('T')[0]
              const isToday = dateStr === todayStr

              return (
                <div key={dateStr} className="border-r border-b last:border-r-0 p-1.5" style={{ minHeight: '70px', borderColor: 'var(--divider)', background: isWeekend ? 'var(--section-header)' : 'var(--card-bg)' }}>
                  <p className="text-xs font-medium mb-1" style={{ color: isToday ? 'var(--morandi-pink-text)' : 'var(--text-secondary)' }}>
                    {new Date(dateStr + 'T00:00:00').getDate()}
                  </p>
                  {isHoliday && (
                    <div className="rounded px-1 py-0.5 mb-0.5" style={{ background: '#F5EEE0' }}>
                      <p className="text-xs" style={{ color: '#907860' }}>{holidayLabel || 'holiday'}</p>
                    </div>
                  )}
                  {!isWeekend && !isHoliday && dayAbsences.length > 0 && (
                    <div className="rounded px-1 py-0.5" style={{ background: '#FDE8E8' }}>
                      <p className="text-xs" style={{ color: '#C07070' }}>{dayAbsences.length} absent</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* HOLIDAY INPUT MODAL */}
      {holidayInput && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center p-4" onClick={() => setHolidayInput(null)}>
          <div className="rounded-2xl shadow-xl p-5 w-full max-w-xs" style={{ background: 'var(--card-bg)' }} onClick={e => e.stopPropagation()}>
            <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
              Mark {new Date(holidayInput.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} as holiday
            </p>
            <input
              value={holidayInput.label}
              onChange={e => setHolidayInput(prev => prev ? { ...prev, label: e.target.value } : null)}
              placeholder="Label (e.g. National Day)"
              className="w-full text-sm px-3 py-2.5 rounded-xl outline-none mb-3"
              style={{ border: '0.5px solid var(--card-border)', color: 'var(--text-primary)' }}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && markHoliday(holidayInput.date, holidayInput.label)}
            />
            <div className="flex gap-2">
              <button onClick={() => markHoliday(holidayInput.date, holidayInput.label)}
                className="flex-1 text-sm py-2 rounded-xl"
                style={{ background: '#F5EEE0', color: '#907860' }}>
                Mark holiday
              </button>
              <button onClick={() => setHolidayInput(null)}
                className="text-sm px-4 py-2 rounded-xl"
                style={{ background: 'var(--morandi-linen)', color: 'var(--text-muted)' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEGEND */}
      <div className="flex gap-4">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ background: '#FDE8E8' }} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Absent (click to toggle)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ background: '#F5EEE0' }} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Holiday</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ background: '#FAE4EC' }} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Present</span>
        </div>
      </div>
    </div>
  )
}
