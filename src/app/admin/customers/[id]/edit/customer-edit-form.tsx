'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { updateCustomer, deleteCustomer } from '../../actions'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { CUSTOMER_TYPE_LABELS, type CustomerType } from '@/types/database'
import { Trash2 } from 'lucide-react'

interface CustomerEditFormProps {
  customer: {
    id: string
    name: string
    type: string
    email: string | null
    phone: string | null
    notes: string | null
  }
}

export function CustomerEditForm({ customer }: CustomerEditFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [error, setError] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const result = await updateCustomer(customer.id, formData)
    setLoading(false)

    if (result.error) {
      setError(result.error)
    } else {
      router.push(`/admin/customers/${customer.id}`)
      router.refresh()
    }
  }

  async function handleDelete() {
    setError('')
    setDeleteLoading(true)
    const result = await deleteCustomer(customer.id)
    setDeleteLoading(false)

    if (result.error) {
      setShowDeleteModal(false)
      setError(result.error)
    } else {
      setShowDeleteModal(false)
      router.push('/admin/customers')
      router.refresh()
    }
  }

  return (
    <>
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
            <div>
              <label className="label" htmlFor="name">
                Customer Name *
              </label>
              <input
                id="name"
                name="name"
                defaultValue={customer.name}
                className="input"
                required
              />
            </div>

            <div>
              <label className="label" htmlFor="type">
                Customer Type *
              </label>
              <select
                id="type"
                name="type"
                defaultValue={customer.type}
                className="select"
                required
              >
                {Object.entries(CUSTOMER_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                defaultValue={customer.email ?? ''}
                className="input"
                placeholder="name@example.com"
              />
            </div>

            <div>
              <label className="label" htmlFor="phone">
                Phone Number
              </label>
              <input
                id="phone"
                name="phone"
                defaultValue={customer.phone ?? ''}
                className="input"
                placeholder="07700 900000"
              />
            </div>

            <div>
              <label className="label" htmlFor="notes">
                Account Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                defaultValue={customer.notes ?? ''}
                className="input"
                rows={4}
                placeholder="Special billing instructions, gate codes, etc."
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
                <Trash2 size={14} /> Delete Customer
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <Link href={`/admin/customers/${customer.id}`} className="btn btn-ghost">
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
        title="Delete Customer"
        message={`Are you sure you want to delete ${customer.name}? This will permanently remove this customer along with all their linked properties, jobs, and records.`}
        confirmText="Confirm Delete"
        loading={deleteLoading}
      />
    </>
  )
}
