import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { Icon } from '../components/Icon'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { matchLibraryItem, STARTER_FLAG_LIBRARY } from '../data/starterLibrary'

export function Editor() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const isManual = params.get('manual') === '1'
  const nav = useNavigate()
  const { user } = useAuth()

  const [ticket, setTicket] = useState({
    work_order: '',
    ticket_date: new Date().toISOString().slice(0, 10),
    vehicle_year: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_engine: '',
    vin: '',
    customer_name: '',
    notes: '',
  })
  const [lines, setLines] = useState([])
  const [imagePath, setImagePath] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (id === 'new' && !isManual) {
      // Load OCR scan result from sessionStorage
      const raw = sessionStorage.getItem('scan_result')
      if (raw) {
        try {
          const parsed = JSON.parse(raw)
          loadFromScan(parsed)
        } catch {}
      }
    } else if (id && id !== 'new') {
      loadTicket(id)
    }
  }, [id])

  async function loadTicket(ticketId) {
    const { data: t } = await supabase.from('tickets').select('*').eq('id', ticketId).single()
    const { data: l } = await supabase.from('ticket_lines').select('*').eq('ticket_id', ticketId).order('position')
    if (t) {
      setTicket(t)
      setImagePath(t.image_path)
    }
    if (l) setLines(l)
  }

  function loadFromScan(scan) {
    setImagePath(scan.image_path)
    setTicket(t => ({
      ...t,
      work_order: scan.work_order || '',
      ticket_date: scan.ticket_date || t.ticket_date,
      vehicle_year: scan.vehicle?.year || '',
      vehicle_make: scan.vehicle?.make || '',
      vehicle_model: scan.vehicle?.model || '',
      vehicle_engine: scan.vehicle?.engine || '',
      vin: scan.vehicle?.vin || '',
      customer_name: scan.customer_name || '',
    }))
    // Map scanned lines to lib entries
    const mapped = (scan.line_items || []).map((li, idx) => {
      const match = matchLibraryItem(li.description, STARTER_FLAG_LIBRARY)
      return {
        id: `tmp_${idx}`,
        position: idx,
        description: li.description || '',
        quantity: li.quantity || 1,
        flag_hours_per_unit: match?.flag_hours || li.flag_hours_per_unit || 0,
        status: match ? 'estimated' : 'pending',
        match_confidence: match?.confidence || null,
        notes: '',
      }
    })
    setLines(mapped)
  }

  function updateLine(idx, patch) {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, ...patch } : l))
  }
  function removeLine(idx) {
    if (!confirm('Remove this line item?')) return
    setLines(prev => prev.filter((_, i) => i !== idx))
  }
  function copyLine(idx) {
    setLines(prev => {
      const next = [...prev]
      next.splice(idx + 1, 0, { ...prev[idx], id: `tmp_${Date.now()}` })
      return next
    })
  }
  function addLine(line) {
    setLines(prev => [...prev, { id: `tmp_${Date.now()}`, position: prev.length, ...line }])
    setShowAdd(false)
  }

  const totalHours = lines.reduce((sum, l) => sum + (parseFloat(l.quantity || 0) * parseFloat(l.flag_hours_per_unit || 0)), 0)
  const confirmedHours = lines.filter(l => l.status === 'confirmed').reduce((s, l) => s + (parseFloat(l.quantity || 0) * parseFloat(l.flag_hours_per_unit || 0)), 0)
  const estimatedHours = lines.filter(l => l.status === 'estimated' || l.status === 'pending').reduce((s, l) => s + (parseFloat(l.quantity || 0) * parseFloat(l.flag_hours_per_unit || 0)), 0)

  async function save(status = 'confirmed') {
    setSaving(true)
    try {
      const ticketData = {
        ...ticket,
        user_id: user.id,
        total_flag_hours: totalHours,
        status,
        image_path: imagePath,
      }

      let ticketId = id !== 'new' ? id : null

      if (!ticketId) {
        const { data, error } = await supabase.from('tickets').insert(ticketData).select().single()
        if (error) throw error
        ticketId = data.id
      } else {
        await supabase.from('tickets').update(ticketData).eq('id', ticketId)
        await supabase.from('ticket_lines').delete().eq('ticket_id', ticketId)
      }

      // Insert lines
      if (lines.length > 0) {
        const rows = lines.map((l, i) => ({
          ticket_id: ticketId,
          position: i,
          description: l.description,
          quantity: parseFloat(l.quantity) || 1,
          flag_hours_per_unit: parseFloat(l.flag_hours_per_unit) || 0,
          total_flag_hours: (parseFloat(l.quantity) || 1) * (parseFloat(l.flag_hours_per_unit) || 0),
          status: l.status || 'confirmed',
          match_confidence: l.match_confidence || null,
          notes: l.notes || null,
        }))
        await supabase.from('ticket_lines').insert(rows)
      }

      sessionStorage.removeItem('scan_result')
      nav('/')
    } catch (e) {
      console.error(e)
      alert('Failed to save: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell title="Review Ticket" subtitle={ticket.work_order ? `WO #${ticket.work_order}` : 'New ticket'} showBack>
      {/* OCR draft banner only when from scan */}
      {!isManual && id === 'new' && lines.length > 0 && (
        <div className="mx-5 mb-3.5 p-3 bg-amber/[0.08] border border-amber/25 rounded-xl flex items-start gap-2.5">
          <Icon name="info" className="w-4 h-4 text-amber flex-shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed text-text-dim"><strong className="text-amber">OCR draft.</strong> Flag hours filled from your library based on vehicle match. Confirm or edit each line.</div>
        </div>
      )}

      {/* Header fields */}
      <div className="mx-5 mb-3.5 bg-surface border border-border-soft rounded-3xl p-4 grid gap-2">
        <Field label="Work Order #" value={ticket.work_order} onChange={v => setTicket({ ...ticket, work_order: v })} />
        <Field label="Date" type="date" value={ticket.ticket_date} onChange={v => setTicket({ ...ticket, ticket_date: v })} />
        <div className="grid grid-cols-4 gap-2">
          <FieldSmall label="Year" value={ticket.vehicle_year} onChange={v => setTicket({ ...ticket, vehicle_year: v })} />
          <FieldSmall label="Make" value={ticket.vehicle_make} onChange={v => setTicket({ ...ticket, vehicle_make: v })} />
          <FieldSmall label="Model" value={ticket.vehicle_model} onChange={v => setTicket({ ...ticket, vehicle_model: v })} />
          <FieldSmall label="Engine" value={ticket.vehicle_engine} onChange={v => setTicket({ ...ticket, vehicle_engine: v })} />
        </div>
        <Field label="VIN" value={ticket.vin} onChange={v => setTicket({ ...ticket, vin: v })} mono />
        <Field label="Customer" value={ticket.customer_name} onChange={v => setTicket({ ...ticket, customer_name: v })} />
      </div>

      {/* Section title */}
      <div className="px-5 pt-2 pb-2.5 flex justify-between items-center">
        <span className="text-xs font-semibold tracking-widest text-text-dim uppercase">Line Items</span>
        <span className="bg-surface-3 text-text-main rounded-full px-2.5 py-0.5 text-[11px]">{lines.length}</span>
      </div>

      <div className="px-5 grid gap-2.5">
        {lines.map((line, i) => (
          <LineItem key={line.id || i} line={line} onChange={p => updateLine(i, p)} onRemove={() => removeLine(i)} onCopy={() => copyLine(i)} />
        ))}
      </div>

      <button onClick={() => setShowAdd(true)} className="mt-3.5 mx-5 py-3.5 w-[calc(100%-40px)] border-[1.5px] border-dashed border-border rounded-2xl text-text-dim text-sm font-medium flex items-center justify-center gap-2 hover:border-red hover:text-red">
        <Icon name="plus" className="w-4 h-4" />
        Add Line Item
      </button>

      {/* Summary */}
      <div className="mx-5 mt-4 p-5 rounded-3xl border border-border-soft" style={{ background: 'linear-gradient(180deg, rgba(225,29,42,0.08), transparent), #15151A' }}>
        <Row label="Line items" value={lines.length} />
        <Row label="Confirmed hours" value={`${confirmedHours.toFixed(2)} hr`} />
        <Row label="Estimated hours" value={`${estimatedHours.toFixed(2)} hr`} />
        <div className="mt-2 pt-3 border-t border-border-soft flex justify-between items-center">
          <span className="text-text-dim">Ticket Total</span>
          <span className="text-red text-[22px] font-bold font-mono">{totalHours.toFixed(2)} hr</span>
        </div>
      </div>

      <div className="flex gap-2.5 mx-5 mt-4">
        <button onClick={() => save('draft')} disabled={saving} className="flex-1 py-3.5 bg-surface border border-border rounded-xl font-semibold text-sm hover:bg-surface-2">Save Draft</button>
        <button onClick={() => save('confirmed')} disabled={saving} className="flex-1 py-3.5 bg-red hover:bg-red-hover rounded-xl text-white font-bold text-sm tracking-wide shadow-[0_8px_20px_rgba(225,29,42,0.3)] active:scale-[0.99]">{saving ? 'Saving…' : 'Confirm Ticket'}</button>
      </div>

      {showAdd && <AddLineModal onClose={() => setShowAdd(false)} onAdd={addLine} />}
    </AppShell>
  )
}

function Field({ label, value, onChange, type = 'text', mono = false }) {
  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-border-soft last:border-b-0">
      <span className="text-sm text-text-dim font-medium w-28 flex-shrink-0">{label}</span>
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} className={`flex-1 bg-transparent text-right text-sm font-medium focus:text-red ${mono ? 'font-mono text-xs' : ''}`} />
    </div>
  )
}
function FieldSmall({ label, value, onChange }) {
  return (
    <div className="text-center">
      <div className="text-[9px] tracking-widest text-text-mute uppercase font-semibold mb-1">{label}</div>
      <input value={value || ''} onChange={e => onChange(e.target.value)} className="w-full bg-surface-2 border border-border-soft rounded-md px-1.5 py-1.5 text-sm text-center font-semibold focus:border-red" />
    </div>
  )
}

function LineItem({ line, onChange, onRemove, onCopy }) {
  const total = (parseFloat(line.quantity || 0) * parseFloat(line.flag_hours_per_unit || 0)).toFixed(2)
  return (
    <div className="bg-surface border border-border-soft rounded-2xl overflow-hidden">
      <div className="px-4 pt-3.5 pb-2.5">
        <input value={line.description} onChange={e => onChange({ description: e.target.value })} className="w-full bg-transparent text-[15px] font-semibold focus:text-red" placeholder="Service / item name" />
        <div className="flex gap-1.5 flex-wrap mt-2">
          <StatusBadge status={line.status} onChange={s => onChange({ status: s })} />
          {line.match_confidence && (
            <span className={`text-[11px] font-semibold px-2 py-1 rounded-md uppercase tracking-wider ${line.match_confidence === 'high' ? 'bg-green/10 text-green' : line.match_confidence === 'medium' ? 'bg-amber/10 text-amber' : 'bg-red/10 text-red'}`}>
              ● {line.match_confidence} match
            </span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-3 bg-surface-2 border-t border-border-soft">
        <Cell label="Qty">
          <input type="number" step="1" min="1" value={line.quantity} onChange={e => onChange({ quantity: e.target.value })} className="w-full bg-transparent text-center text-base font-bold font-mono focus:text-red" />
        </Cell>
        <Cell label="Flag / Unit">
          <input type="number" step="0.1" min="0" value={line.flag_hours_per_unit} onChange={e => onChange({ flag_hours_per_unit: e.target.value })} className="w-full bg-transparent text-center text-base font-bold font-mono focus:text-red" />
        </Cell>
        <Cell label="Total Hrs">
          <div className="text-base font-bold font-mono text-red">{total}</div>
        </Cell>
      </div>
      <div className="flex border-t border-border-soft">
        <MiniBtn onClick={onCopy}><Icon name="copy" className="w-3 h-3" />Copy</MiniBtn>
        <MiniBtn onClick={onRemove} danger><Icon name="trash" className="w-3 h-3" />Remove</MiniBtn>
      </div>
    </div>
  )
}

function Cell({ label, children }) {
  return (
    <div className="px-2 py-2.5 border-r border-border-soft last:border-r-0 text-center">
      <div className="text-[9px] tracking-widest text-text-mute uppercase font-semibold mb-1">{label}</div>
      {children}
    </div>
  )
}
function MiniBtn({ children, onClick, danger }) {
  return (
    <button onClick={onClick} className={`flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 border-r last:border-r-0 border-border-soft hover:bg-surface-2 ${danger ? 'hover:text-red' : 'text-text-dim hover:text-text-main'}`}>
      {children}
    </button>
  )
}

function StatusBadge({ status, onChange }) {
  const opts = ['confirmed', 'estimated', 'pending', 'added_later']
  const next = () => { const i = opts.indexOf(status); onChange(opts[(i + 1) % opts.length]) }
  const colors = {
    confirmed: 'bg-green/10 text-green',
    estimated: 'bg-amber/10 text-amber',
    pending: 'bg-amber/10 text-amber',
    added_later: 'bg-red/10 text-red',
  }
  const labels = { confirmed: 'Confirmed', estimated: 'Estimated', pending: 'Pending', added_later: 'Added Later' }
  return (
    <button onClick={next} className={`text-[11px] font-semibold px-2 py-1 rounded-md uppercase tracking-wider ${colors[status] || 'bg-surface-3 text-text-dim'}`}>
      {labels[status] || status}
    </button>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between items-center py-1.5 text-sm">
      <span className="text-text-dim">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}

function AddLineModal({ onClose, onAdd }) {
  const [desc, setDesc] = useState('')
  const [qty, setQty] = useState('1')
  const [flag, setFlag] = useState('')
  const [status, setStatus] = useState('confirmed')

  return (
    <div className="fixed inset-0 bg-black/75 z-[300] flex items-end justify-center" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-[440px] bg-surface rounded-t-3xl px-6 pt-4 pb-8 animate-slide-up">
        <div className="w-10 h-1 bg-surface-3 rounded-full mx-auto mb-4"></div>
        <h3 className="text-lg font-semibold mb-4">Add Line Item</h3>
        <div className="mb-3">
          <label className="block text-xs font-semibold tracking-wider text-text-dim uppercase mb-2">Item / Service</label>
          <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. Front Brake Pads" className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-[15px] focus:border-red" />
        </div>
        <div className="grid grid-cols-2 gap-2.5 mb-3">
          <div>
            <label className="block text-xs font-semibold tracking-wider text-text-dim uppercase mb-2">Quantity</label>
            <input type="number" step="1" value={qty} onChange={e => setQty(e.target.value)} className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-[15px] focus:border-red" />
          </div>
          <div>
            <label className="block text-xs font-semibold tracking-wider text-text-dim uppercase mb-2">Flag / Unit (hrs)</label>
            <input type="number" step="0.1" value={flag} onChange={e => setFlag(e.target.value)} placeholder="0.0" className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-[15px] focus:border-red" />
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-xs font-semibold tracking-wider text-text-dim uppercase mb-2">Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)} className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-[15px] focus:border-red">
            <option value="confirmed">Confirmed</option>
            <option value="estimated">Estimated</option>
            <option value="pending">Pending Approval</option>
            <option value="added_later">Added Later</option>
          </select>
        </div>
        <div className="flex gap-2.5">
          <button onClick={onClose} className="flex-1 py-3.5 bg-surface-2 border border-border rounded-xl font-semibold text-sm">Cancel</button>
          <button onClick={() => { if (!desc) return alert('Add a description'); onAdd({ description: desc, quantity: parseFloat(qty) || 1, flag_hours_per_unit: parseFloat(flag) || 0, status }) }} className="flex-1 py-3.5 bg-red text-white font-bold rounded-xl text-sm">Add Item</button>
        </div>
      </div>
    </div>
  )
}
