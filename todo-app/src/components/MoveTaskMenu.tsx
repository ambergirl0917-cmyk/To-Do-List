'use client'

const SECTIONS = [
  { label: "Today's Tasks", value: 'todays' },
  { label: 'ASAP', value: 'asap' },
  { label: 'Math', value: 'ib-math' },
  { label: 'English', value: 'ib-english' },
  { label: 'Chinese', value: 'ib-chinese' },
  { label: 'Economics', value: 'ib-economics' },
  { label: 'Business Management', value: 'ib-business-management' },
  { label: 'Biology', value: 'ib-biology' },
  { label: 'TOK', value: 'core-tok' },
  { label: 'EE', value: 'core-ee' },
  { label: 'CAS', value: 'core-cas' },
  { label: 'SAT', value: 'sat' },
  { label: 'Lirae', value: 'ec-lirae' },
  { label: 'Intern', value: 'ec-intern' },
  { label: 'Competition', value: 'ec-competition' },
  { label: 'Common App', value: 'college-common-app' },
  { label: 'Essays', value: 'college-essays' },
  { label: 'Others', value: 'college-others' },
]

export default function MoveTaskMenu({ currentSection, onMove, onClose }: {
  currentSection: string
  onMove: (section: string, subsection?: string) => void
  onClose: () => void
}) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
      <div style={{
        position: 'absolute', right: 0, top: '100%', zIndex: 50,
        background: 'white', border: '1px solid #FDE8F0', borderRadius: 10,
        boxShadow: '0 8px 24px rgba(180,70,106,0.12)', minWidth: 180, padding: 4
      }}>
        <div style={{ fontSize: 10, color: '#999', padding: '4px 10px 2px', fontWeight: 600 }}>MOVE TO</div>
        {SECTIONS.filter(s => s.value !== currentSection).map(s => (
          <div
            key={s.value}
            onClick={() => onMove(s.value)}
            style={{ padding: '6px 10px', fontSize: 12, color: '#333', cursor: 'pointer', borderRadius: 6 }}
            onMouseOver={e => (e.currentTarget.style.background = '#FFF5F8')}
            onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
          >
            {s.label}
          </div>
        ))}
      </div>
    </>
  )
}
