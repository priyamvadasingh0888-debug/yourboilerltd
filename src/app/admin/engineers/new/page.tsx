'use client'

import { useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Eye, EyeOff, Lock, Search, X, Check, Shield, Wrench, Award } from 'lucide-react'
import { JOB_TYPE_LABELS, type EngineerCategory } from '@/types/database'

const SCHEDULE_COLOURS = [
  '#6366f1', '#27a644', '#e4f222', '#ef4444', '#f59e0b',
  '#06b6d4', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316',
]

const STANDARD_QUALIFICATIONS = [
  { id: 'CCN1', label: 'CCN1 (Core Gas Safety)' },
  { id: 'CENWAT', label: 'CENWAT (Boilers & Water Heaters)' },
  { id: 'CKR1', label: 'CKR1 (Domestic Cookers)' },
  { id: 'HTR1', label: 'HTR1 (Fires & Heaters)' },
  { id: 'CPA1', label: 'CPA1 (Combustion Analysis)' },
  { id: 'MET1', label: 'MET1 (Gas Meters)' },
  { id: '18th_edition', label: '18th Edition Electrical' },
  { id: 'unvented_cylinders', label: 'G3 Unvented Cylinders' },
]

// All specialties derived from job types
const ALL_SPECIALTIES = Object.entries(JOB_TYPE_LABELS).map(
  ([value, label]) => ({ value, label })
)

// ── Sanitise a plain text string (strip HTML/script injection attempts) ──────
function sanitise(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return raw.replace(/[<>"'`]/g, '').trim()
}

export default function NewEngineerPage() {
  const router = useRouter()
  const [loading, setLoading]                 = useState(false)
  const [error, setError]                     = useState('')
  const [selectedColour, setSelectedColour]   = useState(SCHEDULE_COLOURS[0])
  const [category, setCategory]               = useState<EngineerCategory>('in_house')
  const [qualifications, setQualifications]   = useState<string[]>([])
  const [specialties, setSpecialties]         = useState<string[]>([])
  const [specSearch, setSpecSearch]           = useState('')
  const [showPassword, setShowPassword]       = useState(false)
  const specInputRef = useRef<HTMLInputElement>(null)

  // Client-side filtered specialties — instant, no network
  const filteredSpecialties = useMemo(() => {
    const q = specSearch.toLowerCase().trim()
    if (!q) return ALL_SPECIALTIES
    return ALL_SPECIALTIES.filter(s => s.label.toLowerCase().includes(q))
  }, [specSearch])

  function toggleSpecialty(value: string) {
    setSpecialties(prev =>
      prev.includes(value) ? prev.filter(s => s !== value) : [...prev, value]
    )
  }

  function removeSpecialty(value: string) {
    setSpecialties(prev => prev.filter(s => s !== value))
  }

  function toggleQualification(id: string) {
    setQualifications(prev =>
      prev.includes(id) ? prev.filter(q => q !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const form = new FormData(e.currentTarget)

    // Sanitise all string inputs before sending
    const fullName       = sanitise(form.get('full_name') as string)
    const email          = sanitise(form.get('email') as string)
    const password       = form.get('password') as string
    const phone          = sanitise(form.get('phone') as string)
    const licenseNumber  = sanitise(form.get('license_number') as string)
    const gasSafeNumber  = sanitise(form.get('gas_safe_number') as string)
    const gasSafeExpiry  = form.get('gas_safe_expiry') as string

    if (!fullName || !email) {
      setError('Name and email are required.')
      setLoading(false)
      return
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.')
      setLoading(false)
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.')
      setLoading(false)
      return
    }

    const res = await fetch('/api/admin/create-engineer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: fullName,
        email,
        password,
        phone: phone || null,
        category,
        licenseNumber: licenseNumber || gasSafeNumber || null,
        gasSafeNumber: gasSafeNumber || licenseNumber || null,
        gasSafeExpiry: gasSafeExpiry || null,
        qualifications,
        specialties,
        scheduleColour: selectedColour,
      }),
    })

    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? 'Failed to create engineer.')
      setLoading(false)
      return
    }

    router.push('/admin/engineers')
  }

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Back + header */}
      <div style={{ width: '100%', maxWidth: '640px' }}>
        <Link href="/admin/engineers" className="btn btn-ghost btn-sm" style={{ marginBottom: 'var(--spacing-4)' }}>
          <ArrowLeft size={14} /> Back to Engineers
        </Link>

        <div className="page-header" style={{ marginBottom: 'var(--spacing-5)' }}>
          <div>
            <h1 className="page-title">Add Engineer</h1>
            <p className="page-subtitle">Create a login account and engineer operative profile in one step.</p>
          </div>
        </div>
      </div>

      {/* Form card */}
      <div className="card" style={{ width: '100%', maxWidth: '640px' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-5)' }}>

            {/* Employment Category */}
            <div>
              <label className="label">Employment Category</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-3)', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => setCategory('in_house')}
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    border: category === 'in_house' ? '1.5px solid var(--color-acid-lime)' : '1px solid var(--border-subtle)',
                    background: category === 'in_house' ? 'rgba(212, 250, 53, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    color: category === 'in_house' ? 'var(--color-acid-lime)' : 'var(--color-fog)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <Shield size={16} /> In-House Operative
                </button>
                <button
                  type="button"
                  onClick={() => setCategory('subcontractor')}
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    border: category === 'subcontractor' ? '1.5px solid var(--color-acid-lime)' : '1px solid var(--border-subtle)',
                    background: category === 'subcontractor' ? 'rgba(212, 250, 53, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    color: category === 'subcontractor' ? 'var(--color-acid-lime)' : 'var(--color-fog)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <Wrench size={16} /> Subcontractor
                </button>
              </div>
            </div>

            {/* LOGIN CREDENTIALS */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 'var(--radius-lg)',
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-4)',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '4px' }}>
                  <Lock size={12} style={{ color: 'var(--color-fog)' }} />
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-fog)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    Login Credentials
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--color-ash)', margin: 0 }}>
                  The engineer uses these to sign in to the engineer terminal.
                </p>
              </div>

              <div>
                <label className="label" htmlFor="email">Email *</label>
                <input id="email" name="email" type="email" className="input" placeholder="engineer@company.co.uk" required autoComplete="off" />
              </div>

              <div>
                <label className="label" htmlFor="password">Initial Password *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    className="input"
                    placeholder="Min. 6 characters"
                    style={{ paddingRight: '44px' }}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-fog)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            </div>

            {/* PROFILE DETAILS */}
            <div>
              <label className="label" htmlFor="full_name">Full Name *</label>
              <input id="full_name" name="full_name" className="input" placeholder="Operative full name" required />
            </div>

            <div>
              <label className="label" htmlFor="phone">Phone</label>
              <input id="phone" name="phone" className="input" placeholder="07700 900000" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-3)' }}>
              <div>
                <label className="label" htmlFor="license_number">License / Gas Safe Number</label>
                <input id="license_number" name="license_number" className="input" placeholder="e.g. GS123456 / LIC-789" />
              </div>
              <div>
                <label className="label" htmlFor="gas_safe_expiry">License Expiry Date</label>
                <input id="gas_safe_expiry" name="gas_safe_expiry" type="date" className="input" />
              </div>
            </div>

            {/* Certified Qualifications Matrix */}
            <div>
              <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Award size={14} /> Certified Qualifications
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                {STANDARD_QUALIFICATIONS.map(q => {
                  const active = qualifications.includes(q.id)
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => toggleQualification(q.id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '99px',
                        fontSize: '12px',
                        fontWeight: 500,
                        border: active ? '1.5px solid var(--color-acid-lime)' : '1px solid var(--border-subtle)',
                        background: active ? 'rgba(212, 250, 53, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                        color: active ? 'var(--color-acid-lime)' : 'var(--color-fog)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {active && <Check size={12} strokeWidth={3} />}
                      {q.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* SCHEDULE COLOUR */}
            <div>
              <label className="label">Schedule Colour</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                {SCHEDULE_COLOURS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedColour(c)}
                    title={c}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: c,
                      border: selectedColour === c ? '2px solid var(--color-paper)' : '2px solid transparent',
                      cursor: 'pointer',
                      outline: selectedColour === c ? '2px solid var(--color-acid-lime)' : 'none',
                      outlineOffset: '2px',
                      transition: 'all 0.15s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {selectedColour === c && <Check size={14} color="#fff" strokeWidth={3} />}
                  </button>
                ))}
              </div>
            </div>

            {/* SPECIALTIES */}
            <div>
              <label className="label" style={{ marginBottom: '8px', display: 'block' }}>Specialties</label>

              {/* Selected chips */}
              {specialties.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                  {specialties.map(val => {
                    const label = JOB_TYPE_LABELS[val as keyof typeof JOB_TYPE_LABELS] ?? val
                    return (
                      <span
                        key={val}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '4px 10px',
                          borderRadius: '99px',
                          fontSize: '12px',
                          fontWeight: 600,
                          background: 'var(--color-acid-lime, #d4fa35)',
                          color: '#111215',
                          cursor: 'default',
                        }}
                      >
                        {label}
                        <button
                          type="button"
                          onClick={() => removeSpecialty(val)}
                          style={{ background: 'none', border: 'none', padding: '0 0 0 2px', cursor: 'pointer', lineHeight: 1, display: 'flex', alignItems: 'center' }}
                          aria-label={`Remove ${label}`}
                        >
                          <X size={11} strokeWidth={2.5} color="#111215" />
                        </button>
                      </span>
                    )
                  })}
                </div>
              )}

              {/* Search box */}
              <div style={{ position: 'relative', marginBottom: '8px' }}>
                <Search size={13} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-ash)', pointerEvents: 'none' }} />
                <input
                  ref={specInputRef}
                  type="text"
                  placeholder="Search specialties…"
                  value={specSearch}
                  onChange={e => setSpecSearch(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    borderRadius: '8px',
                    padding: '8px 12px 8px 34px',
                    fontSize: '12px',
                    color: 'var(--color-paper)',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  autoComplete="off"
                />
                {specSearch && (
                  <button
                    type="button"
                    onClick={() => { setSpecSearch(''); specInputRef.current?.focus() }}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', color: 'var(--color-ash)' }}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Specialty chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {filteredSpecialties.length === 0 && (
                  <p style={{ fontSize: '12px', color: 'var(--color-ash)', margin: 0 }}>No specialties match &ldquo;{specSearch}&rdquo;</p>
                )}
                {filteredSpecialties.map(opt => {
                  const selected = specialties.includes(opt.value)
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleSpecialty(opt.value)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '6px 12px',
                        borderRadius: '99px',
                        fontSize: '12px',
                        fontWeight: selected ? 600 : 500,
                        border: selected ? '1.5px solid var(--color-acid-lime, #d4fa35)' : '1px solid rgba(255,255,255,0.12)',
                        background: selected ? 'rgba(212,250,53,0.12)' : 'rgba(255,255,255,0.03)',
                        color: selected ? 'var(--color-acid-lime, #d4fa35)' : 'var(--color-fog)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {selected && <Check size={11} strokeWidth={3} />}
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ERROR */}
            {error && (
              <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', color: 'var(--color-coral-red)', fontSize: '13px' }}>
                {error}
              </div>
            )}

            {/* ACTIONS */}
            <div style={{ display: 'flex', gap: 'var(--spacing-2)', justifyContent: 'flex-end', paddingTop: '4px' }}>
              <Link href="/admin/engineers" className="btn btn-ghost">Cancel</Link>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Creating…' : 'Create Engineer'}
              </button>
            </div>

          </div>
        </form>
      </div>
    </div>
  )
}
