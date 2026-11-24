'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useEditor, EditorContent } from '@tiptap/react'
import type { JSONContent } from '@tiptap/react'
import { Mark, mergeAttributes } from '@tiptap/core'
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
  folder_id: string | null
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
.draft-editor .ProseMirror .draft-comment { background: #FBEBC8; border-bottom: 2px solid #E8C98A; }
.draft-editor .ProseMirror p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: var(--text-muted); float: left; height: 0; pointer-events: none; }
`

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
  const [pending, setPending] = useState<{ from: number; to: number; text: string } | null>(null)
  const [noteText, setNoteText] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingSave = useRef<JSONContent | null>(null)

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

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Highlight,
      CommentMark,
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
      if (pendingSave.current) saveContent(pendingSave.current)
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

  const findCommentPos = (id: string): number => {
    if (!editor) return -1
    let found = -1
    editor.state.doc.descendants((node, pos) => {
      if (found >= 0) return false
      if (node.isText && node.marks.some(m => m.type.name === 'comment' && m.attrs.commentId === id)) {
        found = pos
        return false
      }
      return true
    })
    return found
  }

  const jumpToComment = (id: string) => {
    if (!editor) return
    const pos = findCommentPos(id)
    if (pos >= 0) editor.chain().focus().setTextSelection(pos).scrollIntoView().run()
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
  }

  const deleteComment = async (id: string) => {
    await supabase.from('draft_comments').delete().eq('id', id)
    removeCommentMark(id)
    setComments(prev => prev.filter(c => c.id !== id))
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
    <div className="space-y-3">
      <style>{EDITOR_CSS}</style>

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
          {tbBtn('Undo', false, () => editor.chain().focus().undo().run())}
          {tbBtn('Redo', false, () => editor.chain().focus().redo().run())}
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
              {openComments.map(c => (
                <div key={c.id} className="rounded-lg p-2.5" style={{ background: '#FDF6E6' }}>
                  <button onClick={() => jumpToComment(c.id)} className="block w-full text-left">
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
              ))}
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
  )
}

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
