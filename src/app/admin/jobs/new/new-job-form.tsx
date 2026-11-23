'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createJob } from '../actions'
import { AlertTriangle, CheckCircle2, Sun, Moon, Clock } from 'lucide-react'
import type { ScheduleTimeSlot } from '@/types/database'

interface Props {
  customers: any[]
  engineers: any[]
  prefillCustomerId?: string
  prefillPropertyId?: string
}

const JOB_TYPES = [
  { value: 'boiler_installation', label: 'Boiler Installation' },
  { value: 'boiler_repair', label: 'Boiler Repair' },
  { value: 'gas_safety_check', label: 'Gas Safety Check' },
  { value: 'annual_service', label: 'Annual Service' },
  { value: 'central_heating', label: 'Central Heating' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'emergency_callout', label: 'Emergency Callout' },
  { value: 'other', label: 'Other' },
]

export function NewJobForm({ customers, engineers, prefillCustomerId, prefillPropertyId }: Props) {
  const router = useRouter()
  const [customerId, setCustomerId] = useState(prefillCustomerId ?? '')
  const [propertyId, setPropertyId] = useState(prefillPropertyId ?? '')
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const [pendingData, setPendingData] = useState<FormData | null>(null)
  const [timeSlot, setTimeSlot] = useState<ScheduleTimeSlot>('morning')

  useEffect(() => {
    if (!customerId) {
      setProperties([])
      setPropertyId('')
      return
    }
    const supabase = createClient()
    supabase
      .from('properties')
      .select('id, address_line1, address_line2, city, postcode')
      .eq('customer_id', customerId)
      .order('address_line1')
      .then(({ data }: { data: any }) => {
        setProperties(data ?? [])
        if (prefillPropertyId) setPropertyId(prefillPropertyId)
      })
  }, [customerId])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setWarning('')
    setLoading(true)

    const fd = new FormData(e.currentTarget)
    fd.set('customer_id', customerId)
    fd.set('property_id', propertyId)

    const result = await createJob(fd)
    setLoading(false)

    if (result?.error) {
      setError(result.error)
    } else if (result?.warning) {
      setWarning(result.warning)
      setPendingData(fd)
    } else if (result?.jobId) {
      router.push(`/admin/jobs/${result.jobId}`)
    }
  }

  async function confirmWithWarning() {
    if (!pendingData) return
    setLoading(true)
    setWarning('')
    // Proceed without double-booking check (warning already shown)
    // For real implementation, add a force flag
    setLoading(false)
    setError('Please adjust the schedule to avoid conflicts, or assign a different engineer.')
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-5)' }}>
      {error && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '10px 12px', background: 'rgba(235,87,87,0.1)', border: '1px solid rgba(235,87,87,0.2)', borderRadius: 'var(--radius-md)', fontSize: '13px', color: 'var(--color-coral-red)' }}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {warning && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 12px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 'var(--radius-md)', fontSize: '13px', color: '#fbbf24' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <AlertTriangle size={14} /> {warning}
          </div>
        </div>
      )}

      {/* Customer */}
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label" htmlFor="customer_id">Customer *</label>
          <select
            id="customer_id"
            className="select"
            value={customerId}
            onChange={e => { setCustomerId(e.target.value); setPropertyId('') }}
            required
          >
            <option value="">Select customer…</option>
            {customers.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="property_id">Property *</label>
          <select
            id="property_id"
            className="select"
            value={propertyId}
            onChange={e => setPropertyId(e.target.value)}
            required
            disabled={!customerId}
          >
            <option value="">Select property…</option>
            {properties.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.address_line1}{p.address_line2 ? `, ${p.address_line2}` : ''} · {p.postcode}
              </option>
            ))}
          </select>
          {customerId && properties.length === 0 && (
            <span className="form-hint">No properties. <a href={`/admin/customers/${customerId}`} style={{ color: 'var(--color-acid-lime)' }}>Add one →</a></span>
          )}
        </div>
      </div>

      {/* Job Type & Priority */}
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label" htmlFor="job_type">Job Type *</label>
          <select id="job_type" name="job_type" className="select" required>
            {JOB_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="priority">Priority</label>
          <select id="priority" name="priority" className="select" defaultValue="medium">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="emergency">Emergency</option>
          </select>
        </div>
      </div>

      {/* Engineer & Time Slot Window */}
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label" htmlFor="engineer_id">Assign Engineer</label>
          <select id="engineer_id" name="engineer_id" className="select">
            <option value="">Unassigned</option>
            {engineers.map((e: any) => {
              const isExpired = e.gas_safe_expiry && new Date(e.gas_safe_expiry) < new Date()
              return (
                <option key={e.id} value={e.id} disabled={isExpired}>
                  {e.profile?.full_name}{isExpired ? ' (Gas Safe expired)' : ''}
                </option>
              )
            })}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Arrival Window Slot</label>
          <input type="hidden" name="time_slot" value={timeSlot} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setTimeSlot('morning')}
              style={{
                padding: '8px 4px',
                borderRadius: '8px',
                border: timeSlot === 'morning' ? '2px solid #d4fa35' : '1px solid rgba(255, 255, 255, 0.1)',
                background: timeSlot === 'morning' ? 'rgba(212, 250, 53, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                color: timeSlot === 'morning' ? '#ffffff' : 'var(--color-fog)',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              <Sun size={14} style={{ color: timeSlot === 'morning' ? '#d4fa35' : 'inherit', margin: '0 auto 2px auto' }} />
              <div>Morning</div>
              <div style={{ fontSize: '9px', opacity: 0.7 }}>08:00–12:00</div>
            </button>

            <button
              type="button"
              onClick={() => setTimeSlot('afternoon')}
              style={{
                padding: '8px 4px',
                borderRadius: '8px',
                border: timeSlot === 'afternoon' ? '2px solid #d4fa35' : '1px solid rgba(255, 255, 255, 0.1)',
                background: timeSlot === 'afternoon' ? 'rgba(212, 250, 53, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                color: timeSlot === 'afternoon' ? '#ffffff' : 'var(--color-fog)',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              <Clock size={14} style={{ color: timeSlot === 'afternoon' ? '#d4fa35' : 'inherit', margin: '0 auto 2px auto' }} />
              <div>Afternoon</div>
              <div style={{ fontSize: '9px', opacity: 0.7 }}>12:00–16:00</div>
            </button>

            <button
              type="button"
              onClick={() => setTimeSlot('evening')}
              style={{
                padding: '8px 4px',
                borderRadius: '8px',
                border: timeSlot === 'evening' ? '2px solid #d4fa35' : '1px solid rgba(255, 255, 255, 0.1)',
                background: timeSlot === 'evening' ? 'rgba(212, 250, 53, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                color: timeSlot === 'evening' ? '#ffffff' : 'var(--color-fog)',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              <Moon size={14} style={{ color: timeSlot === 'evening' ? '#d4fa35' : 'inherit', margin: '0 auto 2px auto' }} />
              <div>Evening</div>
              <div style={{ fontSize: '9px', opacity: 0.7 }}>16:00–20:00</div>
            </button>
          </div>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="scheduled_start">Target Date &amp; Time</label>
        <input
          id="scheduled_start"
          name="scheduled_start"
          type="datetime-local"
          className="input"
        />
      </div>

      {/* Duration & Quoted Amount */}
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label" htmlFor="duration_minutes">Duration (minutes)</label>
          <input
            id="duration_minutes"
            name="duration_minutes"
            type="number"
            className="input"
            defaultValue={60}
            min={15}
            max={1440}
            step={15}
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="quoted_amount">Quoted Amount (£)</label>
          <input
            id="quoted_amount"
            name="quoted_amount"
            type="number"
            className="input"
            placeholder="0.00"
            min={0}
            step={0.01}
          />
        </div>
      </div>

      {/* Description */}
      <div className="form-group">
        <label className="form-label" htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          className="textarea"
          placeholder="Describe the job…"
          rows={4}
        />
      </div>

      {/* Submit */}
      <div style={{ display: 'flex', gap: 'var(--spacing-2)', justifyContent: 'flex-end', paddingTop: 'var(--spacing-2)' }}>
        <button type="button" className="btn btn-ghost" onClick={() => router.back()}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? <><span className="spinner" /> Creating…</> : 'Create Job'}
        </button>
      </div>
    </form>
  )
}
