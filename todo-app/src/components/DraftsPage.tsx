'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useEditor, EditorContent } from '@tiptap/react'
import type { JSONContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import Placeholder from '@tiptap/extension-placeholder'

interface Props { user: User }

interface Draft {
  id: string
  title: string
  content: JSONContent | null
  word_limit: number | null
  count_mode: 'body' | 'all'
  updated_at: string
}

function nodeText(node: JSONContent): string {
  if (node.type === 'text') return node.text || ''
  if (node.type === 'hardBreak') return ' '
  const sep = node.type === 'paragraph' || node.type === 'heading' ? '' : ' '
  return (node.content || []).map(nodeText).join(sep)
}

function countWords(doc: JSONContent | null, mode: 'body' | 'all'): number {
  if (!doc || !doc.content) return 0
  const nodes = doc.content.filter(n => !(mode === 'body' && n.type === 'heading'))
  const text = nodes.map(nodeText).join(' ')
  const matches = text.match(/[\u4e00-\u9fff]|[^\s\u4e00-\u9fff]+/g)
  return matches ? matches.length : 0
}

function getOutline(doc: JSONContent | null) {
  if (!doc || !doc.content) return []
  return doc.content
    .filter(n => n.type === 'heading')
    .map((n, i) => ({ i, level: (n.attrs?.level as number) || 1, text: nodeText(n) || 'Untitled heading' }))
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
.draft-editor .ProseMirror p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: var(--text-muted); float: left; height: 0; pointer-events: none; }
`

function DraftEditor({ draft, onPatch, onDelete, onBack }: {
  draft: Draft
  onPatch: (id: string, patch: Partial<Draft>) => void
  onDelete: (id: string) => void
  onBack: () => void
}) {
  const [title, setTitle] = useState(draft.title)
  const [limit, setLimit] = useState<string>(draft.word_limit ? String(draft.word_limit) : '')
  const [mode, setMode] = useState<'body' | 'all'>(draft.count_mode || 'body')
  const [docJson, setDocJson] = useState<JSONContent | null>(draft.content)
  const [status, setStatus] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef<JSONContent | null>(null)

  const saveContent = async (json: JSONContent) => {
    const { error } = await supabase.from('drafts')
      .update({ content: json, updated_at: new Date().toISOString() })
      .eq('id', draft.id)
    if (!error) onPatch(draft.id, { content: json })
    return !error
  }

  const scheduleSave = (json: JSONContent) => {
    pending.current = json
    setStatus('Saving...')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      const ok = await saveContent(json)
      if (ok) pending.current = null
      setStatus(ok ? 'Saved' : 'Not saved')
    }, 1000)
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Highlight,
      Placeholder.configure({ placeholder: 'Start writing...' }),
    ],
    content: draft.content || '',
    immediatelyRender: false,
    onCreate: ({ editor }) => setDocJson(editor.getJSON()),
    onUpdate: ({ editor }) => {
      const json = editor.getJSON()
      setDocJson(json)
      scheduleSave(json)
    },
  })

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
      if (pending.current) saveContent(pending.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const count = useMemo(() => countWords(docJson, mode), [docJson, mode])
  const outline = useMemo(() => getOutline(docJson), [docJson])
  const limitNum = parseInt(limit, 10) || 0
  const pct = limitNum > 0 ? Math.min(count / limitNum, 1) : 0
  const over = limitNum > 0 && count > limitNum
  const barColor = over ? '#C07070' : limitNum > 0 && count / limitNum >= 0.9 ? '#D9B77A' : '#EEC4CC'

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

  return (
    <div className="space-y-3">
      <style>{EDITOR_CSS}</style>

      <div className="flex items-center gap-2">
        <button onClick={onBack} className="md:hidden text-xs px-2 py-1 rounded-lg"
          style={{ background: 'var(--morandi-pink)', color: 'var(--morandi-pink-text)' }}>◀ Drafts</button>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          className="flex-1 text-lg font-medium outline-none bg-transparent px-1"
          style={{ color: 'var(--text-primary)' }}
        />
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
        {limitNum > 0 && (
          <div className="h-1.5 rounded-full mt-2.5 overflow-hidden" style={{ background: '#F5EEE0' }}>
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
          <span className="w-px h-4 mx-1" style={{ background: 'var(--divider)' }} />
          {tbBtn('H1', editor.isActive('heading', { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run())}
          {tbBtn('H2', editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run())}
          {tbBtn('H3', editor.isActive('heading', { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run())}
          <span className="w-px h-4 mx-1" style={{ background: 'var(--divider)' }} />
          {tbBtn('Bullets', editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run())}
          {tbBtn('Numbers', editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run())}
          {tbBtn('Quote', editor.isActive('blockquote'), () => editor.chain().focus().toggleBlockquote().run())}
          <span className="w-px h-4 mx-1" style={{ background: 'var(--divider)' }} />
          {tbBtn('Undo', false, () => editor.chain().focus().undo().run())}
          {tbBtn('Redo', false, () => editor.chain().focus().redo().run())}
        </div>
      )}

      <div className="flex gap-3 items-start">
        <div className="draft-editor flex-1 min-w-0 rounded-xl border p-5" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
          <EditorContent editor={editor} />
        </div>

        {/* OUTLINE (computer only for now) */}
        <div className="hidden lg:block w-52 flex-shrink-0 rounded-xl border p-3" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
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
      </div>
    </div>
  )
}

export default function DraftsPage({ user }: Props) {
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchDrafts() }, [user])

  const fetchDrafts = async () => {
    const { data } = await supabase.from('drafts').select('*')
      .eq('user_id', user.id).order('updated_at', { ascending: false })
    if (data) setDrafts(data as Draft[])
    setLoading(false)
  }

  const createDraft = async () => {
    const { data } = await supabase.from('drafts')
      .insert({ user_id: user.id, title: 'Untitled draft' }).select().single()
    if (data) {
      setDrafts(prev => [data as Draft, ...prev])
      setSelectedId(data.id)
    }
  }

  const patchDraft = (id: string, patch: Partial<Draft>) => {
    setDrafts(prev => prev.map(d => d.id === id ? { ...d, ...patch } : d))
  }

  const deleteDraft = async (id: string) => {
    await supabase.from('drafts').delete().eq('id', id)
    setDrafts(prev => prev.filter(d => d.id !== id))
    setSelectedId(null)
  }

  const selected = drafts.find(d => d.id === selectedId) || null

  if (loading) return <div className="flex items-center justify-center h-64 text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</div>

  return (
    <div className="flex gap-4 items-start">
      <div className={`${selectedId ? 'hidden md:block' : 'block w-full'} md:w-60 md:flex-shrink-0`}>
        <button onClick={createDraft}
          className="w-full text-sm py-2.5 rounded-xl mb-3"
          style={{ background: 'var(--btn-bg)', color: 'var(--btn-text)' }}>
          + New draft
        </button>
        <div className="space-y-1.5">
          {drafts.length === 0 && (
            <p className="text-xs px-1" style={{ color: 'var(--text-muted)' }}>No drafts yet. Click "New draft" to start one.</p>
          )}
          {drafts.map(d => (
            <button key={d.id} onClick={() => setSelectedId(d.id)}
              className="w-full text-left text-sm px-3 py-2.5 rounded-xl truncate"
              style={{
                background: d.id === selectedId ? 'var(--morandi-pink)' : 'var(--card-bg)',
                color: d.id === selectedId ? 'var(--morandi-pink-text)' : 'var(--text-primary)',
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
            draft={selected}
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
