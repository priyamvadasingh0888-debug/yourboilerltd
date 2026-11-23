'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { updateProperty, deleteProperty } from '../../actions'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { PROPERTY_TYPE_LABELS, type PropertyType } from '@/types/database'
import { Trash2 } from 'lucide-react'

interface PropertyEditFormProps {
  property: {
    id: string
    customer_id: string
    address_line1: string
    address_line2: string | null
    city: string
    postcode: string
    type: string
    notes: string | null
    customer?: { name: string } | null
  }
}

export function PropertyEditForm({ property }: PropertyEditFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [error, setError] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const result = await updateProperty(property.id, {
      address_line1: form.get('address_line1') as string,
      address_line2: (form.get('address_line2') as string) || null,
      city: form.get('city') as string,
      postcode: form.get('postcode') as string,
      type: form.get('type') as PropertyType,
      notes: (form.get('notes') as string) || null,
    })
    setLoading(false)

    if (result.error) {
      setError(result.error)
    } else {
      router.push(`/admin/properties/${property.id}`)
      router.refresh()
    }
  }

  async function handleDelete() {
    setError('')
    setDeleteLoading(true)
    const result = await deleteProperty(property.id)
    setDeleteLoading(false)

    if (result.error) {
      setShowDeleteModal(false)
      setError(result.error)
    } else {
      setShowDeleteModal(false)
      router.push('/admin/properties')
      router.refresh()
    }
  }

  return (
    <>
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
            <div>
              <label className="label">Client Account</label>
              <div
                style={{
                  padding: '10px 12px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '14px',
                  color: 'var(--color-paper)',
                  fontWeight: 600,
                }}
              >
                {property.customer?.name ?? 'Assigned Customer'}
              </div>
            </div>

            <div>
              <label className="label" htmlFor="address_line1">
                Address Line 1 *
              </label>
              <input
                id="address_line1"
                name="address_line1"
                defaultValue={property.address_line1}
                className="input"
                required
              />
            </div>

            <div>
              <label className="label" htmlFor="address_line2">
                Address Line 2
              </label>
              <input
                id="address_line2"
                name="address_line2"
                defaultValue={property.address_line2 ?? ''}
                className="input"
                placeholder="Flat / Suite / Building"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-3)' }}>
              <div>
                <label className="label" htmlFor="city">
                  City / Town *
                </label>
                <input
                  id="city"
                  name="city"
                  defaultValue={property.city}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="label" htmlFor="postcode">
                  Postcode *
                </label>
                <input
                  id="postcode"
                  name="postcode"
                  defaultValue={property.postcode}
                  className="input"
                  style={{ textTransform: 'uppercase' }}
                  required
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="type">
                Property Type *
              </label>
              <select
                id="type"
                name="type"
                defaultValue={property.type}
                className="select"
                required
              >
                {Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="notes">
                Access & Site Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                defaultValue={property.notes ?? ''}
                className="input"
                rows={4}
                placeholder="Key safe code, meter location, parking instructions..."
                style={{ resize: 'vertical' }}
              />
            </div>

            {error && (
              <div
                style={{
                  padding: '10px 14px',
                  background: 'rgba(235, 87, 87, 0.1)',
                  border: '1px solid rgba(235, 87, 87, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-coral-red)',
                  fontSize: '13px',
                }}
              >
                {error}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '8px',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="btn btn-ghost"
                style={{ color: 'var(--color-coral-red)', gap: '6px' }}
              >
                <Trash2 size={14} /> Delete Property
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <Link href={`/admin/properties/${property.id}`} className="btn btn-ghost">
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
        title="Delete Property"
        message={`Are you sure you want to delete ${property.address_line1}? This will remove the property and its associated service records.`}
        confirmText="Confirm Delete"
        loading={deleteLoading}
      />
    </>
  )
}
