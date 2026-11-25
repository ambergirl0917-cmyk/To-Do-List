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

const SUBJECTS = ['English', 'Counseling', 'TOK', 'Economics', 'Chinese', 'Biology', 'BM', 'Math', 'Advisory']

const START = new Date(2026, 7, 31)
const END = new Date(2027, 0, 20)

const TONES = {
  good: { bg: '#C8D8CC', fg: '#507060' },
  warn: { bg: '#F5EEE0', fg: '#907860' },
  bad: { bg: '#FDE8E8', fg: '#C07070' },
}

interface AbsenceRecord {
  id: string
  date: string
  block: number
  subject: string
  is_holiday: boolean
  holiday_label: string | null
}

function localStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const START_STR = localStr(START)
const END_STR = localStr(END)

function maxAllowed(total: number): number {
  return Math.max(0, Math.ceil(total / 3) - 1)
}

function dayNameOf(dateStr: string): string | undefined {
  const [y, m, d] = dateStr.split('-').map(Number)
  const js = new Date(y, m - 1, d).getDay()
  return DAY_NAMES[js === 0 ? 6 : js - 1]
}

const SCHOOL_DATES: string[] = (() => {
  const out: string[] = []
  for (let d = new Date(START); d <= END; d.setDate(d.getDate() + 1)) {
    const wd = d.getDay()
    if (wd !== 0 && wd !== 6) out.push(localStr(d))
  }
  return out
})()

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
    return localStr(d)
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
    const existingHoliday = records.some(r => r.date === date && r.is_holiday)
    if (existingHoliday) {
      setRecords(prev => prev.filter(r => !(r.date === date && r.is_holiday)))
      await supabase.from('absences').delete().eq('user_id', user.id).eq('date', date).eq('is_holiday', true)
      setHolidayInput(null)
      return
    }
    const dayName = dayNameOf(date)
    if (!dayName) { setHolidayInput(null); return }
    setRecords(prev => prev.filter(r => r.date !== date))
    await supabase.from('absences').delete().eq('user_id', user.id).eq('date', date)
    const inserts = BLOCKS.map(block => ({
      user_id: user.id, date, block, subject: SCHEDULE[dayName][block], is_holiday: true, holiday_label: label
    }))
    const { data } = await supabase.from('absences').insert(inserts).select()
    if (data) setRecords(prev => [...prev, ...data])
    setHolidayInput(null)
  }

  const todayStr = localStr(new Date())
  const weekDates = getWeekDates(weekStart)

  const holidayDates = new Set(records.filter(r => r.is_holiday).map(r => r.date))
  const countedDates = SCHOOL_DATES.filter(d => !holidayDates.has(d))
  const totalBlocks = countedDates.length * 4
  const maxTotal = maxAllowed(totalBlocks)

  const absences = records.filter(r => !r.is_holiday && r.date >= START_STR && r.date <= END_STR)
  const totalAbsent = absences.length
  const blocksLeft = maxTotal - totalAbsent

  const weekCounted = weekDates.filter(d => d >= START_STR && d <= END_STR && !holidayDates.has(d)).length * 4
  const weeklySafe = maxAllowed(weekCounted)
  const weeklyAbsent = absences.filter(r => weekDates.includes(r.date)).length
  const weeklyLeft = weeklySafe - weeklyAbsent

  const elapsedBlocks = countedDates.filter(d => d <= todayStr).length * 4
  const allowedSoFar = elapsedBlocks / 3
  const absentSoFar = absences.filter(r => r.date <= todayStr).length
  const balance = Math.round((allowedSoFar - absentSoFar) * 10) / 10

  const subjectTotals: Record<string, number> = {}
  SUBJECTS.forEach(s => { subjectTotals[s] = 0 })
  countedDates.forEach(date => {
    const dn = dayNameOf(date)!
    BLOCKS.forEach(b => {
      const s = SCHEDULE[dn][b]
      subjectTotals[s] = (subjectTotals[s] || 0) + 1
    })
  })

  const subjectElapsed: Record<string, number> = {}
  SUBJECTS.forEach(s => { subjectElapsed[s] = 0 })
  countedDates.filter(d => d <= todayStr).forEach(date => {
    const dn = dayNameOf(date)!
    BLOCKS.forEach(b => {
      const s = SCHEDULE[dn][b]
      subjectElapsed[s] = (subjectElapsed[s] || 0) + 1
    })
  })

  const weeklyTone = weeklyLeft >= 3 ? TONES.good : weeklyLeft >= 1 ? TONES.warn : TONES.bad
  const semPct = maxTotal > 0 ? totalAbsent / maxTotal : 1
  const semTone = blocksLeft < 0 ? TONES.bad : semPct < 0.5 ? TONES.good : semPct < 0.8 ? TONES.warn : TONES.bad
  const balanceTone = balance >= 1 ? TONES.good : balance >= 0 ? TONES.warn : TONES.bad

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

  const holidayModalExisting = holidayInput ? holidayDates.has(holidayInput.date) : false
  const holidayModalLabel = holidayInput ? records.find(r => r.date === holidayInput.date && r.is_holiday)?.holiday_label : null

  if (loading) return <div className="flex items-center justify-center h-64 text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</div>

  return (
    <div className="space-y-4">
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css" />

      {/* STAT CARDS */}
      <div className="grid grid-cols-5 gap-3">
        <div className="rounded-xl p-4" style={{ background: weeklyTone.bg }}>
          <p className="text-xs mb-1" style={{ color: weeklyTone.fg }}>Blocks left this week</p>
          <p className="text-2xl font-medium" style={{ color: weeklyTone.fg }}>{weeklyLeft} <span className="text-sm">/ {weeklySafe} safe</span></p>
        </div>
        <div className="rounded-xl p-4" style={{ background: semTone.bg }}>
          <p className="text-xs mb-1" style={{ color: semTone.fg }}>Blocks left (semester)</p>
          <p className="text-2xl font-medium" style={{ color: semTone.fg }}>{blocksLeft} <span className="text-sm">/ {maxTotal} max</span></p>
        </div>
        <div className="rounded-xl p-4" style={{ background: balanceTone.bg }}>
          <p className="text-xs mb-1" style={{ color: balanceTone.fg }}>Balance up to today</p>
          <p className="text-2xl font-medium" style={{ color: balanceTone.fg }}>{balance >= 0 ? '+' : ''}{balance.toFixed(1)}</p>
          <p className="text-xs mt-0.5" style={{ color: balanceTone.fg, opacity: 0.8 }}>{allowedSoFar.toFixed(1)} allowed, {absentSoFar} used</p>
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
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>By subject</p>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Each subject has its own limit: strictly under one third of that subject's blocks.</p>
          <div className="grid grid-cols-3 gap-2">
            {SUBJECTS.map(s => {
              const count = absences.filter(r => r.subject === s).length
              const total = subjectTotals[s] || 0
              const max = maxAllowed(total)
              const left = max - count
              const soFarAbsent = absences.filter(r => r.subject === s && r.date <= todayStr).length
              const allowedNow = (subjectElapsed[s] || 0) / 3
              const subBalance = Math.round((allowedNow - soFarAbsent) * 10) / 10
              const pct = max > 0 ? count / max : (count > 0 ? 1 : 0)
              const tone = left < 0 ? TONES.bad : pct < 0.5 ? TONES.good : pct < 0.8 ? TONES.warn : TONES.bad
              const bTone = subBalance >= 1 ? TONES.good : subBalance >= 0 ? TONES.warn : TONES.bad
              return (
                <div key={s} className="rounded-lg p-3" style={{ background: tone.bg }}>
                  <p className="text-xs font-medium mb-1" style={{ color: tone.fg }}>{s}</p>
                  <p className="text-lg font-medium" style={{ color: tone.fg }}>{count} <span className="text-xs">absent</span></p>
                  <p className="text-xs mt-0.5" style={{ color: tone.fg, opacity: 0.8 }}>{left} left of {max} max ({total} blocks)</p>
                  <div className="mt-2 rounded-md px-2 py-1" style={{ background: bTone.bg }}>
                    <p className="text-xs" style={{ color: bTone.fg }}>
                      Up to today: {subBalance >= 0 ? '+' : ''}{subBalance.toFixed(1)}
                    </p>
                    <p className="text-xs" style={{ color: bTone.fg, opacity: 0.8 }}>{allowedNow.toFixed(1)} allowed, {soFarAbsent} used</p>
                  </div>
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
          <div className="grid border-b" style={{ gridTemplateColumns: '80px repeat(5, 1fr)', borderColor: 'var(--divider)' }}>
            <div className="p-2" style={{ background: 'var(--section-header)' }} />
            {weekDates.map((date, i) => {
              const isHoliday = holidayDates.has(date)
              const isToday = date === todayStr
              return (
                <div key={date} className="p-2 border-l text-center" style={{ background: 'var(--section-header)', borderColor: 'var(--divider)' }}>
                  <p className="text-xs font-medium" style={{ color: isToday ? 'var(--morandi-pink-text)' : 'var(--text-secondary)' }}>{DAY_NAMES[i]}</p>
                  <p className="text-xs" style={{ color: isToday ? 'var(--morandi-pink-text)' : 'var(--text-muted)' }}>{fmt(date)}</p>
                  <button
                    onClick={() => setHolidayInput({ date, label: '' })}
                    className="text-xs mt-1 px-1.5 py-0.5 rounded"
                    style={{ background: isHoliday ? '#F5EEE0' : 'transparent', color: isHoliday ? '#907860' : 'var(--text-muted)', border: isHoliday ? 'none' : '0.5px solid var(--divider)' }}>
                    {isHoliday ? 'holiday' : '+ holiday'}
                  </button>
                </div>
              )
            })}
          </div>

          {BLOCKS.map(block => (
            <div key={block} className="grid border-b" style={{ gridTemplateColumns: '80px repeat(5, 1fr)', borderColor: 'var(--divider)' }}>
              <div className="p-2 border-r" style={{ background: 'var(--section-header)', borderColor: 'var(--divider)' }}>
                <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>Block {block}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{BLOCK_TIMES[block]}</p>
              </div>
              {weekDates.map((date, i) => {
                const subject = SCHEDULE[DAY_NAMES[i]][block]
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
              const inSemester = dateStr >= START_STR && dateStr <= END_STR
              const canMark = !isWeekend && inSemester
              const dayAbsences = absences.filter(r => r.date === dateStr)
              const isHoliday = holidayDates.has(dateStr)
              const holidayLabel = records.find(r => r.date === dateStr && r.is_holiday)?.holiday_label
              const isToday = dateStr === todayStr

              return (
                <div key={dateStr}
                  onClick={() => canMark && setHolidayInput({ date: dateStr, label: '' })}
                  className="border-r border-b last:border-r-0 p-1.5"
                  style={{
                    minHeight: '70px', borderColor: 'var(--divider)',
                    background: isWeekend ? 'var(--section-header)' : 'var(--card-bg)',
                    opacity: inSemester ? 1 : 0.5,
                    cursor: canMark ? 'pointer' : 'default'
                  }}>
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

      {/* HOLIDAY MODAL */}
      {holidayInput && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center p-4" onClick={() => setHolidayInput(null)}>
          <div className="rounded-2xl shadow-xl p-5 w-full max-w-xs" style={{ background: 'var(--card-bg)' }} onClick={e => e.stopPropagation()}>
            <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
              {new Date(holidayInput.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              {holidayModalExisting ? `: ${holidayModalLabel || 'holiday'}` : ''}
            </p>
            {!holidayModalExisting && (
              <input
                value={holidayInput.label}
                onChange={e => setHolidayInput(prev => prev ? { ...prev, label: e.target.value } : null)}
                placeholder="Label (e.g. National Day)"
                className="w-full text-sm px-3 py-2.5 rounded-xl outline-none mb-3"
                style={{ border: '0.5px solid var(--card-border)', color: 'var(--text-primary)' }}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && markHoliday(holidayInput.date, holidayInput.label)}
              />
            )}
            <div className="flex gap-2">
              <button onClick={() => markHoliday(holidayInput.date, holidayInput.label)}
                className="flex-1 text-sm py-2 rounded-xl"
                style={{ background: holidayModalExisting ? '#FDE8E8' : '#F5EEE0', color: holidayModalExisting ? '#C07070' : '#907860' }}>
                {holidayModalExisting ? 'Remove holiday' : 'Mark holiday'}
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
