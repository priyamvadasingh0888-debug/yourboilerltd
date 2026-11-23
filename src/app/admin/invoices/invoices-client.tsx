'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import {
  Receipt,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Trash2,
  Send,
  Check,
  X,
  ChevronRight,
} from 'lucide-react'
import { updateInvoiceStatus, deleteInvoice } from './actions'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import type { InvoiceStatus } from '@/types/database'
import { useUniversalSearch } from '@/hooks/use-universal-search'
import { SearchInput, Highlight, NoResults } from '@/components/ui/search-input'

interface Invoice {
  id: string
  invoice_number: string
  job_id: string | null
  customer_id: string
  status: string
  issue_date: string | null
  due_date: string | null
  paid_at: string | null
  subtotal: number
  vat_amount: number
  total: number
  customer?: { name: string }
}

export function InvoicesClient({ invoices }: { invoices: Invoice[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'draft' | 'sent' | 'paid' | 'overdue'>('all')
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const filterPredicate = useCallback(
    (inv: Invoice) => {
      if (filter !== 'all' && inv.status !== filter) return false
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
  } = useUniversalSearch<Invoice>({
    items: invoices,
    fields: [
      { accessor: inv => inv.invoice_number || '', weight: 2.5 },
      { accessor: inv => inv.customer?.name || '', weight: 2.0 },
      { accessor: inv => inv.status || '', weight: 1.0 },
      { accessor: inv => String(inv.total || ''), weight: 1.2 },
    ],
    debounceMs: 200,
    filterPredicate,
  })

  const filtered = results.map(r => r.item)

  const formatGBP = (amount: number) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="badge badge-paid">Paid</span>
      case 'sent':
        return <span className="badge badge-sent">Sent</span>
      case 'overdue':
        return <span className="badge badge-overdue">Overdue</span>
      case 'cancelled':
        return <span className="badge badge-cancelled">Cancelled</span>
      default:
        return <span className="badge badge-draft">Draft</span>
    }
  }

  async function handleStatusChange(invoiceId: string, newStatus: InvoiceStatus) {
    setError('')
    setActionLoading(true)
    const result = await updateInvoiceStatus(invoiceId, newStatus)
    setActionLoading(false)

    if (result.error) {
      setError(result.error)
    } else {
      setSelectedInvoice(null)
      router.refresh()
    }
  }

  async function handleDeleteInvoice() {
    if (!selectedInvoice) return
    setError('')
    setActionLoading(true)
    const result = await deleteInvoice(selectedInvoice.id)
    setActionLoading(false)

    if (result.error) {
      setShowDeleteModal(false)
      setError(result.error)
    } else {
      setShowDeleteModal(false)
      setSelectedInvoice(null)
      router.refresh()
    }
  }

  return (
    <div>
      {/* Universal Search Input */}
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Search by invoice number, customer name, total amount…"
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
        {(['all', 'draft', 'sent', 'paid', 'overdue'] as const).map(f => {
          const active = filter === f
          return (
            <button
              key={f}
              type="button"
              className={`btn ${active ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                fontSize: '12px',
                padding: '6px 14px',
                borderRadius: '99px',
                whiteSpace: 'nowrap',
              }}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All Invoices' : f.toUpperCase()}
            </button>
          )
        })}
      </div>

      {error && (
        <div
          style={{
            padding: '12px 16px',
            background: '#18191c',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderLeft: '3px solid #ef4444',
            borderRadius: 'var(--radius-md)',
            color: '#fca5a5',
            fontSize: '13px',
            marginBottom: '16px',
          }}
        >
          {error}
        </div>
      )}

      {/* Desktop Table View */}
      <div className="desktop-only table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Client / Account</th>
              <th>Issue Date</th>
              <th>Due Date</th>
              <th>Subtotal</th>
              <th>Total (inc. VAT)</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {noResults ? (
              <tr>
                <td colSpan={8}>
                  <NoResults query={query} entityName="invoices" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--color-fog)' }}>
                  No invoices found matching your filters.
                </td>
              </tr>
            ) : (
              filtered.map(inv => (
                <tr key={inv.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-paper)' }}>
                    <Highlight text={inv.invoice_number} query={query} />
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--color-paper)' }}>
                      <Highlight text={inv.customer?.name || 'Customer'} query={query} />
                    </div>
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--color-fog)' }}>
                    {inv.issue_date ? format(parseISO(inv.issue_date), 'dd MMM yyyy') : '—'}
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--color-fog)' }}>
                    {inv.due_date ? format(parseISO(inv.due_date), 'dd MMM yyyy') : '—'}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                    {formatGBP(inv.subtotal)}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-paper)' }}>
                    {formatGBP(inv.total)}
                  </td>
                  <td>
                    {getStatusBadge(inv.status)}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setSelectedInvoice(inv)}
                    >
                      <Eye size={13} style={{ marginRight: '4px' }} /> Manage
                    </button>
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
          <NoResults query={query} entityName="invoices" />
        ) : filtered.length === 0 ? (
          <div style={{ padding: '36px 16px', textAlign: 'center', background: 'var(--surface-card)', borderRadius: '14px', color: 'var(--color-fog)', fontSize: '13px' }}>
            No invoices found
          </div>
        ) : (
          filtered.map(inv => (
            <div
              key={inv.id}
              onClick={() => setSelectedInvoice(inv)}
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
                <span style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-paper)' }}>
                  <Highlight text={inv.invoice_number} query={query} />
                </span>
                {getStatusBadge(inv.status)}
              </div>

              <div style={{ fontSize: '13px', color: 'var(--color-mist)' }}>
                <Highlight text={inv.customer?.name || 'Customer'} query={query} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-fog)', paddingTop: '6px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <span>Due: {inv.due_date ? format(parseISO(inv.due_date), 'dd/MM/yyyy') : '—'}</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-acid-lime)', fontFamily: 'var(--font-mono)' }}>
                  {formatGBP(inv.total)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Invoice Detail & Management Modal */}
      {selectedInvoice && (
        <div
          className="modal-backdrop"
          onClick={() => setSelectedInvoice(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="modal-container"
            style={{ maxWidth: '500px' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--color-paper)', fontFamily: 'var(--font-mono)' }}>
                  {selectedInvoice.invoice_number}
                </h3>
                <div style={{ fontSize: '13px', color: 'var(--color-fog)', marginTop: '2px' }}>
                  Client: <strong>{selectedInvoice.customer?.name ?? 'Assigned Customer'}</strong>
                </div>
              </div>
              <div>{getStatusBadge(selectedInvoice.status)}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--color-fog)' }}>Subtotal</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-paper)' }}>{formatGBP(selectedInvoice.subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--color-fog)' }}>VAT (20%)</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-paper)' }}>{formatGBP(selectedInvoice.vat_amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 700, borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                <span style={{ color: 'var(--color-paper)' }}>Total Amount</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-acid-lime)' }}>{formatGBP(selectedInvoice.total)}</span>
              </div>
            </div>

            {/* Actions for Status */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {selectedInvoice.status === 'draft' && (
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center', gap: '6px' }}
                  onClick={() => handleStatusChange(selectedInvoice.id, 'sent')}
                  disabled={actionLoading}
                >
                  <Send size={14} /> Send to Customer (Mark as Sent)
                </button>
              )}

              {selectedInvoice.status !== 'paid' && selectedInvoice.status !== 'cancelled' && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ width: '100%', justifyContent: 'center', gap: '6px', color: 'var(--color-pulse-green)' }}
                  onClick={() => handleStatusChange(selectedInvoice.id, 'paid')}
                  disabled={actionLoading}
                >
                  <Check size={14} /> Record Payment Received (Mark as Paid)
                </button>
              )}

              {selectedInvoice.status !== 'cancelled' && selectedInvoice.status !== 'paid' && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => handleStatusChange(selectedInvoice.id, 'cancelled')}
                  disabled={actionLoading}
                >
                  Cancel Invoice
                </button>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
              {selectedInvoice.status !== 'paid' ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--color-coral-red)', gap: '4px' }}
                  onClick={() => setShowDeleteModal(true)}
                  disabled={actionLoading}
                >
                  <Trash2 size={13} /> Delete Invoice
                </button>
              ) : (
                <span style={{ fontSize: '11px', color: 'var(--color-ash)' }}>Immutable (Paid)</span>
              )}

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedInvoice(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteInvoice}
        title="Delete Invoice"
        message={`Are you sure you want to delete invoice ${selectedInvoice?.invoice_number}? This action cannot be undone.`}
        confirmText="Confirm Delete"
        loading={actionLoading}
      />
    </div>
  )
}
