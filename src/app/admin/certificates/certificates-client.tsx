'use client'

import { useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { Plus, ShieldCheck, ShieldAlert, FileText, ChevronRight } from 'lucide-react'
import { format, parseISO, differenceInDays } from 'date-fns'
import { useUniversalSearch } from '@/hooks/use-universal-search'
import { SearchInput, Highlight, NoResults } from '@/components/ui/search-input'

export interface CertificateRow {
  id: string
  certificate_number: string
  landlord_name: string | null
  status: string
  safety_result: string | null
  issued_at: string | null
  expires_at: string | null
  operative_name?: string | null
  customer?: { id: string; name: string; phone?: string | null } | null
  property?: { id: string; address_line1: string; postcode: string; city: string } | null
  engineer?: { id: string; profile?: { full_name: string } | null } | null
}

const FILTER_TABS = [
  { id: 'all', label: 'All Certificates' },
  { id: 'expiring', label: 'Expiring Soon (60d)' },
  { id: 'expired', label: 'Expired' },
  { id: 'pass', label: 'Pass' },
  { id: 'fail', label: 'Defects / Fail' },
]

export function CertificatesClient({ certificates }: { certificates: CertificateRow[] }) {
  const [activeFilter, setActiveFilter] = useState('all')
  const now = useMemo(() => new Date(), [])

  const filterPredicate = useCallback(
    (cert: CertificateRow) => {
      const expiresAt = cert.expires_at ? parseISO(cert.expires_at) : null
      const daysUntil = expiresAt ? differenceInDays(expiresAt, now) : null
      const isExpired = expiresAt ? expiresAt < now : false
      const isExpiringSoon = daysUntil !== null && daysUntil <= 60 && daysUntil >= 0
      const isFail = ['fail', 'at_risk', 'immediately_dangerous'].includes(cert.safety_result || '')

      if (activeFilter === 'expiring') return isExpiringSoon
      if (activeFilter === 'expired') return isExpired
      if (activeFilter === 'pass') return cert.safety_result === 'pass'
      if (activeFilter === 'fail') return isFail
      return true
    },
    [activeFilter, now],
  )

  const {
    query,
    setQuery,
    results,
    isSearching,
    hasQuery,
    noResults,
    resultCount,
  } = useUniversalSearch<CertificateRow>({
    items: certificates,
    fields: [
      { accessor: c => c.certificate_number || '', weight: 2.5 },
      { accessor: c => c.landlord_name || '', weight: 2.0 },
      { accessor: c => c.customer?.name || '', weight: 1.8 },
      { accessor: c => c.property?.address_line1 || '', weight: 1.6 },
      { accessor: c => c.property?.postcode || '', weight: 1.8 },
      { accessor: c => c.property?.city || '', weight: 1.0 },
      { accessor: c => c.engineer?.profile?.full_name || c.operative_name || '', weight: 1.2 },
      { accessor: c => c.id || '', weight: 0.8 },
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
          <h1 className="page-title">Gas Safety Certificates (CP12)</h1>
          <p className="page-subtitle">
            {filtered.length} {filtered.length === 1 ? 'record' : 'records'} found
          </p>
        </div>
        <Link href="/admin/jobs/new?job_type=gas_safety_check" className="btn btn-primary">
          <Plus size={14} /> New CP12
        </Link>
      </div>

      {/* Universal Search Input */}
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Search CP12 number, customer, landlord, address, postcode…"
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
        {FILTER_TABS.map(tab => {
          const active = activeFilter === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id)}
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
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Desktop Table View */}
      <div className="desktop-only table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Certificate #</th>
              <th>Property & Postcode</th>
              <th>Landlord / Customer</th>
              <th>Safety Result</th>
              <th>Status</th>
              <th>Expiry</th>
              <th>Engineer</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {noResults ? (
              <tr>
                <td colSpan={8}>
                  <NoResults query={query} entityName="certificates" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--color-fog)' }}>
                  No gas safety certificates found
                </td>
              </tr>
            ) : (
              filtered.map(cert => {
                const expiresAt = cert.expires_at ? parseISO(cert.expires_at) : null
                const daysUntil = expiresAt ? differenceInDays(expiresAt, now) : null
                const isExpiringSoon = daysUntil !== null && daysUntil <= 60 && daysUntil >= 0
                const isExpired = expiresAt && expiresAt < now
                const result = cert.safety_result || 'pass'

                return (
                  <tr key={cert.id}>
                    <td>
                      <Link
                        href={`/admin/certificates/${cert.id}`}
                        style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-paper)', textDecoration: 'none' }}
                      >
                        <Highlight text={cert.certificate_number} query={query} />
                      </Link>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--color-paper)' }}>
                        <Highlight text={cert.property?.address_line1 || 'Property'} query={query} />
                      </div>
                      <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--color-fog)', marginTop: '2px' }}>
                        <Highlight text={cert.property?.postcode || ''} query={query} />
                      </div>
                    </td>
                    <td>
                      <div style={{ color: 'var(--color-mist)' }}>
                        <Highlight text={cert.landlord_name || cert.customer?.name || '—'} query={query} />
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${result}`}>
                        {result === 'pass' ? 'Pass' : result === 'fail' ? 'Fail' : result.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${cert.status}`}>
                        {cert.status.charAt(0).toUpperCase() + cert.status.slice(1)}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px' }}>
                      {expiresAt ? (
                        <span style={{
                          color: isExpired ? '#f87171' : isExpiringSoon ? '#fbbf24' : 'var(--color-fog)',
                          fontWeight: isExpiringSoon || isExpired ? 600 : 400,
                        }}>
                          {format(expiresAt, 'dd MMM yyyy')}
                          {isExpiringSoon && ` (${daysUntil}d)`}
                          {isExpired && ' (EXPIRED)'}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--color-mist)' }}>
                      <Highlight text={cert.engineer?.profile?.full_name || cert.operative_name || '—'} query={query} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link href={`/admin/certificates/${cert.id}`} className="btn btn-ghost btn-sm">
                        View <ChevronRight size={12} />
                      </Link>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="mobile-only-flex" style={{ flexDirection: 'column', gap: '10px' }}>
        {noResults ? (
          <NoResults query={query} entityName="certificates" />
        ) : filtered.length === 0 ? (
          <div style={{ padding: '36px 16px', textAlign: 'center', background: 'var(--surface-card)', borderRadius: '14px', color: 'var(--color-fog)', fontSize: '13px' }}>
            No gas safety certificates found
          </div>
        ) : (
          filtered.map(cert => {
            const expiresAt = cert.expires_at ? parseISO(cert.expires_at) : null
            const daysUntil = expiresAt ? differenceInDays(expiresAt, now) : null
            const isExpiringSoon = daysUntil !== null && daysUntil <= 60 && daysUntil >= 0
            const isExpired = expiresAt && expiresAt < now
            const result = cert.safety_result || 'pass'

            return (
              <Link
                key={cert.id}
                href={`/admin/certificates/${cert.id}`}
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
                  <span style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-paper)' }}>
                    <Highlight text={cert.certificate_number} query={query} />
                  </span>
                  <span className={`badge badge-${result}`}>
                    {result === 'pass' ? 'Pass' : result === 'fail' ? 'Fail' : result.replace(/_/g, ' ')}
                  </span>
                </div>

                <div style={{ fontSize: '13px', color: 'var(--color-mist)', lineHeight: 1.3 }}>
                  <div><Highlight text={cert.property?.address_line1 || 'Property'} query={query} /></div>
                  <div style={{ fontSize: '11px', color: 'var(--color-fog)', marginTop: '2px' }}>
                    <Highlight text={cert.property?.postcode || ''} query={query} /> · <Highlight text={cert.landlord_name || cert.customer?.name || ''} query={query} />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-fog)', paddingTop: '6px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <span>
                    Expiry: {expiresAt ? format(expiresAt, 'dd/MM/yyyy') : '—'}
                    {isExpiringSoon && <span style={{ color: '#fbbf24', marginLeft: '4px' }}>({daysUntil}d)</span>}
                    {isExpired && <span style={{ color: '#f87171', marginLeft: '4px' }}>EXPIRED</span>}
                  </span>
                  <span><Highlight text={cert.engineer?.profile?.full_name || cert.operative_name || ''} query={query} /></span>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
