'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, MapPin, Building2, Briefcase, FileText, ChevronRight, Trash2 } from 'lucide-react'
import { PROPERTY_TYPE_LABELS, type PropertyType } from '@/types/database'
import { useUniversalSearch } from '@/hooks/use-universal-search'
import { SearchInput, Highlight, NoResults } from '@/components/ui/search-input'
import { deleteProperty } from './actions'
import { ConfirmModal } from '@/components/ui/confirm-modal'

export interface PropertyRow {
  id: string
  address_line1: string
  address_line2: string | null
  city: string
  postcode: string
  type: PropertyType
  notes: string | null
  customer_id: string
  customer?: { id: string; name: string; type?: string; phone?: string | null; email?: string | null } | null
  jobs?: { count: number }[]
  certificates?: { count: number }[]
}

const TYPE_FILTERS: { id: string; label: string }[] = [
  { id: 'all', label: 'All Properties' },
  { id: 'residential', label: 'Residential' },
  { id: 'commercial', label: 'Commercial' },
  { id: 'hmo', label: 'HMO' },
  { id: 'other', label: 'Other' },
]

export function PropertiesClient({ properties }: { properties: PropertyRow[] }) {
  const router = useRouter()
  const [activeType, setActiveType] = useState('all')
  const [deleteTarget, setDeleteTarget] = useState<PropertyRow | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const handleDeleteProperty = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      const res = await deleteProperty(deleteTarget.id)
      if (res?.error) {
        alert(res.error)
      } else {
        setDeleteTarget(null)
        router.refresh()
      }
    } catch {
      alert('Failed to delete property')
    } finally {
      setDeleteLoading(false)
    }
  }

  const filterPredicate = useCallback(
    (p: PropertyRow) => {
      if (activeType === 'all') return true
      return p.type === activeType
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
  } = useUniversalSearch<PropertyRow>({
    items: properties,
    fields: [
      { accessor: p => p.address_line1 || '', weight: 2.5 },
      { accessor: p => p.postcode || '', weight: 2.2 },
      { accessor: p => p.city || '', weight: 1.5 },
      { accessor: p => p.customer?.name || '', weight: 2.0 },
      { accessor: p => p.address_line2 || '', weight: 1.0 },
      { accessor: p => p.notes || '', weight: 0.8 },
      { accessor: p => (p.type ? PROPERTY_TYPE_LABELS[p.type] || p.type : ''), weight: 1.0 },
      { accessor: p => p.id || '', weight: 0.8 },
    ],
    debounceMs: 200,
    filterPredicate,
  })

  const filtered = results.map(r => r.item)

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Properties</h1>
          <p className="page-subtitle">
            {filtered.length} {filtered.length === 1 ? 'property' : 'properties'} serviced
          </p>
        </div>
      </div>

      {/* Universal Search Box */}
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Search postcode, street, city, customer name…"
        isSearching={isSearching}
        resultCount={resultCount}
        hasQuery={hasQuery}
        style={{ marginBottom: '12px' }}
      />

      {/* Filter Tabs */}
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
              ? properties.length
              : properties.filter(p => p.type === tab.id).length

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

      {/* Desktop Table View */}
      <div className="desktop-only table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Address / Postcode</th>
              <th>Customer</th>
              <th>Type</th>
              <th>Jobs</th>
              <th>Certificates</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {noResults ? (
              <tr>
                <td colSpan={6}>
                  <NoResults query={query} entityName="properties" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--color-fog)' }}>
                  No properties found matching your criteria
                </td>
              </tr>
            ) : (
              filtered.map(prop => (
                <tr key={prop.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <MapPin size={15} style={{ color: 'var(--color-acid-lime)', marginTop: '2px', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--color-paper)' }}>
                          <Highlight text={prop.address_line1} query={query} />
                        </div>
                        {prop.address_line2 && (
                          <div style={{ fontSize: '12px', color: 'var(--color-fog)' }}>
                            <Highlight text={prop.address_line2} query={query} />
                          </div>
                        )}
                        <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--color-fog)', marginTop: '2px' }}>
                          <strong><Highlight text={prop.postcode} query={query} /></strong>, <Highlight text={prop.city} query={query} />
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {prop.customer ? (
                      <Link
                        href={`/admin/customers/${prop.customer.id}`}
                        style={{ color: 'var(--color-mist)', textDecoration: 'none', fontWeight: 500 }}
                      >
                        <Highlight text={prop.customer.name} query={query} />
                      </Link>
                    ) : (
                      <span style={{ color: 'var(--color-fog)' }}>Unassigned</span>
                    )}
                  </td>
                  <td>
                    <span className="badge badge-default">
                      {PROPERTY_TYPE_LABELS[prop.type as PropertyType] ?? prop.type}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Briefcase size={13} style={{ color: 'var(--color-fog)' }} />
                      <span>{prop.jobs?.[0]?.count ?? 0}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileText size={13} style={{ color: 'var(--color-fog)' }} />
                      <span>{prop.certificates?.[0]?.count ?? 0}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <Link
                        href={`/admin/jobs/new?property_id=${prop.id}&customer_id=${prop.customer_id}`}
                        className="btn btn-secondary btn-sm"
                      >
                        Book Job
                      </Link>
                      <Link
                        href={`/admin/properties/${prop.id}`}
                        className="btn btn-ghost btn-sm"
                      >
                        View <ChevronRight size={12} />
                      </Link>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(prop)}
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--color-coral-red)', padding: '6px' }}
                        title="Delete property"
                        aria-label={`Delete ${prop.address_line1}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="mobile-only-flex" style={{ flexDirection: 'column', gap: '10px' }}>
        {noResults ? (
          <NoResults query={query} entityName="properties" />
        ) : filtered.length === 0 ? (
          <div style={{ padding: '36px 16px', textAlign: 'center', background: 'var(--surface-card)', borderRadius: '14px', color: 'var(--color-fog)', fontSize: '13px' }}>
            No properties found
          </div>
        ) : (
          filtered.map(prop => (
            <Link
              key={prop.id}
              href={`/admin/properties/${prop.id}`}
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-paper)' }}>
                  <Highlight text={prop.address_line1} query={query} />
                </span>
                <span className="badge badge-default">
                  {PROPERTY_TYPE_LABELS[prop.type as PropertyType] ?? prop.type}
                </span>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--color-mist)' }}>
                <strong><Highlight text={prop.postcode} query={query} /></strong>, <Highlight text={prop.city} query={query} />
                {prop.customer && (
                  <span style={{ color: 'var(--color-fog)', marginLeft: '6px' }}>
                    · <Highlight text={prop.customer.name} query={query} />
                  </span>
                )}
              </div>

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
                <span>{prop.jobs?.[0]?.count ?? 0} jobs</span>
                <span
                  onClick={e => {
                    e.preventDefault()
                    e.stopPropagation()
                    window.open(
                      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${prop.address_line1}, ${prop.postcode}`)}`,
                      '_blank',
                    )
                  }}
                  style={{ color: 'var(--color-acid-lime)', fontWeight: 600 }}
                >
                  Google Maps ↗
                </span>
              </div>
            </Link>
          ))
        )}
      </div>

      {deleteTarget && (
        <ConfirmModal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteProperty}
          title="Delete Property"
          message={`Are you sure you want to delete ${deleteTarget.address_line1}? This will remove the property and its associated service records.`}
          confirmText="Confirm Delete"
          loading={deleteLoading}
        />
      )}
    </div>
  )
}
