'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Building2, Briefcase, Phone, Mail, ChevronRight, User, Trash2 } from 'lucide-react'
import { CUSTOMER_TYPE_LABELS, type CustomerType } from '@/types/database'
import { useUniversalSearch } from '@/hooks/use-universal-search'
import { SearchInput, Highlight, NoResults } from '@/components/ui/search-input'
import { deleteCustomer } from './actions'
import { ConfirmModal } from '@/components/ui/confirm-modal'

export interface CustomerRow {
  id: string
  name: string
  type: CustomerType
  email: string | null
  phone: string | null
  notes: string | null
  created_at?: string
  properties?: Array<{
    id: string
    address_line1: string
    postcode: string
    city: string
  }> | { count: number }[]
  jobs?: { count: number }[]
}

interface Props {
  customers: CustomerRow[]
}

const TYPE_FILTERS: { id: string; label: string }[] = [
  { id: 'all', label: 'All Customers' },
  { id: 'homeowner', label: 'Homeowners' },
  { id: 'landlord', label: 'Landlords' },
  { id: 'letting_agent', label: 'Letting Agents' },
  { id: 'commercial', label: 'Commercial' },
  { id: 'house_association', label: 'Housing Assoc.' },
]

export function CustomersClient({ customers }: Props) {
  const router = useRouter()
  const [activeType, setActiveType] = useState('all')
  const [deleteTarget, setDeleteTarget] = useState<CustomerRow | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const handleDeleteCustomer = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      const res = await deleteCustomer(deleteTarget.id)
      if (res?.error) {
        alert(res.error)
      } else {
        setDeleteTarget(null)
        router.refresh()
      }
    } catch {
      alert('Failed to delete customer')
    } finally {
      setDeleteLoading(false)
    }
  }

  const filterPredicate = useCallback(
    (c: CustomerRow) => {
      if (activeType === 'all') return true
      return c.type === activeType
    },
    [activeType],
  )

  const {
    query,
    setQuery,
    results,
    isSearching,
    hasQuery,
    noResults,
    resultCount,
  } = useUniversalSearch<CustomerRow>({
    items: customers,
    fields: [
      { accessor: c => c.name || '', weight: 2.5 },
      { accessor: c => c.email || '', weight: 2.0 },
      { accessor: c => c.phone || '', weight: 1.8 },
      { accessor: c => c.id || '', weight: 1.0 },
      { accessor: c => c.notes || '', weight: 0.8 },
      { accessor: c => (c.type ? CUSTOMER_TYPE_LABELS[c.type] || c.type : ''), weight: 1.0 },
      {
        accessor: c => {
          if (!Array.isArray(c.properties)) return ''
          return c.properties
            .map((p: any) => `${p.address_line1 || ''} ${p.postcode || ''} ${p.city || ''}`)
            .join(' ')
        },
        weight: 1.5,
      },
    ],
    debounceMs: 200,
    filterPredicate,
  })

  const filteredCustomers = results.map(r => r.item)

  const getPropertiesCount = (c: CustomerRow): number => {
    if (!c.properties) return 0
    if (Array.isArray(c.properties)) {
      if (c.properties.length > 0 && 'count' in c.properties[0]) {
        return (c.properties[0] as any).count ?? 0
      }
      return c.properties.length
    }
    return 0
  }

  const getJobsCount = (c: CustomerRow): number => {
    if (!c.jobs || !Array.isArray(c.jobs)) return 0
    return c.jobs[0]?.count ?? 0
  }

  return (
    <div className="page-content">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">
            {filteredCustomers.length} {filteredCustomers.length === 1 ? 'client' : 'clients'} registered
          </p>
        </div>
        <Link href="/admin/customers/new" className="btn btn-primary">
          <Plus size={14} /> New Customer
        </Link>
      </div>

      {/* Real-time Universal Search Box */}
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Search by customer name, email, phone, address, postcode, ID…"
        isSearching={isSearching}
        resultCount={resultCount}
        hasQuery={hasQuery}
        style={{ marginBottom: '12px' }}
      />

      {/* Horizontal Filter Chips */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '12px',
          marginBottom: '8px',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {TYPE_FILTERS.map(tab => {
          const active = activeType === tab.id
          const count =
            tab.id === 'all'
              ? customers.length
              : customers.filter(c => c.type === tab.id).length

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveType(tab.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '99px',
                fontSize: '12px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                background: active ? 'var(--color-acid-lime)' : 'var(--surface-card)',
                color: active ? '#0b0b0b' : 'var(--color-mist)',
                boxShadow: active ? '0 2px 8px rgba(214, 254, 81, 0.25)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label} ({count})
            </button>
          )
        })}
      </div>

      {/* ─── DESKTOP TABLE VIEW ─── */}
      <div className="desktop-only table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Contact</th>
              <th>Properties</th>
              <th>Jobs</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {noResults ? (
              <tr>
                <td colSpan={6}>
                  <NoResults query={query} entityName="customers" />
                </td>
              </tr>
            ) : filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-ash)', padding: '40px' }}>
                  No customers found matching selected criteria
                </td>
              </tr>
            ) : (
              filteredCustomers.map(c => {
                const propCount = getPropertiesCount(c)
                const jobCount = getJobsCount(c)

                return (
                  <tr key={c.id}>
                    <td>
                      <Link
                        href={`/admin/customers/${c.id}`}
                        style={{ fontWeight: '600', color: 'var(--color-paper)', textDecoration: 'none' }}
                      >
                        <Highlight text={c.name} query={query} />
                      </Link>
                      {c.notes && (
                        <div
                          style={{
                            fontSize: '11px',
                            color: 'var(--color-ash)',
                            marginTop: '2px',
                            maxWidth: '260px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <Highlight text={c.notes} query={query} />
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-default">
                        {CUSTOMER_TYPE_LABELS[c.type as CustomerType] || c.type}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '13px', color: 'var(--color-fog)' }}>
                        {c.email ? <Highlight text={c.email} query={query} /> : '—'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-ash)', marginTop: '1px' }}>
                        {c.phone ? <Highlight text={c.phone} query={query} /> : ''}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                        <Building2 size={13} style={{ color: 'var(--color-fog)' }} />
                        <span>{propCount}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                        <Briefcase size={13} style={{ color: 'var(--color-fog)' }} />
                        <span>{jobCount}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Link href={`/admin/customers/${c.id}`} className="btn btn-ghost btn-sm">
                          View <ChevronRight size={12} />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(c)}
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--color-coral-red)', padding: '6px' }}
                          title="Delete customer"
                          aria-label={`Delete ${c.name}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ─── MOBILE CARD VIEW (Ultra Minimal, Native App Look) ─── */}
      <div className="mobile-only-flex" style={{ flexDirection: 'column', gap: '10px' }}>
        {noResults ? (
          <NoResults query={query} entityName="customers" />
        ) : filteredCustomers.length === 0 ? (
          <div
            style={{
              padding: '36px 16px',
              textAlign: 'center',
              background: 'var(--surface-card)',
              borderRadius: '14px',
              color: 'var(--color-fog)',
              fontSize: '13px',
            }}
          >
            No customers found
          </div>
        ) : (
          filteredCustomers.map(c => {
            const propCount = getPropertiesCount(c)
            const jobCount = getJobsCount(c)

            return (
              <Link
                key={c.id}
                href={`/admin/customers/${c.id}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  padding: '14px 16px',
                  borderRadius: '14px',
                  background: 'var(--surface-card)',
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                  textDecoration: 'none',
                  color: 'inherit',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                }}
              >
                {/* Row 1: Name and Type badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-paper)',
                        fontSize: '12px',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {c.name ? c.name[0].toUpperCase() : 'C'}
                    </div>
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: 700,
                        color: 'var(--color-paper)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      <Highlight text={c.name} query={query} />
                    </span>
                  </div>

                  <span className="badge badge-default" style={{ flexShrink: 0 }}>
                    {CUSTOMER_TYPE_LABELS[c.type as CustomerType] || c.type}
                  </span>
                </div>

                {/* Row 2: Contact info */}
                {(c.phone || c.email) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '12px', color: 'var(--color-mist)' }}>
                    {c.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Phone size={12} style={{ color: 'var(--color-fog)' }} />
                        <span><Highlight text={c.phone} query={query} /></span>
                      </div>
                    )}
                    {c.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Mail size={12} style={{ color: 'var(--color-fog)' }} />
                        <span><Highlight text={c.email} query={query} /></span>
                      </div>
                    )}
                  </div>
                )}

                {/* Row 3: Properties and Jobs counts */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '11px',
                    color: 'var(--color-fog)',
                    paddingTop: '6px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Building2 size={12} /> {propCount} {propCount === 1 ? 'property' : 'properties'}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Briefcase size={12} /> {jobCount} {jobCount === 1 ? 'job' : 'jobs'}
                  </span>
                </div>
              </Link>
            )
          })
        )}
      </div>

      {deleteTarget && (
        <ConfirmModal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteCustomer}
          title="Delete Customer"
          message={`Are you sure you want to delete ${deleteTarget.name}? This will permanently delete this customer along with all their linked properties, jobs, invoices, and records.`}
          confirmText="Confirm Delete"
          loading={deleteLoading}
        />
      )}
    </div>
  )
}
