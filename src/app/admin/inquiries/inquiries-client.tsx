'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import {
  MessageSquare,
  Search,
  Filter,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Eye,
  Check,
  X,
  Trash2,
} from 'lucide-react'
import { updateInquiryStatus, deleteInquiry } from './actions'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { useUniversalSearch } from '@/hooks/use-universal-search'
import { SearchInput, Highlight, NoResults } from '@/components/ui/search-input'

interface Inquiry {
  id: string
  name: string
  phone: string | null
  email: string | null
  service_type: string | null
  description: string | null
  address: string | null
  postcode: string | null
  preferred_date: string | null
  status: string
  created_at: string
}

const SERVICE_LABELS: Record<string, string> = {
  boiler_repair: 'Boiler Repair',
  boiler_installation: 'Boiler Installation',
  gas_safety_check: 'Gas Safety (CP12)',
  annual_service: 'Annual Service',
  central_heating: 'Central Heating',
  plumbing: 'Plumbing',
  emergency_callout: 'Emergency Callout',
  other: 'Other Inquiry'
}

export function InquiriesClient({ inquiries }: { inquiries: Inquiry[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'new' | 'in_review' | 'converted' | 'rejected'>('all')
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [inquiryToDelete, setInquiryToDelete] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  async function handleDeleteInquiry() {
    if (!inquiryToDelete) return
    setDeleteLoading(true)
    await deleteInquiry(inquiryToDelete)
    setDeleteLoading(false)
    if (selectedInquiry?.id === inquiryToDelete) {
      setSelectedInquiry(null)
    }
    setInquiryToDelete(null)
    router.refresh()
  }

  const filterPredicate = useCallback(
    (item: Inquiry) => {
      if (filter !== 'all' && item.status !== filter) return false
      return true
    },
    [filter],
  )

  const {
    query,
    setQuery,
    results,
    isSearching,
    hasQuery,
    noResults,
    resultCount,
  } = useUniversalSearch<Inquiry>({
    items: inquiries,
    fields: [
      { accessor: i => i.name || '', weight: 2.5 },
      { accessor: i => i.phone || '', weight: 2.0 },
      { accessor: i => i.email || '', weight: 1.8 },
      { accessor: i => i.postcode || '', weight: 2.0 },
      { accessor: i => i.address || '', weight: 1.5 },
      { accessor: i => i.description || '', weight: 1.0 },
      { accessor: i => (i.service_type ? SERVICE_LABELS[i.service_type] || i.service_type : ''), weight: 1.2 },
    ],
    debounceMs: 200,
    filterPredicate,
  })

  const filtered = results.map(r => r.item)

  const handleStatus = async (id: string, newStatus: 'in_review' | 'rejected' | 'converted') => {
    setLoadingId(id)
    await updateInquiryStatus(id, newStatus)
    setLoadingId(null)
    if (selectedInquiry?.id === id) {
      setSelectedInquiry(prev => prev ? { ...prev, status: newStatus } : null)
    }
    router.refresh()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <span className="badge badge-scheduled">New</span>
      case 'in_review':
        return <span className="badge badge-in_progress">In Review</span>
      case 'converted':
        return <span className="badge badge-completed">Converted</span>
      case 'rejected':
        return <span className="badge badge-cancelled">Rejected</span>
      default:
        return <span className="badge">{status.replace(/_/g, ' ')}</span>
    }
  }

  return (
    <div>
      {/* Universal Search Box */}
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Search inquiries by customer name, postcode, phone, service type…"
        isSearching={isSearching}
        resultCount={resultCount}
        hasQuery={hasQuery}
        style={{ marginBottom: '12px' }}
      />

      {/* Filter Chips */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '12px',
          marginBottom: '12px',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {(['all', 'new', 'in_review', 'converted', 'rejected'] as const).map(f => {
          const active = filter === f
          return (
            <button
              key={f}
              type="button"
              className={`btn ${active ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '99px', whiteSpace: 'nowrap' }}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All Inquiries' : f.replace('_', ' ').toUpperCase()}
            </button>
          )
        })}
      </div>

      {/* Desktop Inquiries Table */}
      <div className="desktop-only table-wrapper">
        <table className="table">
            <thead>
              <tr>
                <th>Date Received</th>
                <th>Client / Contact</th>
                <th>Service Requested</th>
                <th>Location</th>
                <th>Preferred Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {noResults ? (
                <tr>
                  <td colSpan={7}>
                    <NoResults query={query} entityName="inquiries" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--color-fog)' }}>
                    No inquiries found matching your filters.
                  </td>
                </tr>
              ) : (
                filtered.map(inq => (
                  <tr key={inq.id}>
                    <td style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--color-fog)' }}>
                      {inq.created_at ? format(parseISO(inq.created_at), 'dd MMM yyyy HH:mm') : 'Recent'}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--color-paper)' }}>
                        <Highlight text={inq.name} query={query} />
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-mist)', display: 'flex', gap: '8px' }}>
                        {inq.phone && <span><Highlight text={inq.phone} query={query} /></span>}
                        {inq.email && <span><Highlight text={inq.email} query={query} /></span>}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--color-paper)' }}>
                        <Highlight text={SERVICE_LABELS[inq.service_type || ''] || inq.service_type || 'General Service'} query={query} />
                      </div>
                      {inq.description && (
                        <div style={{ fontSize: '12px', color: 'var(--color-fog)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <Highlight text={inq.description} query={query} />
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ color: 'var(--color-fey-white)' }}>
                        <Highlight text={inq.address || '—'} query={query} />
                      </div>
                      <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--color-fey-graphite)', marginTop: '2px' }}>
                        <Highlight text={inq.postcode || '—'} query={query} />
                      </div>
                    </td>
                    <td style={{ fontSize: '12px' }}>
                      {inq.preferred_date ? inq.preferred_date : 'Flexible'}
                    </td>
                    <td>
                      {getStatusBadge(inq.status)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedInquiry(inq)}
                        >
                          <Eye size={13} style={{ marginRight: '4px' }} /> View
                        </button>

                        {inq.status === 'new' && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled={loadingId === inq.id}
                            onClick={() => handleStatus(inq.id, 'in_review')}
                          >
                            Review
                          </button>
                        )}

                        {inq.status !== 'converted' && inq.status !== 'rejected' && (
                          <Link
                            href={`/admin/jobs/new?customer_name=${encodeURIComponent(inq.name)}&description=${encodeURIComponent(inq.description || '')}&phone=${encodeURIComponent(inq.phone || '')}&postcode=${encodeURIComponent(inq.postcode || '')}&job_type=${encodeURIComponent(inq.service_type || 'boiler_repair')}`}
                            className="btn btn-primary btn-sm"
                            onClick={() => handleStatus(inq.id, 'converted')}
                          >
                            Convert
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      {/* Mobile Card List (Minimal, Native Phone App View) */}
      <div className="mobile-only-flex" style={{ flexDirection: 'column', gap: '10px' }}>
        {noResults ? (
          <NoResults query={query} entityName="inquiries" />
        ) : filtered.length === 0 ? (
          <div style={{ padding: '36px 16px', textAlign: 'center', background: 'var(--surface-card)', borderRadius: '14px', color: 'var(--color-fog)', fontSize: '13px' }}>
            No inquiries found
          </div>
        ) : (
          filtered.map(inq => (
            <div
              key={inq.id}
              onClick={() => setSelectedInquiry(inq)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '14px 16px',
                borderRadius: '14px',
                background: 'var(--surface-card)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-paper)' }}>
                  <Highlight text={inq.name} query={query} />
                </span>
                {getStatusBadge(inq.status)}
              </div>

              <div style={{ fontSize: '13px', color: 'var(--color-mist)' }}>
                <Highlight text={SERVICE_LABELS[inq.service_type || ''] || inq.service_type || 'General Service'} query={query} />
              </div>

              {inq.address && (
                <div style={{ fontSize: '11px', color: 'var(--color-fog)' }}>
                  <Highlight text={inq.address} query={query} /> · <strong><Highlight text={inq.postcode || ''} query={query} /></strong>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-fog)', paddingTop: '6px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <span>{inq.created_at ? format(parseISO(inq.created_at), 'dd MMM HH:mm') : 'Recent'}</span>
                <span>{inq.phone || inq.email || ''}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Inquiry Detail Modal */}
      {selectedInquiry && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={() => setSelectedInquiry(null)}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '560px',
              background: 'var(--color-lead)',
              borderRadius: 'var(--radius-xl)',
              padding: '24px',
              boxShadow: 'var(--shadow-xl)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--color-paper)' }}>
                  Inquiry Details
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--color-fog)', marginTop: '4px' }}>
                  Received: {selectedInquiry.created_at ? format(parseISO(selectedInquiry.created_at), 'dd MMM yyyy HH:mm') : 'Recent'}
                </div>
              </div>
              <div>{getStatusBadge(selectedInquiry.status)}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
              <div>
                <span style={{ color: 'var(--color-fog)', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>Client Name</span>
                <strong style={{ color: 'var(--color-paper)', fontSize: '15px' }}>{selectedInquiry.name}</strong>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <span style={{ color: 'var(--color-fog)', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>Phone</span>
                  <a href={`tel:${selectedInquiry.phone}`} style={{ color: 'var(--color-brand)', textDecoration: 'none' }}>
                    {selectedInquiry.phone || 'Not provided'}
                  </a>
                </div>
                <div>
                  <span style={{ color: 'var(--color-fog)', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>Email</span>
                  <a href={`mailto:${selectedInquiry.email}`} style={{ color: 'var(--color-brand)', textDecoration: 'none' }}>
                    {selectedInquiry.email || 'Not provided'}
                  </a>
                </div>
              </div>

              <div>
                <span style={{ color: 'var(--color-fog)', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>Service Requested</span>
                <span style={{ color: 'var(--color-paper)', fontWeight: 600 }}>
                  {SERVICE_LABELS[selectedInquiry.service_type || ''] || selectedInquiry.service_type || 'General Service'}
                </span>
              </div>

              <div>
                <span style={{ color: 'var(--color-fog)', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>Property Address</span>
                <span style={{ color: 'var(--color-paper)' }}>
                  {selectedInquiry.address ? `${selectedInquiry.address}, ` : ''}{selectedInquiry.postcode}
                </span>
              </div>

              <div>
                <span style={{ color: 'var(--color-fog)', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>Issue Description</span>
                <div style={{ background: 'var(--color-charcoal)', padding: '12px', borderRadius: 'var(--radius-md)', color: 'var(--color-mist)', lineHeight: '1.5', marginTop: '4px' }}>
                  {selectedInquiry.description || 'No additional details provided.'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedInquiry(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ color: 'var(--color-crimson)', gap: '4px' }}
                  onClick={() => setInquiryToDelete(selectedInquiry.id)}
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                {selectedInquiry.status !== 'rejected' && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ color: 'var(--color-crimson)' }}
                    onClick={() => handleStatus(selectedInquiry.id, 'rejected')}
                  >
                    Reject
                  </button>
                )}

                <Link
                  href={`/admin/jobs/new?customer_name=${encodeURIComponent(selectedInquiry.name)}&description=${encodeURIComponent(selectedInquiry.description || '')}&phone=${encodeURIComponent(selectedInquiry.phone || '')}&postcode=${encodeURIComponent(selectedInquiry.postcode || '')}&job_type=${encodeURIComponent(selectedInquiry.service_type || 'boiler_repair')}`}
                  className="btn btn-primary"
                  onClick={() => handleStatus(selectedInquiry.id, 'converted')}
                >
                  Convert to Job <ArrowRight size={14} style={{ marginLeft: '4px' }} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!inquiryToDelete}
        onClose={() => setInquiryToDelete(null)}
        onConfirm={handleDeleteInquiry}
        title="Delete Inquiry"
        message="Are you sure you want to permanently delete this customer inquiry? This action cannot be undone."
        confirmText="Confirm Delete"
        loading={deleteLoading}
      />
    </div>
  )
}
