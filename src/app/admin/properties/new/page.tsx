'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PROPERTY_TYPE_LABELS } from '@/types/database'

function NewPropertyForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefillCustomerId = searchParams.get('customer_id') || ''

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [customerId, setCustomerId] = useState(prefillCustomerId)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const addressLine1 = form.get('address_line1') as string
    const addressLine2 = form.get('address_line2') as string
    const city = form.get('city') as string
    const postcode = form.get('postcode') as string
    const type = form.get('type') as string
    const notes = form.get('notes') as string

    if (!addressLine1.trim() || !city.trim() || !postcode.trim()) {
      setError('Address, city and postcode are required')
      setLoading(false)
      return
    }

    if (!customerId) {
      setError('Customer is required')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { data, error: dbError } = await supabase
      .from('properties')
      .insert({
        customer_id: customerId,
        address_line1: addressLine1.trim(),
        address_line2: addressLine2.trim() || null,
        city: city.trim(),
        postcode: postcode.trim().toUpperCase(),
        type,
        notes: notes.trim() || null,
      })
      .select()
      .single()

    if (dbError) {
      setError(dbError.message)
      setLoading(false)
      return
    }

    if (prefillCustomerId) {
      router.push(`/admin/customers/${prefillCustomerId}`)
    } else {
      router.push(`/admin/properties/${data.id}`)
    }
  }

  return (
    <div className="page-content">
      <Link
        href={
          prefillCustomerId
            ? `/admin/customers/${prefillCustomerId}`
            : '/admin/properties'
        }
        className="btn btn-ghost btn-sm"
        style={{ marginBottom: 'var(--spacing-4)' }}
      >
        <ArrowLeft size={14} /> Back
      </Link>

      <div className="page-header">
        <h1 className="page-title">Add Property</h1>
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
            {!prefillCustomerId && (
              <div>
                <label className="label" htmlFor="customer_id">
                  Customer ID *
                </label>
                <input
                  id="customer_id"
                  className="input"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  placeholder="Customer UUID"
                  required
                />
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--color-ash)',
                    marginTop: '4px',
                  }}
                >
                  Tip: add properties from a customer's detail page for auto-fill
                </div>
              </div>
            )}

            <div>
              <label className="label" htmlFor="address_line1">
                Address Line 1 *
              </label>
              <input
                id="address_line1"
                name="address_line1"
                className="input"
                placeholder="e.g. 14 Bramble Lane"
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
                className="input"
                placeholder="e.g. Flat 2"
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 'var(--spacing-3)',
              }}
            >
              <div>
                <label className="label" htmlFor="city">
                  City *
                </label>
                <input
                  id="city"
                  name="city"
                  className="input"
                  placeholder="Manchester"
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
                  className="input"
                  placeholder="M14 5QW"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="type">
                Property Type
              </label>
              <select id="type" name="type" className="select">
                {Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
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
                placeholder="e.g. Combi boiler, access via side gate..."
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
              <Link
                href={
                  prefillCustomerId
                    ? `/admin/customers/${prefillCustomerId}`
                    : '/admin/properties'
                }
                className="btn btn-ghost"
              >
                Cancel
              </Link>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Adding…' : 'Add Property'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function NewPropertyPage() {
  return (
    <Suspense fallback={<div className="page-content" style={{ maxWidth: '600px', padding: '24px' }}>Loading...</div>}>
      <NewPropertyForm />
    </Suspense>
  )
}
