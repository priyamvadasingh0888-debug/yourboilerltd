'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createCustomer } from '../actions'
import { CUSTOMER_TYPE_LABELS } from '@/types/database'

export default function NewCustomerPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const result = await createCustomer(form)
    setLoading(false)

    if (result.error) {
      setError(result.error)
      return
    }

    if (result.customerId) {
      router.push(`/admin/customers/${result.customerId}`)
    }
  }

  return (
    <div className="page-content">
      <Link
        href="/admin/customers"
        className="btn btn-ghost btn-sm"
        style={{ marginBottom: 'var(--spacing-4)' }}
      >
        <ArrowLeft size={14} /> Back to Customers
      </Link>

      <div className="page-header">
        <h1 className="page-title">New Customer</h1>
      </div>

      <div className="card" style={{ maxWidth: '600px' }}>
        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-4)',
            }}
          >
            <div>
              <label className="label" htmlFor="name">
                Customer Name *
              </label>
              <input
                id="name"
                name="name"
                className="input"
                placeholder="e.g. John Smith"
                required
              />
            </div>

            <div>
              <label className="label" htmlFor="type">
                Customer Type
              </label>
              <select id="type" name="type" className="select">
                {Object.entries(CUSTOMER_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="input"
                placeholder="customer@example.com"
              />
            </div>

            <div>
              <label className="label" htmlFor="phone">
                Phone
              </label>
              <input
                id="phone"
                name="phone"
                className="input"
                placeholder="07700 900000"
              />
            </div>

            <div>
              <label className="label" htmlFor="notes">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                className="input"
                rows={3}
                placeholder="Additional notes..."
                style={{ resize: 'vertical' }}
              />
            </div>

            {error && (
              <div
                style={{
                  padding: '10px 14px',
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
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
                gap: 'var(--spacing-2)',
                justifyContent: 'flex-end',
              }}
            >
              <Link href="/admin/customers" className="btn btn-ghost">
                Cancel
              </Link>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Creating…' : 'Create Customer'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
