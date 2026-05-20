import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { Icon } from '../components/Icon'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

export function Upload() {
  const nav = useNavigate()
  const { user } = useAuth()
  const fileRef = useRef(null)
  const cameraRef = useRef(null)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setProgress('Uploading ticket image…')

    try {
      // 1. Upload to Supabase Storage
      const ext = file.name.split('.').pop().toLowerCase()
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('tickets').upload(path, file)
      if (upErr) throw upErr

      setProgress('Analyzing your ticket…')

      // 2. Read file as base64 to send to OCR function
      const reader = new FileReader()
      const base64 = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result.split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      // 3. Call the Netlify function for OCR
      const resp = await fetch('/.netlify/functions/scan-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: base64,
          mime_type: file.type,
        })
      })

      if (!resp.ok) {
        const errText = await resp.text()
        throw new Error(`OCR failed: ${errText}`)
      }

      const parsed = await resp.json()

      // 4. Navigate to editor with the parsed result + storage path
      sessionStorage.setItem('scan_result', JSON.stringify({ ...parsed, image_path: path }))
      nav('/editor/new')

    } catch (err) {
      console.error(err)
      setError(err.message || 'Something went wrong. Try again.')
      setProgress('')
    }
  }

  if (progress) {
    return (
      <AppShell title="Scanning Ticket" subtitle={progress} showBack>
        <div className="mx-5 mt-10 bg-surface border border-border-soft rounded-3xl py-12 px-6 text-center">
          <div className="w-20 h-20 mx-auto mb-5 border-[3px] border-surface-3 border-t-red rounded-full animate-spin-slow"></div>
          <h3 className="text-[17px] font-semibold mb-1.5">Analyzing your ticket</h3>
          <p className="text-[13px] text-text-dim">Detecting vehicle, services, and flag times…</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Upload Ticket" subtitle="Choose how to add this ticket" showBack>
      <input ref={fileRef} type="file" accept="image/*,application/pdf" hidden onChange={handleFile} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={handleFile} />

      {error && <div className="mx-5 mb-3 p-3 bg-red/10 border border-red/30 rounded-xl text-red text-sm">{error}</div>}

      <div className="px-5 grid gap-3">
        <Option icon="camera" title="Take Photo" desc="Use camera to snap your repair order" onClick={() => cameraRef.current?.click()} />
        <Option icon="upload" title="Upload Image" desc="Choose photo from your gallery" onClick={() => fileRef.current?.click()} />
        <Option icon="file" title="Upload PDF" desc="Pick a digital repair order PDF" onClick={() => fileRef.current?.click()} />
        <Option icon="plus" title="Manual Entry" desc="Skip the scan and type the ticket" onClick={() => nav('/editor/new?manual=1')} />
      </div>
    </AppShell>
  )
}

function Option({ icon, title, desc, onClick }) {
  return (
    <button onClick={onClick} className="flex items-center gap-4 bg-surface border border-border-soft rounded-3xl p-5 text-left w-full hover:border-red hover:-translate-y-0.5 transition-all">
      <div className="w-12 h-12 rounded-xl bg-red/10 grid place-items-center flex-shrink-0">
        <Icon name={icon} className="w-6 h-6 text-red" />
      </div>
      <div className="flex-1">
        <h4 className="text-[15px] font-semibold mb-0.5">{title}</h4>
        <p className="text-[13px] text-text-dim">{desc}</p>
      </div>
      <Icon name="chevRight" className="w-4 h-4 text-text-mute" />
    </button>
  )
}
