'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { updateEngineer, deleteEngineer } from '../../actions'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { JOB_TYPE_LABELS, type AvailabilityStatus, type EngineerCategory } from '@/types/database'
import { Trash2, Check, Shield, Wrench, Award } from 'lucide-react'

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

interface EngineerEditFormProps {
  engineer: {
    id: string
    gas_safe_number: string | null
    gas_safe_expiry: string | null
    license_number?: string | null
    category?: EngineerCategory | null
    qualifications?: string[] | null
    phone: string | null
    specialties: string[]
    availability_status: string
    schedule_colour: string
    profile?: {
      full_name: string | null
      email: string | null
      phone: string | null
    } | null
  }
}

export function EngineerEditForm({ engineer }: EngineerEditFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [error, setError] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedColour, setSelectedColour] = useState(engineer.schedule_colour || SCHEDULE_COLOURS[0])
  const [specialties, setSpecialties] = useState<string[]>(engineer.specialties || [])
  const [category, setCategory] = useState<'in_house' | 'subcontractor'>(engineer.category || 'in_house')
  const [qualifications, setQualifications] = useState<string[]>(engineer.qualifications || [])

  function toggleSpecialty(value: string) {
    setSpecialties(prev =>
      prev.includes(value) ? prev.filter(s => s !== value) : [...prev, value]
    )
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
    const result = await updateEngineer(engineer.id, {
      full_name: form.get('full_name') as string,
      phone: (form.get('phone') as string) || null,
      gas_safe_number: (form.get('gas_safe_number') as string) || null,
      license_number: (form.get('license_number') as string) || (form.get('gas_safe_number') as string) || null,
      gas_safe_expiry: (form.get('gas_safe_expiry') as string) || null,
      availability_status: form.get('availability_status') as AvailabilityStatus,
      schedule_colour: selectedColour,
      category,
      qualifications,
      specialties,
    })
    setLoading(false)

    if (result.error) {
      setError(result.error)
    } else {
      router.push(`/admin/engineers/${engineer.id}`)
      router.refresh()
    }
  }

  async function handleDelete() {
    setError('')
    setDeleteLoading(true)
    const result = await deleteEngineer(engineer.id)
    setDeleteLoading(false)

    if (result.error) {
      setShowDeleteModal(false)
      setError(result.error)
    } else {
      setShowDeleteModal(false)
      router.push('/admin/engineers')
      router.refresh()
    }
  }

  return (
    <>
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
            <div>
              <label className="label" htmlFor="full_name">
                Full Name *
              </label>
              <input
                id="full_name"
                name="full_name"
                defaultValue={engineer.profile?.full_name ?? ''}
                className="input"
                required
              />
            </div>

            {/* Category: In-House vs Subcontractor */}
            <div>
              <label className="label">Operative Category *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setCategory('in_house')}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    border: category === 'in_house' ? '2px solid #6366f1' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: category === 'in_house' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    color: category === 'in_house' ? '#a5b4fc' : 'var(--color-fog)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <Shield size={16} /> In-House Staff
                </button>

                <button
                  type="button"
                  onClick={() => setCategory('subcontractor')}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    border: category === 'subcontractor' ? '2px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: category === 'subcontractor' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    color: category === 'subcontractor' ? '#fbbf24' : 'var(--color-fog)',
                    fontWeight: 600,
                    cursor: 'pointer',
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

            <div>
              <label className="label">Login Email</label>
              <div
                style={{
                  padding: '10px 12px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '13px',
                  color: 'var(--color-fog)',
                }}
              >
                {engineer.profile?.email} (Auth account email)
              </div>
            </div>

            <div>
              <label className="label" htmlFor="phone">
                Phone Number
              </label>
              <input
                id="phone"
                name="phone"
                defaultValue={engineer.phone ?? engineer.profile?.phone ?? ''}
                className="input"
                placeholder="07700 900000"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-3)' }}>
              <div>
                <label className="label" htmlFor="gas_safe_number">
                  Gas Safe / License No
                </label>
                <input
                  id="gas_safe_number"
                  name="gas_safe_number"
                  defaultValue={engineer.gas_safe_number ?? engineer.license_number ?? ''}
                  className="input"
                  placeholder="e.g. 198745 or GS123456"
                />
              </div>

              <div>
                <label className="label" htmlFor="gas_safe_expiry">
                  License Expiry Date
                </label>
                <input
                  id="gas_safe_expiry"
                  name="gas_safe_expiry"
                  type="date"
                  defaultValue={engineer.gas_safe_expiry ?? ''}
                  className="input"
                />
              </div>
            </div>

            {/* Qualifications Matrix */}
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
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: active ? '1px solid #d4fa35' : '1px solid rgba(255, 255, 255, 0.1)',
                        background: active ? 'rgba(212, 250, 53, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                        color: active ? '#ffffff' : 'var(--color-fog)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {active && <Check size={12} color="#d4fa35" strokeWidth={3} />}
                      {q.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="label" htmlFor="availability_status">
                Availability Status
              </label>
              <select
                id="availability_status"
                name="availability_status"
                defaultValue={engineer.availability_status}
                className="select"
              >
                <option value="available">Available</option>
                <option value="on_job">On Job (Auto-managed or Manual)</option>
                <option value="off_duty">Off Duty</option>
              </select>
            </div>

            {/* Schedule Colour */}
            <div>
              <label className="label">Schedule Colour Marker</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                {SCHEDULE_COLOURS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedColour(c)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: c,
                      border: selectedColour === c ? '2px solid #fff' : '2px solid transparent',
                      cursor: 'pointer',
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

            {/* Specialties */}
            <div>
              <label className="label">Job Specialties</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                {Object.entries(JOB_TYPE_LABELS).map(([value, label]) => {
                  const isSelected = specialties.includes(value)
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleSpecialty(value)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '12px',
                        border: isSelected ? '1px solid var(--color-fey-signal)' : '1px solid var(--border-subtle)',
                        background: isSelected ? 'rgba(212, 250, 53, 0.1)' : 'transparent',
                        color: isSelected ? 'var(--color-paper)' : 'var(--color-fog)',
                        cursor: 'pointer',
                      }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            {error && (
              <div className="alert alert-error" style={{ fontSize: '13px' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--spacing-4)' }}>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="btn btn-ghost"
                style={{ color: 'var(--color-coral-red)' }}
              >
                <Trash2 size={14} /> Delete Engineer
              </button>

              <div style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
                <Link href={`/admin/engineers/${engineer.id}`} className="btn btn-ghost">
                  Cancel
                </Link>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Engineer"
        message={`Are you sure you want to delete ${engineer.profile?.full_name}? They will no longer be assignable to jobs.`}
        confirmText="Confirm Delete"
        loading={deleteLoading}
      />
    </>
  )
}
