'use client'
import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

const SUBJECT_COLORS_DEFAULT = {
  'Math': '#ED93B1', 'English': '#85B7EB', 'Chinese': '#5DCAA5',
  'Economics': '#F0997B', 'Business Management': '#AFA9EC', 'Biology': '#97C459',
  'TOK': '#FAC775', 'EE': '#F7C1C1', 'CAS': '#C0DD97',
}

export default function SettingsPage({ user }: { user: User }) {
  const [displayName, setDisplayName] = useState(user.email?.split('@')[0] || '')
  const [saved, setSaved] = useState(false)

  const save = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <h2 style={{ fontFamily: 'Playfair Display, serif', color: '#993556', fontSize: 20, marginBottom: 16 }}>⚙️ Settings</h2>

      <div className="section-card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 16 }}>Account</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: 16, background: '#FFF5F8', borderRadius: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#E8829F', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 16, fontWeight: 600 }}>
            {user.email?.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>{user.email}</div>
            <div style={{ fontSize: 11, color: '#999' }}>Google account</div>
          </div>
        </div>

        <button
          onClick={() => { if (confirm('Sign out?')) supabase.auth.signOut() }}
          style={{ padding: '8px 16px', background: '#FFCDD2', color: '#993556', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}
        >Sign out</button>
      </div>

      <div className="section-card" style={{ padding: 20, marginTop: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 4 }}>Subject Colors</h3>
        <p style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>Colors used for subject tags throughout the app</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
          {Object.entries(SUBJECT_COLORS_DEFAULT).map(([name, color]) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#FFF5F8', borderRadius: 8 }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#555' }}>{name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="section-card" style={{ padding: 20, marginTop: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 4 }}>Notifications</h3>
        <p style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>Browser notifications for urgent tasks (2 days before due date)</p>
        <button
          onClick={async () => {
            const perm = await Notification.requestPermission()
            if (perm === 'granted') alert('Notifications enabled! You\'ll be reminded when tasks are due soon.')
            else alert('Please enable notifications in your browser settings.')
          }}
          style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #E8829F, #B5476A)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}
        >Enable browser notifications</button>
      </div>

      <div className="section-card" style={{ padding: 20, marginTop: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 4 }}>Data</h3>
        <p style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>All your data is stored securely in Supabase and linked to your Google account</p>
        <button
          onClick={async () => {
            const { data } = await supabase.from('tasks').select('*').eq('user_id', user.id)
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a'); a.href = url; a.download = 'my-todo-backup.json'; a.click()
          }}
          style={{ padding: '8px 16px', background: '#FDE8F0', color: '#B5476A', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}
        >Export my data (JSON)</button>
      </div>
    </div>
  )
}
