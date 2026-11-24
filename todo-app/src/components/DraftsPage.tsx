'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useEditor, EditorContent } from '@tiptap/react'
import type { Editor, JSONContent } from '@tiptap/react'
import { Mark, mergeAttributes } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import Placeholder from '@tiptap/extension-placeholder'
import ImageExt from '@tiptap/extension-image'

interface Props { user: User }

interface RefTab {
  id: string
  name: string
  notes: string
  url: string
  mode: 'notes' | 'web'
}

interface Source {
  id: string
  author: string | null
  title: string | null
  container: string | null
  publisher: string | null
  year: string | null
  pages: string | null
  url: string | null
}

interface Draft {
  id: string
  title: string
  content: JSONContent | null
  word_limit: number | null
  count_mode: 'body' | 'all'
  folder_id: string | null
  ref_tabs: RefTab[] | null
  updated_at: string
}

interface Folder { id: string; name: string; color: string | null }

interface DraftComment {
  id: string
  draft_id: string
  body: string
  resolved: boolean
  created_at: string
}

const FOLDER_COLORS: Record<string, { bg: string; fg: string }> = {
  pink: { bg: '#FAE4EC', fg: '#9A7080' },
  sand: { bg: '#F5EEE0', fg: '#907860' },
  blue: { bg: '#D8E8F8', fg: '#5A7898' },
  sage: { bg: '#C8D8CC', fg: '#507060' },
  mauve: { bg: '#DDD0E0', fg: '#706080' },
  peach: { bg: '#F6DFD2', fg: '#A07860' },
  gray: { bg: '#E8E4DE', fg: '#7A7468' },
}

function colorOf(key: string | null | undefined) {
  return FOLDER_COLORS[key || 'pink'] || FOLDER_COLORS.pink
}

const CommentMark = Mark.create({
  name: 'comment',
  inclusive: false,
  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-comment-id'),
        renderHTML: (attrs: Record<string, any>) => (attrs.commentId ? { 'data-comment-id': attrs.commentId } : {}),
      },
    }
  },
  parseHTML() { return [{ tag: 'span[data-comment-id]' }] },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'draft-comment' }), 0]
  },
})

const CitationMark = Mark.create({
  name: 'citation',
  inclusive: false,
  addAttributes() {
    return {
      sourceId: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-source-id'),
        renderHTML: (attrs: Record<string, any>) => (attrs.sourceId ? { 'data-source-id': attrs.sourceId } : {}),
      },
    }
  },
  parseHTML() { return [{ tag: 'span[data-source-id]' }] },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'draft-cite' }), 0]
  },
})

/* ---------- text helpers ---------- */

function plain(node: JSONContent, skipCites: boolean): string {
  if (node.type === 'text') {
    if (skipCites && node.marks && node.marks.some(m => m.type === 'citation')) return ''
    return node.text || ''
  }
  if (node.type === 'hardBreak') return ' '
  const sep = node.type === 'paragraph' || node.type === 'heading' ? '' : ' '
  return (node.content || []).map(c => plain(c, skipCites)).join(sep)
}

const WORKS_CITED_RE = /^works?\s+cited$/i

function countWords(doc: JSONContent | null, mode: 'body' | 'all'): number {
  if (!doc || !doc.content) return 0
  const parts: string[] = []
  for (const n of doc.content) {
    if (mode === 'body') {
      if (n.type === 'heading') {
        if (WORKS_CITED_RE.test(plain(n, false).trim())) break
        continue
      }
      parts.push(plain(n, true))
    } else {
      parts.push(plain(n, false))
    }
  }
  const matches = parts.join(' ').match(/[\u4e00-\u9fff]|[^\s\u4e00-\u9fff]+/g)
  return matches ? matches.length : 0
}

function getOutline(doc: JSONContent | null) {
  if (!doc || !doc.content) return []
  return doc.content
    .filter(n => n.type === 'heading')
    .map((n, i) => ({ i, level: (n.attrs?.level as number) || 1, text: plain(n, false) || 'Untitled heading' }))
}

function collectSourceIds(doc: JSONContent | null): string[] {
  const ids: string[] = []
  const walk = (n: JSONContent) => {
    if (n.marks) {
      n.marks.forEach(m => {
        const id = m.attrs?.sourceId as string | undefined
        if (m.type === 'citation' && id && !ids.includes(id)) ids.push(id)
      })
    }
    if (n.content) n.content.forEach(walk)
  }
  if (doc) walk(doc)
  return ids
}

/* ---------- MLA helpers ---------- */

type Seg = { text: string; italic?: boolean }

function authorList(author: string | null): string[] {
  return (author || '').split(';').map(s => s.trim()).filter(Boolean)
}

function lastName(name: string): string {
  return name.split(',')[0].trim()
}

function firstLast(name: string): string {
  const i = name.indexOf(',')
  if (i < 0) return name
  return `${name.slice(i + 1).trim()} ${name.slice(0, i).trim()}`.trim()
}

function authorsForEntry(authors: string[]): string {
  if (authors.length === 0) return ''
  if (authors.length === 1) return authors[0]
  if (authors.length === 2) return `${authors[0]}, and ${firstLast(authors[1])}`
  return `${authors[0]}, et al.`
}

function buildEntry(s: Source): Seg[] {
  const segs: Seg[] = []
  const a = authorsForEntry(authorList(s.author))
  if (a) segs.push({ text: a.endsWith('.') ? `${a} ` : `${a}. ` })
  const title = (s.title || '').trim()
  const hasContainer = !!(s.container && s.container.trim())
  if (title) {
    if (hasContainer) segs.push({ text: `"${title}." ` })
    else segs.push({ text: title, italic: true }, { text: '. ' })
  }
  const rest: Seg[][] = []
  if (hasContainer) rest.push([{ text: (s.container || '').trim(), italic: true }])
  if (s.publisher && s.publisher.trim()) rest.push([{ text: s.publisher.trim() }])
  if (s.year && s.year.trim()) rest.push([{ text: s.year.trim() }])
  if (s.pages && s.pages.trim()) {
    const p = s.pages.trim()
    rest.push([{ text: `${/[-–,]/.test(p) ? 'pp.' : 'p.'} ${p}` }])
  }
  if (s.url && s.url.trim()) rest.push([{ text: s.url.trim().replace(/^https?:\/\//i, '') }])
  rest.forEach((piece, i) => {
    if (i > 0) segs.push({ text: ', ' })
    segs.push(...piece)
  })
  if (rest.length > 0) {
    segs.push({ text: '.' })
  } else if (segs.length > 0) {
    const last = segs[segs.length - 1]
    last.text = last.text.trimEnd()
  }
  return segs
}

function inTextSegs(s: Source, page: string): Seg[] {
  const authors = authorList(s.author)
  const p = page.trim()
  let lead: Seg[]
  if (authors.length === 1) lead = [{ text: lastName(authors[0]) }]
  else if (authors.length === 2) lead = [{ text: `${lastName(authors[0])} and ${lastName(authors[1])}` }]
  else if (authors.length >= 3) lead = [{ text: `${lastName(authors[0])} et al.` }]
  else {
    const words = (s.title || 'Source').trim().split(/\s+/).slice(0, 4).join(' ')
    lead = s.container && s.container.trim() ? [{ text: `"${words}"` }] : [{ text: words, italic: true }]
  }
  const out: Seg[] = [{ text: '(' }, ...lead]
  if (p) out.push({ text: ` ${p}` })
  out.push({ text: ')' })
  return out
}

function segsToNodes(segs: Seg[], sourceId?: string): JSONContent[] {
  return segs.filter(s => s.text.length > 0).map(s => {
    const marks: { type: string; attrs?: Record<string, any> }[] = []
    if (s.italic) marks.push({ type: 'italic' })
    if (sourceId) marks.push({ type: 'citation', attrs: { sourceId } })
    const node: JSONContent = { type: 'text', text: s.text }
    if (marks.length > 0) node.marks = marks
    return node
  })
}

function esc(t: string): string {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function normalizeUrl(raw: string): string | null {
  let u = raw.trim()
  if (!u) return null
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u
  try {
    const parsed = new URL(u)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : null
  } catch {
    return null
  }
}

const EDITOR_CSS = `
.draft-editor .ProseMirror { outline: none; min-height: 55vh; font-size: 15px; line-height: 1.75; color: var(--text-primary); }
.draft-editor .ProseMirror p { margin: 0 0 0.9em 0; }
.draft-editor .ProseMirror h1 { font-size: 1.5em; font-weight: 600; margin: 1.2em 0 0.5em; }
.draft-editor .ProseMirror h2 { font-size: 1.25em; font-weight: 600; margin: 1.1em 0 0.5em; }
.draft-editor .ProseMirror h3 { font-size: 1.1em; font-weight: 600; margin: 1em 0 0.4em; }
.draft-editor .ProseMirror ul { list-style: disc; padding-left: 1.4em; margin: 0 0 0.9em 0; }
.draft-editor .ProseMirror ol { list-style: decimal; padding-left: 1.4em; margin: 0 0 0.9em 0; }
.draft-editor .ProseMirror blockquote { border-left: 3px solid #EEC4CC; padding-left: 1em; color: var(--text-secondary); margin: 0 0 0.9em 0; }
.draft-editor .ProseMirror mark { background: #F7D9E1; border-radius: 3px; padding: 0 2px; }
.draft-editor .ProseMirror .draft-comment { background: #FBEBC8; border-bottom: 2px solid #E8C98A; cursor: pointer; }
.draft-editor .ProseMirror img { max-width: 100%; height: auto; border-radius: 8px; margin: 0.4em 0; display: block; }
.draft-editor .ProseMirror img.ProseMirror-selectednode { outline: 2px solid #EEC4CC; }
.draft-editor .ProseMirror p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: var(--text-muted); float: left; height: 0; pointer-events: none; }
`

/* ---------- web view inside the research panel ---------- */

function WebView({ url, onUrlChange }: { url: string; onUrlChange: (u: string) => void }) {
  const [input, setInput] = useState(url)

  const go = () => {
    const n = normalizeUrl(input)
    if (!n) { alert('Please paste a full web link, like https://example.com'); return }
    setInput(n)
    onUrlChange(n)
  }

  const openWindow = () => {
    const n = normalizeUrl(input)
    if (!n) { alert('Please paste a full web link first.'); return }
    window.open(n, 'research_window', 'width=520,height=760')
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-2">
      <div className="flex gap-1.5">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && go()}
          placeholder="Paste a web link here"
          className="flex-1 min-w-0 text-xs px-2.5 py-1.5 rounded-lg outline-none"
          style={{ border: '0.5px solid var(--card-border)', color: 'var(--text-primary)' }}
        />
        <button onClick={go} className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'var(--btn-bg)', color: 'var(--btn-text)' }}>Go</button>
        <button onClick={openWindow} className="text-xs px-2.5 py-1.5 rounded-lg" style={{ background: '#F5EEE0', color: '#907860' }}>Open in window</button>
      </div>
      {url ? (
        <iframe
          key={url}
          src={url}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          referrerPolicy="no-referrer"
          className="flex-1 w-full rounded-lg"
          style={{ border: '0.5px solid var(--card-border)', minHeight: 0, background: 'white' }}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-xs text-center px-4" style={{ color: 'var(--text-muted)' }}>
          Paste a link above and press Go.
        </div>
      )}
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        If the page stays blank, that site does not allow being shown here. Click "Open in window" instead.
      </p>
    </div>
  )
}

/* ---------- floating research panel (tabs, sources, citations) ---------- */

const EMPTY_FORM = { author: '', title: '', container: '', publisher: '', year: '', pages: '', url: '' }

function ResearchPanel({ open, onClose, tab, onTabChange, tabs, onTabsChange, sources, onSourcesChange, user, editor, docJson }: {
  open: boolean
  onClose: () => void
  tab: string
  onTabChange: (t: string) => void
  tabs: RefTab[]
  onTabsChange: (t: RefTab[]) => void
  sources: Source[]
  onSourcesChange: (s: Source[]) => void
  user: User
  editor: Editor | null
  docJson: JSONContent | null
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 40, y: 100 })
  const [minimized, setMinimized] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const drag = useRef<{ dx: number; dy: number } | null>(null)
  const minSaved = useRef<string>('')
  const expSaved = useRef<{ w: string; h: string } | null>(null)

  const [page, setPage] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    const el = panelRef.current
    if (!el) return
    const w = Math.min(420, window.innerWidth - 24)
    el.style.width = `${w}px`
    el.style.height = `${Math.max(240, Math.min(540, window.innerHeight - 140))}px`
    setPos({ x: Math.max(12, window.innerWidth - w - 24), y: 100 })
  }, [])

  const onHeaderDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return
    const el = panelRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    drag.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onHeaderMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    const x = Math.min(Math.max(0, e.clientX - drag.current.dx), window.innerWidth - 120)
    const y = Math.min(Math.max(0, e.clientY - drag.current.dy), window.innerHeight - 40)
    setPos({ x, y })
  }

  const onHeaderUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    drag.current = null
    try { e.currentTarget.releasePointerCapture(e.pointerId) } catch { /* ignore */ }
  }

  const toggleMinimize = () => {
    const el = panelRef.current
    if (!el) return
    if (!minimized) {
      minSaved.current = el.style.height
      el.style.height = 'auto'
    } else {
      el.style.height = minSaved.current || '520px'
    }
    setMinimized(m => !m)
  }

  const toggleExpand = () => {
    const el = panelRef.current
    if (!el || minimized) return
    if (!expanded) {
      expSaved.current = { w: el.style.width, h: el.style.height }
      const w = Math.min(780, window.innerWidth - 24)
      el.style.width = `${w}px`
      el.style.height = `${Math.min(700, window.innerHeight - 100)}px`
      setPos(p => ({ x: Math.max(12, Math.min(p.x, window.innerWidth - w - 12)), y: 60 }))
    } else if (expSaved.current) {
      el.style.width = expSaved.current.w
      el.style.height = expSaved.current.h
    }
    setExpanded(x => !x)
  }

  /* tabs */
  const activeTabObj = tabs.find(t => t.id === tab) || null
  const isSources = tab === 'sources' || !activeTabObj

  const patchTab = (id: string, patch: Partial<RefTab>) => {
    onTabsChange(tabs.map(t => t.id === id ? { ...t, ...patch } : t))
  }

  const addTab = () => {
    if (tabs.length >= 12) { alert('You can have up to 12 tabs.'); return }
    const t: RefTab = { id: crypto.randomUUID(), name: `Source ${tabs.length + 1}`, notes: '', url: '', mode: 'notes' }
    onTabsChange([...tabs, t])
    onTabChange(t.id)
  }

  const renameTab = (t: RefTab) => {
    const name = window.prompt('Tab name', t.name)
    if (!name || !name.trim()) return
    patchTab(t.id, { name: name.trim().slice(0, 40) })
  }

  const deleteTab = (t: RefTab) => {
    if (!confirm(`Delete the tab "${t.name}" and everything pasted in it?`)) return
    onTabsChange(tabs.filter(x => x.id !== t.id))
    onTabChange('sources')
  }

  /* sources and citations */
  const used = useMemo(() => {
    const ids = collectSourceIds(docJson)
    const key = (segs: Seg[]) => segs.map(s => s.text).join('').replace(/^"/, '').toLowerCase()
    return ids
      .map(id => sources.find(s => s.id === id))
      .filter((s): s is Source => !!s)
      .map(s => ({ source: s, segs: buildEntry(s) }))
      .sort((a, b) => key(a.segs).localeCompare(key(b.segs)))
  }, [docJson, sources])

  const usedIds = useMemo(() => new Set(used.map(u => u.source.id)), [used])

  const insertCitation = (s: Source) => {
    if (!editor) return
    editor.chain().focus().insertContent(segsToNodes(inTextSegs(s, page), s.id)).run()
    setPage('')
  }

  const startAdd = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  const startEdit = (s: Source) => {
    setEditingId(s.id)
    setForm({
      author: s.author || '', title: s.title || '', container: s.container || '',
      publisher: s.publisher || '', year: s.year || '', pages: s.pages || '', url: s.url || '',
    })
    setShowForm(true)
  }

  const saveSource = async () => {
    if (!form.title.trim() && !form.author.trim()) { alert('Please add at least an author or a title.'); return }
    const row = {
      author: form.author.trim() || null,
      title: form.title.trim() || null,
      container: form.container.trim() || null,
      publisher: form.publisher.trim() || null,
      year: form.year.trim() || null,
      pages: form.pages.trim() || null,
      url: form.url.trim() || null,
    }
    if (editingId) {
      const { error } = await supabase.from('draft_sources').update(row).eq('id', editingId)
      if (error) { alert('Could not save the source. Please try again.'); return }
      onSourcesChange(sources.map(s => s.id === editingId ? { ...s, ...row } : s))
    } else {
      const { data, error } = await supabase.from('draft_sources').insert({ ...row, user_id: user.id }).select().single()
      if (error || !data) { alert('Could not save the source. Please try again.'); return }
      onSourcesChange([...sources, data as Source])
    }
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  const deleteSource = async (s: Source) => {
    if (!confirm('Delete this source? Citations already in your drafts stay as text, but they will no longer appear in Works Cited.')) return
    await supabase.from('draft_sources').delete().eq('id', s.id)
    onSourcesChange(sources.filter(x => x.id !== s.id))
  }

  const insertWorksCited = () => {
    if (!editor) return
    if (used.length === 0) { alert('No citations in this draft yet. Click a source to insert one first.'); return }
    const doc = editor.getJSON()
    const content = doc.content || []
    const idx = content.findIndex(n => n.type === 'heading' && WORKS_CITED_RE.test(plain(n, false).trim()))
    if (idx >= 0 && !confirm('This replaces the existing "Works Cited" section (everything from that heading to the end of the draft). Continue?')) return
    const block: JSONContent[] = [
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Works Cited' }] },
      ...used.map(u => ({ type: 'paragraph', content: segsToNodes(u.segs) } as JSONContent)),
    ]
    const next: JSONContent = { ...doc, content: [...(idx >= 0 ? content.slice(0, idx) : content), ...block] }
    editor.commands.setContent(next, true)
  }

  const copyWorksCited = async () => {
    if (used.length === 0) { alert('No citations in this draft yet.'); return }
    const text = used.map(u => u.segs.map(s => s.text).join('')).join('\n')
    const html = used.map(u => `<p>${u.segs.map(s => s.italic ? `<i>${esc(s.text)}</i>` : esc(s.text)).join('')}</p>`).join('')
    try {
      await navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' }),
      })])
    } catch {
      try { await navigator.clipboard.writeText(text) } catch { alert('Could not copy. Please select the text and copy it yourself.') }
    }
  }

  const iconBtn = (label: string, onClick: () => void, title: string) => (
    <button onClick={onClick} title={title} className="w-7 h-7 rounded-lg text-sm flex items-center justify-center"
      style={{ color: 'var(--morandi-pink-text)', background: 'rgba(255,255,255,0.6)' }}>{label}</button>
  )

  const field = (label: string, key: keyof typeof EMPTY_FORM, placeholder: string) => (
    <div>
      <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <input
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full text-xs px-2.5 py-1.5 rounded-lg outline-none"
        style={{ border: '0.5px solid var(--card-border)', color: 'var(--text-primary)', background: 'white' }}
      />
    </div>
  )

  return (
    <div
      ref={panelRef}
      style={{
        display: open ? 'flex' : 'none',
        flexDirection: 'column',
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex: 40,
        resize: minimized ? 'none' : 'both',
        overflow: 'hidden',
        minWidth: 300,
        minHeight: minimized ? 0 : 240,
        maxWidth: '96vw',
        maxHeight: '92vh',
        background: 'var(--card-bg)',
        border: '0.5px solid var(--card-border)',
        borderRadius: 16,
        boxShadow: '0 8px 30px rgba(120,90,100,0.2)',
      }}>

      {/* header (drag here) */}
      <div
        onPointerDown={onHeaderDown}
        onPointerMove={onHeaderMove}
        onPointerUp={onHeaderUp}
        className="flex items-center gap-1.5 px-3 py-2 flex-shrink-0"
        style={{ background: 'var(--morandi-pink)', cursor: 'grab', touchAction: 'none' }}>
        <p className="text-xs font-medium flex-1 select-none" style={{ color: 'var(--morandi-pink-text)' }}>Research</p>
        {iconBtn(minimized ? '▢' : '–', toggleMinimize, minimized ? 'Show' : 'Minimize')}
        {iconBtn(expanded ? '⤡' : '⤢', toggleExpand, expanded ? 'Smaller' : 'Bigger')}
        {iconBtn('×', onClose, 'Close')}
      </div>

      <div className="flex flex-col flex-1 min-h-0" style={{ display: minimized ? 'none' : 'flex' }}>
        {/* tabs */}
        <div className="flex items-center gap-1 px-2 py-1.5 overflow-x-auto flex-shrink-0" style={{ borderBottom: '0.5px solid var(--divider)' }}>
          <button onClick={() => onTabChange('sources')}
            className="text-xs px-2.5 py-1 rounded-lg whitespace-nowrap"
            style={{ background: isSources ? 'var(--btn-bg)' : 'transparent', color: isSources ? 'var(--btn-text)' : 'var(--text-secondary)', fontWeight: isSources ? 600 : 400 }}>
            Sources (MLA)
          </button>
          {tabs.map(t => (
            <button key={t.id} onClick={() => onTabChange(t.id)}
              className="text-xs px-2.5 py-1 rounded-lg whitespace-nowrap"
              style={{ background: !isSources && tab === t.id ? 'var(--morandi-pink)' : 'transparent', color: !isSources && tab === t.id ? 'var(--morandi-pink-text)' : 'var(--text-secondary)', fontWeight: !isSources && tab === t.id ? 600 : 400 }}>
              {t.name}
            </button>
          ))}
          <button onClick={addTab} className="text-xs px-2 py-1 rounded-lg" style={{ color: 'var(--morandi-pink-text)' }}>+ Tab</button>
        </div>

        {/* body */}
        {isSources ? (
          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
            <div className="flex items-center gap-2">
              <input
                value={page}
                onChange={e => setPage(e.target.value)}
                placeholder="Page (optional)"
                className="w-28 text-xs px-2.5 py-1.5 rounded-lg outline-none"
                style={{ border: '0.5px solid var(--card-border)', color: 'var(--text-primary)' }}
              />
              <p className="text-xs flex-1" style={{ color: 'var(--text-muted)' }}>Type a page, then click a source to insert its citation where your cursor is.</p>
            </div>

            {sources.length === 0 && !showForm && (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No sources yet. Click "+ Add source" to save your first one.</p>
            )}

            <div className="space-y-2">
              {sources.map(s => {
                const preview = inTextSegs(s, page).map(g => g.text).join('')
                return (
                  <div key={s.id}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => insertCitation(s)}
                    className="rounded-lg p-2.5 cursor-pointer"
                    style={{ background: usedIds.has(s.id) ? '#EEF3EF' : 'var(--section-header)', border: '0.5px solid var(--card-border)' }}>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                      {buildEntry(s).map((g, i) => g.italic ? <em key={i}>{g.text}</em> : <span key={i}>{g.text}</span>)}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs" style={{ color: 'var(--morandi-pink-text)' }}>Inserts {preview}</span>
                      {usedIds.has(s.id) && <span className="text-xs" style={{ color: '#507060' }}>cited</span>}
                      <span className="flex-1" />
                      <button onClick={e => { e.stopPropagation(); startEdit(s) }} className="text-xs" style={{ color: 'var(--text-muted)' }}>Edit</button>
                      <button onClick={e => { e.stopPropagation(); deleteSource(s) }} className="text-xs" style={{ color: '#C07070' }}>Delete</button>
                    </div>
                  </div>
                )
              })}
            </div>

            {showForm ? (
              <div className="rounded-lg p-3 space-y-2" style={{ background: '#FDF6E6' }}>
                {field('Author(s)', 'author', 'Smith, John; Jones, Mary')}
                {field('Title', 'title', 'Title of the article, chapter or book')}
                {field('Container (website, journal or book it is in)', 'container', 'Leave empty if the title is a whole book')}
                {field('Publisher', 'publisher', 'Publisher or organization')}
                {field('Year', 'year', '2024')}
                {field('Pages', 'pages', '45-67')}
                {field('Link', 'url', 'https://...')}
                <div className="flex gap-2 pt-1">
                  <button onClick={saveSource} className="flex-1 text-xs py-1.5 rounded-lg" style={{ background: 'var(--btn-bg)', color: 'var(--btn-text)' }}>
                    {editingId ? 'Save changes' : 'Save source'}
                  </button>
                  <button onClick={() => { setShowForm(false); setEditingId(null) }} className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'white', color: 'var(--text-muted)' }}>Cancel</button>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Put several authors in order, separated by a semicolon.</p>
              </div>
            ) : (
              <button onClick={startAdd} className="w-full text-xs py-2 rounded-lg" style={{ background: 'var(--morandi-sand)', color: '#907860' }}>+ Add source</button>
            )}

            <div className="rounded-lg p-3" style={{ border: '0.5px solid var(--card-border)' }}>
              <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Works Cited for this draft ({used.length})</p>
              {used.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>It fills in by itself as you insert citations.</p>
              ) : (
                <div className="space-y-1.5 mb-2">
                  {used.map(u => (
                    <p key={u.source.id} className="text-xs leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                      {u.segs.map((g, i) => g.italic ? <em key={i}>{g.text}</em> : <span key={i}>{g.text}</span>)}
                    </p>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={insertWorksCited} className="flex-1 text-xs py-1.5 rounded-lg" style={{ background: 'var(--btn-bg)', color: 'var(--btn-text)' }}>Insert at end of draft</button>
                <button onClick={copyWorksCited} className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'var(--morandi-sand)', color: '#907860' }}>Copy</button>
              </div>
            </div>
          </div>
        ) : activeTabObj ? (
          <div className="flex flex-col flex-1 min-h-0 p-3 gap-2">
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex rounded-lg p-0.5 gap-0.5" style={{ background: 'var(--morandi-pink)' }}>
                {([['notes', 'Notes'], ['web', 'Web page']] as const).map(([m, label]) => (
                  <button key={m} onClick={() => patchTab(activeTabObj.id, { mode: m })}
                    className="text-xs px-2.5 py-1 rounded-md"
                    style={{ background: activeTabObj.mode === m ? 'white' : 'transparent', color: 'var(--morandi-pink-text)', fontWeight: activeTabObj.mode === m ? 500 : 400 }}>
                    {label}
                  </button>
                ))}
              </div>
              <span className="flex-1" />
              <button onClick={() => renameTab(activeTabObj)} className="text-xs" style={{ color: 'var(--text-muted)' }}>Rename</button>
              <button onClick={() => deleteTab(activeTabObj)} className="text-xs" style={{ color: '#C07070' }}>Delete tab</button>
            </div>

            {activeTabObj.mode === 'notes' ? (
              <textarea
                value={activeTabObj.notes}
                onChange={e => patchTab(activeTabObj.id, { notes: e.target.value })}
                placeholder="Paste your source text here. You can edit it and scroll while you write."
                className="flex-1 min-h-0 w-full text-xs p-2.5 rounded-lg outline-none resize-none leading-relaxed"
                style={{ border: '0.5px solid var(--card-border)', color: 'var(--text-primary)', background: 'white' }}
              />
            ) : (
              <WebView key={activeTabObj.id} url={activeTabObj.url} onUrlChange={u => patchTab(activeTabObj.id, { url: u })} />
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}

/* ---------- the draft editor ---------- */

function DraftEditor({ user, draft, folders, onPatch, onDelete, onBack }: {
  user: User
  draft: Draft
  folders: Folder[]
  onPatch: (id: string, patch: Partial<Draft>) => void
  onDelete: (id: string) => void
  onBack: () => void
}) {
  const [title, setTitle] = useState(draft.title)
  const [limit, setLimit] = useState<string>(draft.word_limit ? String(draft.word_limit) : '')
  const [mode, setMode] = useState<'body' | 'all'>(draft.count_mode || 'body')
  const [docJson, setDocJson] = useState<JSONContent | null>(draft.content)
  const [status, setStatus] = useState('')
  const [comments, setComments] = useState<DraftComment[]>([])
  const [activeComment, setActiveComment] = useState<string | null>(null)
  const [pending, setPending] = useState<{ from: number; to: number; text: string } | null>(null)
  const [noteText, setNoteText] = useState('')
  const [sources, setSources] = useState<Source[]>([])
  const [refTabs, setRefTabs] = useState<RefTab[]>(draft.ref_tabs || [])
  const [researchOpen, setResearchOpen] = useState(false)
  const [panelTab, setPanelTab] = useState<string>('sources')

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingSave = useRef<JSONContent | null>(null)
  const refTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const refPending = useRef<RefTab[] | null>(null)
  const editorRef = useRef<Editor | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const saveContent = async (json: JSONContent) => {
    const { error } = await supabase.from('drafts')
      .update({ content: json, updated_at: new Date().toISOString() })
      .eq('id', draft.id)
    if (!error) onPatch(draft.id, { content: json })
    return !error
  }

  const scheduleSave = (json: JSONContent) => {
    pendingSave.current = json
    setStatus('Saving...')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      const ok = await saveContent(json)
      if (ok) pendingSave.current = null
      setStatus(ok ? 'Saved' : 'Not saved')
    }, 1000)
  }

  const saveRefs = async (tabs: RefTab[]) => {
    const { error } = await supabase.from('drafts').update({ ref_tabs: tabs }).eq('id', draft.id)
    if (!error) onPatch(draft.id, { ref_tabs: tabs })
    return !error
  }

  const changeRefTabs = (tabs: RefTab[]) => {
    setRefTabs(tabs)
    refPending.current = tabs
    if (refTimer.current) clearTimeout(refTimer.current)
    refTimer.current = setTimeout(async () => {
      const ok = await saveRefs(tabs)
      if (ok) refPending.current = null
    }, 800)
  }

  const ALLOWED_IMAGES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!ALLOWED_IMAGES.includes(file.type)) {
      alert('Only PNG, JPG, GIF or WebP images can be added.')
      return null
    }
    if (file.size > 8 * 1024 * 1024) {
      alert('That image is bigger than 8 MB. Please use a smaller screenshot.')
      return null
    }
    const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from('draft-images').upload(path, file, { contentType: file.type })
    if (error) {
      alert('Could not upload the image. Please check that the Supabase storage step was done, then try again.')
      return null
    }
    return supabase.storage.from('draft-images').getPublicUrl(path).data.publicUrl
  }

  const insertImages = async (files: File[]) => {
    const ed = editorRef.current
    if (!ed) return
    setStatus('Uploading image...')
    for (const f of files) {
      const url = await uploadImage(f)
      if (url) ed.chain().focus().setImage({ src: url }).run()
    }
    setStatus('')
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Highlight,
      CommentMark,
      CitationMark,
      ImageExt.configure({ inline: false }),
      Placeholder.configure({ placeholder: 'Start writing...' }),
    ],
    content: draft.content || '',
    immediatelyRender: false,
    editorProps: {
      handlePaste: (_view, event) => {
        const cd = event.clipboardData
        if (!cd) return false
        const files = Array.from(cd.files).filter(f => f.type.startsWith('image/'))
        if (files.length === 0 || cd.types.includes('text/plain')) return false
        event.preventDefault()
        insertImages(files)
        return true
      },
      handleDrop: (_view, event) => {
        const files = Array.from(event.dataTransfer?.files || []).filter(f => f.type.startsWith('image/'))
        if (files.length === 0) return false
        event.preventDefault()
        insertImages(files)
        return true
      },
    },
    onCreate: ({ editor }) => setDocJson(editor.getJSON()),
    onUpdate: ({ editor }) => {
      const json = editor.getJSON()
      setDocJson(json)
      scheduleSave(json)
    },
    onSelectionUpdate: ({ editor }) => {
      const id = editor.getAttributes('comment').commentId as string | undefined
      setActiveComment(id || null)
    },
  })

  useEffect(() => { editorRef.current = editor }, [editor])

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
      if (pendingSave.current) saveContent(pendingSave.current)
      if (refTimer.current) clearTimeout(refTimer.current)
      if (refPending.current) saveRefs(refPending.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('draft_comments').select('*')
        .eq('draft_id', draft.id).order('created_at', { ascending: true })
      if (data) setComments(data as DraftComment[])
    }
    load()
  }, [draft.id])

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('draft_sources').select('*')
        .eq('user_id', user.id).order('created_at', { ascending: true })
      if (data) setSources(data as Source[])
    }
    load()
  }, [user.id])

  useEffect(() => {
    if (!activeComment) return
    const el = document.getElementById(`comment-card-${activeComment}`)
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeComment])

  const count = useMemo(() => countWords(docJson, mode), [docJson, mode])
  const outline = useMemo(() => getOutline(docJson), [docJson])
  const limitNum = parseInt(limit, 10) || 0
  const pct = limitNum > 0 ? Math.min(count / limitNum, 1) : 0
  const over = limitNum > 0 && count > limitNum
  const barColor = over ? '#C07070' : limitNum > 0 && count / limitNum >= 0.9 ? '#D9B77A' : '#EEC4CC'

  const commentTexts = useMemo(() => {
    const out: Record<string, string> = {}
    if (!editor) return out
    editor.state.doc.descendants(node => {
      if (node.isText) {
        node.marks.forEach(m => {
          if (m.type.name === 'comment') {
            const id = m.attrs.commentId as string
            out[id] = (out[id] || '') + (node.text || '')
          }
        })
      }
      return true
    })
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, docJson])

  const activeCss = activeComment && /^[0-9a-f-]{36}$/i.test(activeComment)
    ? `.draft-editor .ProseMirror span[data-comment-id="${activeComment}"] { background: #F3CF7A; border-bottom: 2px solid #D4A23A; }`
    : ''

  const saveTitle = async () => {
    const t = title.trim() || 'Untitled draft'
    setTitle(t)
    if (t === draft.title) return
    await supabase.from('drafts').update({ title: t }).eq('id', draft.id)
    onPatch(draft.id, { title: t })
  }

  const saveLimit = async () => {
    const n = parseInt(limit, 10)
    const value = n > 0 ? n : null
    setLimit(value ? String(value) : '')
    await supabase.from('drafts').update({ word_limit: value }).eq('id', draft.id)
    onPatch(draft.id, { word_limit: value })
  }

  const changeMode = async (m: 'body' | 'all') => {
    setMode(m)
    await supabase.from('drafts').update({ count_mode: m }).eq('id', draft.id)
    onPatch(draft.id, { count_mode: m })
  }

  const moveToFolder = async (folderId: string | null) => {
    await supabase.from('drafts').update({ folder_id: folderId }).eq('id', draft.id)
    onPatch(draft.id, { folder_id: folderId })
  }

  const jumpTo = (index: number) => {
    if (!editor) return
    let n = 0
    let target = -1
    editor.state.doc.descendants((node, pos) => {
      if (target >= 0) return false
      if (node.type.name === 'heading') {
        if (n === index) { target = pos; return false }
        n++
      }
      return true
    })
    if (target >= 0) editor.chain().focus().setTextSelection(target + 1).scrollIntoView().run()
  }

  const focusComment = (id: string) => {
    setActiveComment(id)
    if (!editor) return
    const el = editor.view.dom.querySelector(`span[data-comment-id="${id}"]`)
    if (el) (el as HTMLElement).scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  const removeCommentMark = (id: string) => {
    if (!editor) return
    const { state, view } = editor
    let tr = state.tr
    state.doc.descendants((node, pos) => {
      if (node.isText) {
        const m = node.marks.find(mk => mk.type.name === 'comment' && mk.attrs.commentId === id)
        if (m) tr = tr.removeMark(pos, pos + node.nodeSize, m)
      }
      return true
    })
    view.dispatch(tr)
  }

  const startComment = () => {
    if (!editor) return
    const { from, to } = editor.state.selection
    if (from === to) { alert('Select the text you want to comment on first.'); return }
    const text = editor.state.doc.textBetween(from, to, ' ')
    setPending({ from, to, text })
    setNoteText('')
  }

  const saveComment = async () => {
    if (!editor || !pending || !noteText.trim()) return
    const id = crypto.randomUUID()
    const { data, error } = await supabase.from('draft_comments')
      .insert({ id, draft_id: draft.id, user_id: user.id, body: noteText.trim() })
      .select().single()
    if (error || !data) { alert('Could not save the comment. Please try again.'); return }
    editor.chain()
      .setTextSelection({ from: pending.from, to: pending.to })
      .setMark('comment', { commentId: id })
      .run()
    setComments(prev => [...prev, data as DraftComment])
    setPending(null)
    setNoteText('')
  }

  const resolveComment = async (id: string) => {
    await supabase.from('draft_comments').update({ resolved: true }).eq('id', id)
    removeCommentMark(id)
    setComments(prev => prev.map(c => c.id === id ? { ...c, resolved: true } : c))
    if (activeComment === id) setActiveComment(null)
  }

  const deleteComment = async (id: string) => {
    await supabase.from('draft_comments').delete().eq('id', id)
    removeCommentMark(id)
    setComments(prev => prev.filter(c => c.id !== id))
    if (activeComment === id) setActiveComment(null)
  }

  const tbBtn = (label: string, active: boolean, onClick: () => void) => (
    <button
      onMouseDown={e => e.preventDefault()}
      onClick={onClick}
      className="text-xs px-2.5 py-1.5 rounded-lg"
      style={{
        background: active ? 'var(--morandi-pink)' : 'transparent',
        color: active ? 'var(--morandi-pink-text)' : 'var(--text-secondary)',
        fontWeight: active ? 600 : 400,
      }}>
      {label}
    </button>
  )

  const openComments = comments.filter(c => !c.resolved)
  const resolvedComments = comments.filter(c => c.resolved)

  return (
    <>
      <div className="space-y-3">
        <style>{EDITOR_CSS + activeCss}</style>

        <div className="flex items-center gap-2">
          <button onClick={onBack} className="md:hidden text-xs px-2 py-1 rounded-lg"
            style={{ background: 'var(--morandi-pink)', color: 'var(--morandi-pink-text)' }}>◀ Back</button>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            className="flex-1 min-w-0 text-lg font-medium outline-none bg-transparent px-1"
            style={{ color: 'var(--text-primary)' }}
          />
          <select
            value={draft.folder_id || ''}
            onChange={e => moveToFolder(e.target.value || null)}
            className="text-xs px-2 py-1.5 rounded-lg outline-none max-w-[130px]"
            style={{ border: '0.5px solid var(--card-border)', color: 'var(--text-secondary)', background: 'var(--card-bg)' }}>
            <option value="">Unsorted</option>
            {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <button
            onClick={() => { if (confirm(`Delete "${draft.title}"? This cannot be undone.`)) onDelete(draft.id) }}
            className="text-xs px-2.5 py-1.5 rounded-lg"
            style={{ background: '#FDE8E8', color: '#C07070' }}>Delete</button>
        </div>

        {/* LIVE WORD COUNT */}
        <div className="rounded-xl border p-3" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="text-sm font-medium" style={{ color: over ? '#C07070' : 'var(--morandi-pink-text)' }}>
              {count} {limitNum > 0 ? `/ ${limitNum}` : ''} words
              {over ? ` (${count - limitNum} over)` : ''}
            </p>
            <div className="flex items-center gap-1.5">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Limit</span>
              <input
                value={limit}
                onChange={e => setLimit(e.target.value.replace(/\D/g, ''))}
                onBlur={saveLimit}
                placeholder="none"
                className="w-16 text-xs px-2 py-1 rounded-lg outline-none"
                style={{ border: '0.5px solid var(--card-border)', color: 'var(--text-primary)' }}
              />
            </div>
            <div className="flex rounded-lg p-0.5 gap-0.5" style={{ background: 'var(--morandi-pink)' }}>
              {([['body', 'Body only'], ['all', 'Everything']] as const).map(([m, label]) => (
                <button key={m} onClick={() => changeMode(m)}
                  className="text-xs px-2.5 py-1 rounded-md"
                  style={{ background: mode === m ? 'white' : 'transparent', color: 'var(--morandi-pink-text)', fontWeight: mode === m ? 500 : 400 }}>
                  {label}
                </button>
              ))}
            </div>
            <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>{status}</span>
          </div>
          <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
            Body only skips headings, in-text citations and everything under Works Cited.
          </p>
          {limitNum > 0 && (
            <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: '#F5EEE0' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${pct * 100}%`, background: barColor }} />
            </div>
          )}
        </div>

        {/* TOOLBAR */}
        {editor && (
          <div className="flex flex-wrap items-center gap-1 rounded-xl border p-1.5" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
            {tbBtn('Bold', editor.isActive('bold'), () => editor.chain().focus().toggleBold().run())}
            {tbBtn('Italic', editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run())}
            {tbBtn('Highlight', editor.isActive('highlight'), () => editor.chain().focus().toggleHighlight().run())}
            {tbBtn('Comment', false, startComment)}
            <span className="w-px h-4 mx-1" style={{ background: 'var(--divider)' }} />
            {tbBtn('H1', editor.isActive('heading', { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run())}
            {tbBtn('H2', editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run())}
            {tbBtn('H3', editor.isActive('heading', { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run())}
            <span className="w-px h-4 mx-1" style={{ background: 'var(--divider)' }} />
            {tbBtn('Bullets', editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run())}
            {tbBtn('Numbers', editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run())}
            {tbBtn('Quote', editor.isActive('blockquote'), () => editor.chain().focus().toggleBlockquote().run())}
            <span className="w-px h-4 mx-1" style={{ background: 'var(--divider)' }} />
            {tbBtn('Image', false, () => fileRef.current?.click())}
            {tbBtn('Cite', false, () => { setPanelTab('sources'); setResearchOpen(true) })}
            {tbBtn('Research', researchOpen, () => setResearchOpen(o => !o))}
            <span className="w-px h-4 mx-1" style={{ background: 'var(--divider)' }} />
            {tbBtn('Undo', false, () => editor.chain().focus().undo().run())}
            {tbBtn('Redo', false, () => editor.chain().focus().redo().run())}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              multiple
              className="hidden"
              onChange={e => {
                const files = Array.from(e.target.files || [])
                if (files.length > 0) insertImages(files)
                e.target.value = ''
              }}
            />
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-3 items-start">
          <div className="draft-editor w-full lg:flex-1 min-w-0 rounded-xl border p-5" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
            <EditorContent editor={editor} />
          </div>

          <div className="w-full lg:w-56 flex-shrink-0 space-y-3">
            {/* OUTLINE */}
            <div className="hidden lg:block rounded-xl border p-3" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Outline</p>
              {outline.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Add a heading (H1, H2, H3) and it shows up here.</p>
              ) : outline.map(h => (
                <button key={h.i} onClick={() => jumpTo(h.i)}
                  className="block w-full text-left text-xs py-1 rounded truncate"
                  style={{ paddingLeft: `${(h.level - 1) * 12}px`, color: 'var(--text-secondary)' }}>
                  {h.text}
                </button>
              ))}
            </div>

            {/* COMMENTS */}
            <div className="rounded-xl border p-3" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Comments</p>

              {pending && (
                <div className="rounded-lg p-2.5 mb-2" style={{ background: '#FBEBC8' }}>
                  <p className="text-xs mb-1.5 truncate" style={{ color: '#907860' }}>"{pending.text}"</p>
                  <textarea
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    placeholder="Write your note..."
                    rows={3}
                    autoFocus
                    className="w-full text-xs p-2 rounded-lg outline-none resize-none"
                    style={{ border: '0.5px solid var(--card-border)', color: 'var(--text-primary)', background: 'white' }}
                  />
                  <div className="flex gap-1.5 mt-1.5">
                    <button onClick={saveComment} className="flex-1 text-xs py-1.5 rounded-lg"
                      style={{ background: 'var(--btn-bg)', color: 'var(--btn-text)' }}>Save</button>
                    <button onClick={() => setPending(null)} className="text-xs px-3 py-1.5 rounded-lg"
                      style={{ background: 'white', color: 'var(--text-muted)' }}>Cancel</button>
                  </div>
                </div>
              )}

              {openComments.length === 0 && !pending && (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Select some text and click Comment to leave yourself a note.</p>
              )}

              <div className="space-y-2">
                {openComments.map(c => {
                  const isActive = c.id === activeComment
                  return (
                    <div key={c.id} id={`comment-card-${c.id}`} className="rounded-lg p-2.5 transition-all"
                      style={{
                        background: isActive ? '#FBEBC8' : '#FDF6E6',
                        border: isActive ? '1.5px solid #D4A23A' : '1.5px solid transparent',
                        boxShadow: isActive ? '0 2px 8px rgba(212,162,58,0.25)' : 'none',
                      }}>
                      <button onClick={() => focusComment(c.id)} className="block w-full text-left">
                        <p className="text-xs truncate mb-1" style={{ color: '#B09878' }}>
                          {commentTexts[c.id] ? `"${commentTexts[c.id]}"` : '(text was deleted)'}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-primary)' }}>{c.body}</p>
                      </button>
                      <div className="flex gap-3 mt-1.5">
                        <button onClick={() => resolveComment(c.id)} className="text-xs" style={{ color: '#507060' }}>Resolve</button>
                        <button onClick={() => deleteComment(c.id)} className="text-xs" style={{ color: '#C07070' }}>Delete</button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {resolvedComments.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Resolved ({resolvedComments.length})</p>
                  <div className="space-y-1.5">
                    {resolvedComments.map(c => (
                      <div key={c.id} className="rounded-lg p-2 flex items-start gap-2" style={{ background: 'var(--section-header)' }}>
                        <p className="text-xs flex-1" style={{ color: 'var(--text-muted)' }}>{c.body}</p>
                        <button onClick={() => deleteComment(c.id)} className="text-xs" style={{ color: '#C07070' }}>x</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ResearchPanel
        open={researchOpen}
        onClose={() => setResearchOpen(false)}
        tab={panelTab}
        onTabChange={setPanelTab}
        tabs={refTabs}
        onTabsChange={changeRefTabs}
        sources={sources}
        onSourcesChange={setSources}
        user={user}
        editor={editor}
        docJson={docJson}
      />
    </>
  )
}

/* ---------- the drafts page (folders and list) ---------- */

export default function DraftsPage({ user }: Props) {
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  // null = showing the folder grid, 'none' = the Unsorted folder, otherwise a folder id
  const [activeFolder, setActiveFolder] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [menuFolder, setMenuFolder] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll() }, [user])

  const fetchAll = async () => {
    const [d, f] = await Promise.all([
      supabase.from('drafts').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
      supabase.from('draft_folders').select('*').eq('user_id', user.id).order('created_at', { ascending: true }),
    ])
    if (d.data) setDrafts(d.data as Draft[])
    if (f.data) setFolders(f.data as Folder[])
    setLoading(false)
  }

  const folderIds = useMemo(() => new Set(folders.map(f => f.id)), [folders])
  const draftsIn = (key: string) =>
    key === 'none'
      ? drafts.filter(d => !d.folder_id || !folderIds.has(d.folder_id))
      : drafts.filter(d => d.folder_id === key)

  const createFolder = async () => {
    const name = window.prompt('Folder name (for example: College essays)')
    if (!name || !name.trim()) return
    const { data } = await supabase.from('draft_folders')
      .insert({ user_id: user.id, name: name.trim(), color: 'pink' }).select().single()
    if (data) setFolders(prev => [...prev, data as Folder])
  }

  const renameFolder = async (f: Folder) => {
    setMenuFolder(null)
    const name = window.prompt('Rename folder', f.name)
    if (!name || !name.trim() || name.trim() === f.name) return
    await supabase.from('draft_folders').update({ name: name.trim() }).eq('id', f.id)
    setFolders(prev => prev.map(x => x.id === f.id ? { ...x, name: name.trim() } : x))
  }

  const recolorFolder = async (f: Folder, color: string) => {
    setFolders(prev => prev.map(x => x.id === f.id ? { ...x, color } : x))
    await supabase.from('draft_folders').update({ color }).eq('id', f.id)
  }

  const deleteFolder = async (f: Folder) => {
    setMenuFolder(null)
    if (!confirm(`Delete the folder "${f.name}"? Your drafts inside will not be deleted. They move to Unsorted.`)) return
    await supabase.from('draft_folders').delete().eq('id', f.id)
    setFolders(prev => prev.filter(x => x.id !== f.id))
    setDrafts(prev => prev.map(d => d.folder_id === f.id ? { ...d, folder_id: null } : d))
  }

  const createDraft = async () => {
    if (!activeFolder) return
    const folderId = activeFolder === 'none' ? null : activeFolder
    const { data } = await supabase.from('drafts')
      .insert({ user_id: user.id, title: 'Untitled draft', folder_id: folderId }).select().single()
    if (data) {
      setDrafts(prev => [data as Draft, ...prev])
      setSelectedId(data.id)
    }
  }

  const patchDraft = (id: string, patch: Partial<Draft>) => {
    setDrafts(prev => prev.map(d => d.id === id ? { ...d, ...patch } : d))
    if ('folder_id' in patch) setActiveFolder(patch.folder_id ? patch.folder_id : 'none')
  }

  const deleteDraft = async (id: string) => {
    await supabase.from('drafts').delete().eq('id', id)
    setDrafts(prev => prev.filter(d => d.id !== id))
    setSelectedId(null)
  }

  const openFolder = (key: string) => {
    setMenuFolder(null)
    setSelectedId(null)
    setActiveFolder(key)
  }

  const selected = drafts.find(d => d.id === selectedId) || null

  if (loading) return <div className="flex items-center justify-center h-64 text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</div>

  /* ---------- FOLDER GRID ---------- */
  if (!activeFolder) {
    const unsortedCount = draftsIn('none').length
    const gray = FOLDER_COLORS.gray
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>Drafts</p>
          <button onClick={createFolder}
            className="text-sm px-4 py-2 rounded-xl"
            style={{ background: 'var(--btn-bg)', color: 'var(--btn-text)' }}>
            + New folder
          </button>
        </div>

        {menuFolder && <div className="fixed inset-0 z-10" onClick={() => setMenuFolder(null)} />}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {folders.map(f => {
            const c = colorOf(f.color)
            const count = draftsIn(f.id).length
            return (
              <div key={f.id} className="relative">
                <div
                  onClick={() => openFolder(f.id)}
                  className="aspect-square rounded-2xl p-4 flex flex-col justify-between cursor-pointer"
                  style={{ background: c.bg }}>
                  <div />
                  <div>
                    <p className="text-sm font-medium break-words" style={{ color: c.fg }}>{f.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: c.fg, opacity: 0.75 }}>{count} {count === 1 ? 'draft' : 'drafts'}</p>
                  </div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); setMenuFolder(menuFolder === f.id ? null : f.id) }}
                  className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center text-base"
                  style={{ background: 'rgba(255,255,255,0.6)', color: c.fg }}>
                  ⋯
                </button>
                {menuFolder === f.id && (
                  <div className="absolute top-11 right-2.5 z-20 rounded-xl shadow-lg p-3 w-44"
                    style={{ background: 'var(--card-bg)', border: '0.5px solid var(--card-border)' }}>
                    <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Color</p>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {Object.entries(FOLDER_COLORS).map(([key, val]) => (
                        <button key={key} onClick={() => recolorFolder(f, key)}
                          className="w-6 h-6 rounded-full"
                          style={{ background: val.bg, border: (f.color || 'pink') === key ? `2px solid ${val.fg}` : '1px solid rgba(0,0,0,0.08)' }} />
                      ))}
                    </div>
                    <button onClick={() => renameFolder(f)} className="block w-full text-left text-xs py-1.5" style={{ color: 'var(--text-secondary)' }}>Rename</button>
                    <button onClick={() => deleteFolder(f)} className="block w-full text-left text-xs py-1.5" style={{ color: '#C07070' }}>Delete folder</button>
                  </div>
                )}
              </div>
            )
          })}

          <div
            onClick={() => openFolder('none')}
            className="aspect-square rounded-2xl p-4 flex flex-col justify-between cursor-pointer"
            style={{ background: gray.bg }}>
            <div />
            <div>
              <p className="text-sm font-medium" style={{ color: gray.fg }}>Unsorted</p>
              <p className="text-xs mt-0.5" style={{ color: gray.fg, opacity: 0.75 }}>{unsortedCount} {unsortedCount === 1 ? 'draft' : 'drafts'}</p>
            </div>
          </div>
        </div>

        {folders.length === 0 && (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Click "+ New folder" to make your first folder, like "College essays" or "Econ IA".</p>
        )}
      </div>
    )
  }

  /* ---------- INSIDE A FOLDER ---------- */
  const activeFolderObj = activeFolder === 'none' ? null : folders.find(f => f.id === activeFolder) || null
  const activeName = activeFolder === 'none' ? 'Unsorted' : activeFolderObj?.name || 'Folder'
  const activeColor = activeFolder === 'none' ? FOLDER_COLORS.gray : colorOf(activeFolderObj?.color)
  const list = draftsIn(activeFolder)

  return (
    <div className="flex gap-4 items-start">
      <div className={`${selectedId ? 'hidden md:block' : 'block w-full'} md:w-56 md:flex-shrink-0`}>
        <button onClick={() => { setActiveFolder(null); setSelectedId(null) }}
          className="text-xs mb-3 px-2.5 py-1.5 rounded-lg"
          style={{ background: 'var(--morandi-pink)', color: 'var(--morandi-pink-text)' }}>
          ◀ All folders
        </button>

        <div className="rounded-xl px-3 py-2.5 mb-3" style={{ background: activeColor.bg }}>
          <p className="text-sm font-medium truncate" style={{ color: activeColor.fg }}>{activeName}</p>
          <p className="text-xs" style={{ color: activeColor.fg, opacity: 0.75 }}>{list.length} {list.length === 1 ? 'draft' : 'drafts'}</p>
        </div>

        <button onClick={createDraft}
          className="w-full text-sm py-2.5 rounded-xl mb-3"
          style={{ background: 'var(--btn-bg)', color: 'var(--btn-text)' }}>
          + New draft
        </button>

        <div className="space-y-1.5">
          {list.length === 0 && (
            <p className="text-xs px-1" style={{ color: 'var(--text-muted)' }}>No drafts in here yet.</p>
          )}
          {list.map(d => (
            <button key={d.id} onClick={() => setSelectedId(d.id)}
              className="w-full text-left text-sm px-3 py-2.5 rounded-xl truncate"
              style={{
                background: d.id === selectedId ? activeColor.bg : 'var(--card-bg)',
                color: d.id === selectedId ? activeColor.fg : 'var(--text-primary)',
                border: '0.5px solid var(--card-border)',
                fontWeight: d.id === selectedId ? 500 : 400,
              }}>
              {d.title}
            </button>
          ))}
        </div>
      </div>

      <div className={`${selectedId ? 'block' : 'hidden md:block'} flex-1 min-w-0`}>
        {selected ? (
          <DraftEditor
            key={selected.id}
            user={user}
            draft={selected}
            folders={folders}
            onPatch={patchDraft}
            onDelete={deleteDraft}
            onBack={() => setSelectedId(null)}
          />
        ) : (
          <div className="rounded-xl border p-10 text-center text-sm" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}>
            Pick a draft on the left, or start a new one.
          </div>
        )}
      </div>
    </div>
  )
}
