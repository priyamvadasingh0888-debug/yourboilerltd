'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  MapPin,
  Phone,
  Clock,
  CheckCircle2,
  Play,
  Flame,
  Plus,
  Trash2,
  AlertTriangle
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { saveEngineerJobProgress } from '@/app/admin/jobs/actions'
import type { JobStatus } from '@/types/database'

interface PartItem {
  name: string
  partNo: string
  qty: number
  cost: number
}

interface Props {
  job: {
    id: string
    job_number: string
    status: JobStatus
    job_type: string
    priority: string
    description: string | null
    scheduled_start: string | null
    duration_minutes: number | null
    completion_notes: string | null
    parts_used: any
    time_slot?: string | null
    customer?: {
      id: string
      name: string
      phone: string | null
      email: string | null
    } | null
    property?: {
      id: string
      address_line1: string
      address_line2: string | null
      city: string
      postcode: string
    } | null
    certificates?: Array<{
      id: string
      certificate_number: string
      status: string
    }>
  }
}

export function EngineerJobDetailClient({ job }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState<JobStatus>(job.status)
  const [completionNotes, setCompletionNotes] = useState(job.completion_notes || '')
  const [parts, setParts] = useState<PartItem[]>(() => {
    if (Array.isArray(job.parts_used)) {
      return job.parts_used as PartItem[]
    }
    return []
  })
  const [newPart, setNewPart] = useState<PartItem>({ name: '', partNo: '', qty: 1, cost: 0 })
  const [showAddPart, setShowAddPart] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleStatusChange = async (newStatus: JobStatus) => {
    setSaving(true)
    setErrorMessage(null)
    const res = await saveEngineerJobProgress(job.id, { status: newStatus })
    setSaving(false)
    if (res.error) {
      setErrorMessage(res.error)
    } else {
      setStatus(newStatus)
      setSaveMessage(`Status updated to ${newStatus.replace('_', ' ')}`)
      router.refresh()
      setTimeout(() => setSaveMessage(null), 3000)
    }
  }

  const handleSaveNotesAndParts = async () => {
    setSaving(true)
    setErrorMessage(null)
    const res = await saveEngineerJobProgress(job.id, {
      completion_notes: completionNotes,
      parts_used: parts,
    })
    setSaving(false)
    if (res.error) {
      setErrorMessage(res.error)
    } else {
      setSaveMessage('Job progress saved successfully')
      setTimeout(() => setSaveMessage(null), 3000)
    }
  }

  const addPart = async () => {
    if (!newPart.name.trim()) return
    const updatedParts = [...parts, { ...newPart }]
    setParts(updatedParts)
    setNewPart({ name: '', partNo: '', qty: 1, cost: 0 })
    setShowAddPart(false)

    // Save to database
    await saveEngineerJobProgress(job.id, { parts_used: updatedParts })
  }

  const removePart = async (index: number) => {
    const updatedParts = parts.filter((_, i) => i !== index)
    setParts(updatedParts)
    await saveEngineerJobProgress(job.id, { parts_used: updatedParts })
  }

  const propertyAddress = job.property
    ? `${job.property.address_line1}${job.property.address_line2 ? `, ${job.property.address_line2}` : ''}, ${job.property.city}`
    : 'Address not recorded'
  const postcode = job.property?.postcode || ''
  const mapsQuery = encodeURIComponent(`${propertyAddress} ${postcode}`.trim())

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '640px', margin: '0 auto', paddingBottom: '32px' }}>
      {/* Top Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <Link
          href="/engineer"
          className="neo-btn-outline"
          style={{ padding: '6px 14px', fontSize: '12px' }}
        >
          <ArrowLeft size={14} /> Back to Schedule
        </Link>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: '99px',
            background: status === 'completed' ? 'rgba(34, 197, 94, 0.12)' : status === 'in_progress' ? '#d4fa35' : '#f0f2f5',
            color: status === 'completed' ? '#16a34a' : '#111215',
            textTransform: 'capitalize',
          }}
        >
          {status.replace('_', ' ')}
        </span>
      </div>

      {errorMessage && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '10px 14px', fontSize: '13px', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={15} style={{ flexShrink: 0 }} />
          <span>{errorMessage}</span>
        </div>
      )}

      {saveMessage && (
        <div style={{ background: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.25)', borderRadius: '12px', padding: '10px 14px', fontSize: '13px', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Main Job Card */}
      <div className="neo-card" style={{ padding: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: '#747b86', fontWeight: 600 }}>
            {job.job_number}
          </div>
          {job.time_slot && (
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: '#f0f2f5', color: '#111215', textTransform: 'capitalize' }}>
              {job.time_slot} Slot
            </span>
          )}
        </div>

        <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#111215', margin: '8px 0 16px 0', letterSpacing: '-0.02em' }}>
          {job.description || job.job_type.replace(/_/g, ' ')}
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
          {/* Property & Map Link */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#111215' }}>
            <MapPin size={16} color="#747b86" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div>{propertyAddress}</div>
              {postcode && <strong style={{ color: '#111215' }}>{postcode}</strong>}
            </div>
            {mapsQuery && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#111215',
                  textDecoration: 'none',
                  background: '#f0f2f5',
                  padding: '4px 10px',
                  borderRadius: '99px',
                  whiteSpace: 'nowrap',
                }}
              >
                Maps ↗
              </a>
            )}
          </div>

          {/* Customer & Call Link */}
          {job.customer && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#52525b' }}>
              <Phone size={16} color="#747b86" style={{ flexShrink: 0 }} />
              <span>{job.customer.name}</span>
              {job.customer.phone && (
                <a
                  href={`tel:${job.customer.phone}`}
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#111215',
                    marginLeft: 'auto',
                    textDecoration: 'none',
                    background: '#d4fa35',
                    padding: '4px 10px',
                    borderRadius: '99px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Call {job.customer.phone}
                </a>
              )}
            </div>
          )}

          {/* Scheduled Time */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#52525b' }}>
            <Clock size={16} color="#747b86" style={{ flexShrink: 0 }} />
            <span>
              {job.scheduled_start ? format(parseISO(job.scheduled_start), 'dd/MM/yyyy HH:mm') : 'Unscheduled'}
              {job.duration_minutes ? ` (${job.duration_minutes} mins)` : ''}
            </span>
          </div>
        </div>

        {/* Status Actions */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '16px', flexWrap: 'wrap' }}>
          {status === 'scheduled' && (
            <button
              type="button"
              className="neo-btn-black"
              style={{ flex: 1, minWidth: '130px' }}
              disabled={saving}
              onClick={() => handleStatusChange('in_progress')}
            >
              <Play size={14} /> Start Job
            </button>
          )}

          {status === 'in_progress' && (
            <button
              type="button"
              className="neo-btn-lime"
              style={{ flex: 1, minWidth: '130px' }}
              disabled={saving}
              onClick={() => handleStatusChange('completed')}
            >
              <CheckCircle2 size={15} /> Complete Job
            </button>
          )}

          {status === 'completed' && (
            <button
              type="button"
              className="neo-btn-outline"
              style={{ flex: 1, minWidth: '130px' }}
              disabled={saving}
              onClick={() => handleStatusChange('in_progress')}
            >
              Reopen Job
            </button>
          )}

          {job.certificates && job.certificates.length > 0 ? (
            <Link
              href={`/admin/certificates/${job.certificates[0].id}`}
              className="neo-btn-outline"
              style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Flame size={15} color="#111215" /> View CP12 Record
            </Link>
          ) : (
            <Link
              href="/admin/certificates"
              className="neo-btn-outline"
              style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Flame size={15} color="#111215" /> Gas Safety (CP12)
            </Link>
          )}
        </div>
      </div>

      {/* Parts Used Section */}
      <div className="neo-card" style={{ padding: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111215', margin: 0 }}>
            Parts Used ({parts.length})
          </h3>
          <button
            type="button"
            className="neo-btn-outline"
            style={{ padding: '5px 12px', fontSize: '11px' }}
            onClick={() => setShowAddPart(!showAddPart)}
          >
            <Plus size={13} /> Add Part
          </button>
        </div>

        {showAddPart && (
          <div style={{ background: '#f8f9fb', padding: '16px', borderRadius: '14px', marginBottom: '14px', border: '1px solid rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="text"
              placeholder="Part description..."
              value={newPart.name}
              onChange={e => setNewPart({ ...newPart, name: e.target.value })}
              style={{
                width: '100%',
                background: '#ffffff',
                border: '1px solid rgba(0,0,0,0.1)',
                borderRadius: '10px',
                padding: '10px 12px',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: '8px' }}>
              <input
                type="text"
                placeholder="Part reference #"
                value={newPart.partNo}
                onChange={e => setNewPart({ ...newPart, partNo: e.target.value })}
                style={{
                  background: '#ffffff',
                  border: '1px solid rgba(0,0,0,0.1)',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
              <input
                type="number"
                placeholder="Qty"
                min={1}
                value={newPart.qty}
                onChange={e => setNewPart({ ...newPart, qty: parseInt(e.target.value) || 1 })}
                style={{
                  background: '#ffffff',
                  border: '1px solid rgba(0,0,0,0.1)',
                  borderRadius: '10px',
                  padding: '10px 8px',
                  fontSize: '13px',
                  outline: 'none',
                  textAlign: 'center',
                }}
              />
            </div>
            <input
              type="number"
              step="0.01"
              placeholder="Unit cost (£)"
              value={newPart.cost || ''}
              onChange={e => setNewPart({ ...newPart, cost: parseFloat(e.target.value) || 0 })}
              style={{
                width: '100%',
                background: '#ffffff',
                border: '1px solid rgba(0,0,0,0.1)',
                borderRadius: '10px',
                padding: '10px 12px',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <button
              type="button"
              className="neo-btn-black"
              style={{ width: '100%', padding: '11px', fontSize: '13px' }}
              onClick={addPart}
            >
              Save Part
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {parts.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#747b86', padding: '12px 0', textAlign: 'center' }}>
              No parts logged yet. Tap &ldquo;Add Part&rdquo; to record items used on site.
            </div>
          ) : (
            parts.map((p, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px',
                  background: '#f8f9fb',
                  borderRadius: '12px',
                  fontSize: '13px',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: '#111215' }}>{p.name}</div>
                  <div style={{ fontSize: '11px', color: '#747b86', fontFamily: 'var(--font-mono)' }}>
                    Ref: {p.partNo || 'N/A'} • Qty: {p.qty}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontWeight: 700, color: '#111215', fontFamily: 'var(--font-mono)' }}>
                    £{((p.cost || 0) * (p.qty || 1)).toFixed(2)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removePart(idx)}
                    style={{ background: 'none', border: 'none', color: '#9aa1ad', cursor: 'pointer', padding: '4px' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Completion Notes */}
      <div className="neo-card" style={{ padding: '22px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111215', margin: '0 0 10px 0' }}>
          Engineer Completion Notes
        </h3>
        <textarea
          rows={4}
          value={completionNotes}
          onChange={e => setCompletionNotes(e.target.value)}
          placeholder="Enter work completed on site, diagnostic findings, recommendations..."
          style={{
            width: '100%',
            background: '#f8f9fb',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: '12px',
            padding: '12px',
            fontSize: '13px',
            color: '#111215',
            outline: 'none',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />
        <button
          type="button"
          className="neo-btn-black"
          disabled={saving}
          style={{ width: '100%', marginTop: '14px', padding: '12px' }}
          onClick={handleSaveNotesAndParts}
        >
          {saving ? 'Saving to Database…' : 'Save Job Progress'}
        </button>
      </div>
    </div>
  )
}
